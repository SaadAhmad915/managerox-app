# ManagerOX CRM

The CRM application, intended for **app.managerox.com**. Next.js (App Router) +
Tailwind CSS v4, sharing a brand palette with the marketing site
([managerox-web](https://github.com/SaadAhmad915/managerox-web)).

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
pnpm start
pnpm lint
```

Requires **Node >= 20.9** (Next 16's floor). The pnpm version is pinned via the
`packageManager` field, so `corepack enable` once and the right pnpm is used
automatically — no global install needed.

### Why `pnpm-workspace.yaml` exists

Two pnpm policies need explicit, deliberate answers rather than being switched
off:

- `allowBuilds` — pnpm blocks dependency build scripts by default. `unrs-resolver`
  (a native ESLint dependency) genuinely needs its build, so it's approved by name.
- `minimumReleaseAgeExclude` — pnpm refuses packages published in roughly the last
  24 hours, which is the window where a compromised release usually gets caught.
  Next 16.3.5 shipped 2026-09-11 and tripped this. Rather than disabling the guard
  for everything, the first-party Vercel packages we chose are excluded by name.
  **Remove those entries once the version has aged past the window** — the guard is
  worth keeping for everything else.

## Status

**Milestone 1 — app shell + dashboard.** The dashboard is complete and built to
the product design. The other eight sidebar destinations are real routes
rendering a placeholder, so navigation works end to end.

| Route | State |
| --- | --- |
| `/` | Dashboard — stat tiles, pipeline funnel, revenue chart, tasks, leads, team |
| `/leads` `/contacts` `/deals` `/tasks` | Placeholder |
| `/calendar` `/reports` `/automation` `/settings` | Placeholder |
| `/more` | Placeholder — phone tab bar overflow |

Not built yet: **authentication** (every route is currently public) and any
write operations.

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

`app/lib/api.ts` is the single seam. Every function is already `async` and
returns domain types, so swapping mock data for real calls touches that file
only — no component knows a URL or a response shape.

Three things matter when `api.managerox.com` lands:

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
