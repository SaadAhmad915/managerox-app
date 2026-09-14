# ManagerOX CRM

One Next.js app: the screens, the API and the database schema all live here.
Tailwind CSS v4, sharing a brand palette with the marketing site
([managerox-web](https://github.com/SaadAhmad915/managerox-web)).

```bash
npm install
npm run db:seed   # optional, but the app is dull empty
npm run dev       # http://localhost:3000
```

Sign in with **saad@managerox.com** / **password**.

Requires **Node >= 20.9** (Next 16's floor). Other scripts: `npm run build`,
`npm start`, `npm run lint`, `npm test`, `npm run db:generate`.

This project uses **npm**. It briefly used pnpm, but pnpm's Windows install path
runs into enough friction (PowerShell execution policy, corepack needing
Administrator to write into `C:\Program Files\nodejs`, and npm blocking pnpm's
own install scripts) that npm is the better default for a mixed-OS team. If you
switch back, delete `package-lock.json` in the same commit — never commit two
lockfiles, or local installs and CI can silently resolve different trees.

## No database to install

With no `DATABASE_URL` set, the app runs **PGlite**: real PostgreSQL 18 compiled
to WebAssembly, kept in a `.pglite` folder. Nothing to install, no container, no
account. Set `DATABASE_URL` and the identical schema and migrations run against a
hosted Postgres instead, which is what production uses — so there is no "works
locally, breaks deployed" gap between them.

Migrations apply themselves on the first connection. `npm run db:generate` turns
a change in `db/schema.ts` into SQL under `db/migrations`; commit that SQL.

**One process at a time.** PGlite is an embedded database meant to have a single
writer, so stop `npm run dev` before running `npm run db:seed`. Two processes on
one `.pglite` folder can leave it inconsistent.

## When something will not load

**Start here, with the dev server stopped:**

```bash
npm run doctor
```

It checks Node, dependencies, the port, how `localhost` resolves, and whether
the database opens and holds any accounts — then prints the command that fixes
whatever is wrong. No browser involved, which matters when the browser is the
thing misbehaving.

Three causes account for almost everything:

- **The port.** Next moves to **3001** without complaining when 3000 is taken,
  so you can sit looking at a stale server on 3000 serving an older build. Open
  the URL Next actually printed.
- **The host you open it as.** Next's dev server serves its client bundle only
  to origins it has been told to trust. Open the app as anything else — the LAN
  address it prints under "Network", a machine name — and React never hydrates:
  no effect runs, the redirect to `/login` never happens, and the page sits on
  its loading spinner for ever, with nothing in the console but a socket error.
  `localhost` and `127.0.0.1` are both allowed; for any other host set
  `DEV_ORIGIN` in `.env.local`. Note that `allowedDevOrigins` only matches
  **exact** hosts — CIDR ranges and wildcards like `192.168.*.*` are silently
  ignored, which is why they are not used here.
- **The database.** The dev server prints "Ready" before it has touched it — the
  connection opens on the *first request* — so a database that never opens looks
  like a healthy server and a page that spins.

If the page still only spins, `npm run dev:webpack` runs the dev server on
webpack instead of Turbopack, which rules out the bundler.

Two things tell you what the database is doing:

- The terminal logs `[db] opening …` and then either `[db] ready in <n>ms` or a
  failure with what to do about it. If you never see `[db] opening`, nothing has
  reached a route handler yet — check the port Next actually printed, since it
  quietly moves to 3001 when 3000 is taken.
- **`http://localhost:3000/api/health`** answers without signing in, because
  when things are broken you cannot sign in. It reports whether the database
  opened, how long it took, and how many accounts exist.

```jsonc
{ "database": "PGlite", "ok": true, "users": 3, "ms": 497, "hint": "Ready. Sign in at /login" }
{ "database": "PGlite", "ok": false, "ms": 45001, "error": "The database did not open within 45s. …" }
```

`users: 0` means the database is fine but empty — stop the dev server and run
`npm run db:seed`. Opening gives up after 45 seconds rather than hanging forever
(`DB_TIMEOUT_MS` to change it). In development the real error is sent to the
browser too; in production it stays generic.

A project folder synced by OneDrive or Dropbox can interfere with the `.pglite`
files. If that is where the project lives, set `PGLITE_PATH` to an unsynced
local path.

## Status

Sign-in, sessions, dashboard, and full CRUD for leads, contacts, deals and tasks.
Four sidebar destinations are real routes rendering a placeholder.

| Route | State |
| --- | --- |
| `/login` | Sign in — the only route reachable signed out |
| `/` | Dashboard — stats, funnel, revenue, tasks, recent leads, team |
| `/leads` | Enquiries — search, status filter, CRUD, **convert** |
| `/contacts` | People — search, CRUD, open deals and won value per person |
| `/deals` | Pipeline — stage filter, lost handling, CRUD, value summary |
| `/tasks` | Follow-ups — open/today/overdue/done, complete inline, CRUD |
| `/calendar` `/reports` `/automation` `/settings` | Placeholder |
| `/more` | Placeholder — phone tab bar overflow |

## The data model

```
Lead ──convert──► Contact ──has many──► Deal
(enquiry)         (person)              (opportunity: stage + value)
```

A lead is an enquiry with a status and nothing else — **no stage, no value**.
Those belong to the deal, because a person outlives any single opportunity and
may hold several. Converting a lead creates the person and their first deal in
one transaction, **once**; a second attempt is refused rather than quietly
duplicating both.

## How a request flows

```
app/(app)/leads/page.tsx     screen
  └─ app/lib/api.ts          the only file that talks to the API
      └─ app/api/leads/…     route handler: auth, validation, query
          └─ db/schema.ts    Drizzle schema → Postgres
```

Every request is **same-origin**, so the session cookie is first-party. That
removes the whole class of silent 401s you get when a cookie is quietly not sent
to a different site — which is what the previous split-host setup kept hitting.

Sessions are rows in the database, not signed tokens, so signing out revokes
access immediately rather than leaving a token valid until it expires.

Passwords use Node's built-in `scrypt`. That is deliberate: bcrypt and argon2
compile native code, which is the most common reason `npm install` fails on a
Windows machine without build tools.

## Layout

| Path | What's in it |
| --- | --- |
| `db/schema.ts` | Tables, relations and the stage/status vocabularies |
| `db/index.ts` | Driver selection (PGlite or hosted Postgres) + migrations |
| `db/seed.ts` | Demo data — six months of revenue, a funnel that narrows |
| `app/api/` | Route handlers, one folder per resource |
| `app/lib/api.ts` | **The only place the browser talks to the backend** |
| `app/lib/present.ts` | Rows → the JSON the screens read |
| `app/lib/convert.ts` | Lead → Contact + Deal, in one transaction |
| `app/lib/deal-stage.ts` | Keeps `closedAt`/`lostAt` honest against the stage |
| `app/components/` | One component per card, plus `Icon` and nav chrome |
| `app/globals.css` | Design tokens — brand palette and the pipeline ramp |

`useResourceList` holds the list behaviour every screen needs (debounced search,
paging, refetch after writes, derived loading) and `ResourceShell` the shared
chrome, so a new module is mostly its table and its dialog.

## Deploying

Vercel, plus any hosted Postgres (Neon, Supabase, Vercel Postgres). Set
`DATABASE_URL` and that is the whole configuration — migrations run on the first
request. Seed a production database by pointing `DATABASE_URL` at it locally and
running `npm run db:seed`, but note it **clears the CRM tables first**.

## Two things that are deliberate, not decorative

**Chart colours are validated.** The pipeline ramp (`--color-stage-*` in
`globals.css`) encodes an **ordinal** sequence — stages are ordered positions, so
they take one hue stepped by lightness rather than a rainbow. The values pass a
colour validator on monotone lightness, adjacent step separation, light-end
contrast, and hue spread. The original mockup used five unrelated hues; two
adjacent stages there sat at ΔE 8.6 for normal vision (floor is 15), meaning
*Negotiation* and *Closed* were near-indistinguishable. **Re-run a validator
before substituting colours here.**

**The funnel's Closed band counts this month only.** Every other band counts
deals sitting in that stage right now. Counting closed deals for all time would
compare a growing archive against a live pipeline: after a year the Closed band
dwarfs every other stage and the funnel is upside down permanently, which says
nothing about how business is actually flowing.
