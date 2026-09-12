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
