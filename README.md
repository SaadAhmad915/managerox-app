# ManagerOX CRM

The CRM application, intended for **app.managerox.com**. Next.js (App Router) +
Tailwind CSS v4, sharing a brand palette with the marketing site
([managerox-web](https://github.com/SaadAhmad915/managerox-web)).

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm start
npm run lint
```

Requires **Node >= 20.9** (Next 16's floor).

This project uses **npm**. It briefly used pnpm, but pnpm's Windows install path
runs into enough friction (PowerShell execution policy, corepack needing
Administrator to write into `C:\Program Files\nodejs`, and npm blocking pnpm's
own install scripts) that npm is the better default for a mixed-OS team. If you
switch back, delete `package-lock.json` in the same commit — never commit two
lockfiles, or local installs and CI can silently resolve different trees.

## Status

**Milestone 2 — wired to the API.** Sign-in, session handling and a live
dashboard fed by [managerox-api](https://github.com/SaadAhmad915/managerox-api).
The other eight sidebar destinations are real routes rendering a placeholder.

**The API must be running** (`php artisan serve` on port 8000) or sign-in fails.
Copy `.env.example` to `.env.local`; it sets `API_ORIGIN`.

### The API is proxied, not called directly

`next.config.ts` rewrites `/api/*` and `/sanctum/*` to the Laravel API, so the
browser only ever talks to this app's own origin.

That is not a convenience — it is what makes auth work. The session cookie is
same-site only, so if the browser called the API directly on an unrelated host
(`*.vercel.app` vs some API host) the cookie would never be sent and every
request would 401 with nothing obviously wrong. Proxying keeps the cookie
first-party and removes CORS from the picture entirely.

`API_ORIGIN` has no `NEXT_PUBLIC_` prefix on purpose: the browser never learns
the API's real address.

| Route | State |
| --- | --- |
| `/login` | Sign in — the only route reachable signed out |
| `/` | Dashboard — live data from `GET /api/dashboard` |
| `/leads` | Table with search, stage filter, pagination, create / edit / delete |
| `/contacts` `/deals` `/tasks` | Placeholder |
| `/calendar` `/reports` `/automation` `/settings` | Placeholder |
| `/more` | Placeholder — phone tab bar overflow |

Leads is the reference implementation for a resource screen — list, filter,
paginate, and the three write operations against the API. Other modules should
follow its shape.

## Layout

| Path | What's in it |
| --- | --- |
| `app/layout.tsx` | Shell — sidebar, topbar, phone tab bar |
| `app/page.tsx` | Dashboard |
| `app/components/` | One component per card, plus `Icon` and nav chrome |
| `app/lib/api.ts` | **The only place that talks to the backend** |
| `app/lib/types.ts` | Domain types |
| `app/lib/nav.ts` | Sidebar and tab-bar configuration |
| `app/globals.css` | Design tokens — brand palette and the pipeline ramp |

## Connecting the Laravel API

`app/lib/api.ts` is the single seam — the only file that knows a URL. Auth state
lives in `app/lib/auth.tsx`; the `(app)` route group's layout redirects anyone
without a session to `/login`.

Three things matter, and breaking any of them gives a silent 401 rather than an
obvious error:

- `app.` and `api.` are different origins but the **same site**, so a session
  cookie with `Domain=.managerox.com` and `SameSite=Lax` is sent on these
  requests. `SameSite=None` is not needed.
- Laravel needs CORS with an **explicit** origin (`https://app.managerox.com`,
  never `*`) and `supports_credentials => true`.
- Requests must send `credentials: "include"`.

## Chart colours are validated, not decorative

The pipeline ramp (`--color-stage-*` in `globals.css`) encodes an **ordinal**
sequence — stages are ordered positions, so they take one hue stepped by
lightness rather than a rainbow. The values pass a colour validator on monotone
lightness, adjacent step separation, light-end contrast, and hue spread.

The original mockup used five unrelated hues; two adjacent stages there sat at
ΔE 8.6 for normal vision (floor is 15), meaning *Negotiation* and *Closed* were
near-indistinguishable. **Re-run a validator before substituting colours here.**
