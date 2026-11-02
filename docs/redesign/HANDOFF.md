# Hackathonownik UI redesign: handoff for Claude Code

Visual redesign only. Do NOT touch server code, load functions, form actions, routes, access rules or tests' logic. Keep every feature and every existing class hook that e2e tests rely on (check `tests/e2e` selectors before renaming anything).

Reference mockups: `docs/redesign/screens/*.dc.html` (static HTML, open in a browser; CSS is in each file's `<helmet><style>`). Each file maps to one route, see the table. Treat the mockups as the source of truth for spacing, sizes and copy. Mock data (team names, jurors) is placeholder.

## Direction
Keep the current identity: dark navy, violet and cyan, category colors from `app_config.yaml`, wave under the home title. Make it consistent: one sidebar, one card style, one button set, one status pill set. Avoid generic AI-UI tells: no glow or blur, no ALL-CAPS tracked labels, no gradient fills on bars or banners, no "→" on links, no emoji, no nested cards, no left color bars on cards.

## Tokens (replace values in `src/lib/styles/theme.css`, keep variable names where they exist)
- Base `#0f1322`, sidebar `#0c1020`, surface `#151a2c`, line `rgba(255,255,255,.08)`
- Action `#8b87ff` with DARK text `#0f1322` (white on violet fails contrast). Hover `#a19eff`
- Link and focus ring `#4df2ff` (2px outline, offset 2px)
- Success `#36c399`, warning `#f7a654`, error `#ff6b6b` (text variant `#ff9a9a` on tinted fill)
- Text `#e8eaf2`, secondary `#9aa3b8`, muted `#7d869b` (footer only)
- Status pill: 24px high, tinted fill at 16% alpha, colored text, always a word ("Complete", "Not rated"), never color alone
- Page background: `radial-gradient(circle at 75% 0%, #1b2140, #0f1322 40-55%)`
- Radii: cards 14px, buttons and inputs 10px, pills 999px
- Font: Onest 400/500/600/700/800. Numbers: `font-variant-numeric: tabular-nums`. Page title 32/800 letter-spacing -.02em, section title 20/700, body 15, secondary 13-14
- Touch targets 44px minimum (buttons, nav items, inputs 44-48px, range inputs 44px)

## Font loading
`hooks.server.ts` sets a strict CSP. Do not add a Google Fonts link without updating it. Prefer `npm i @fontsource/onest` and import weights 400-800 in `src/app.css`.

## Component mapping
| Mockup | Code |
|---|---|
| `.btn .btn-p / .btn-g / .btn-w` | `lib/components/ui/Button.svelte` (variants primary, ghost, warning; drop the wellness/commerce/admin/jury gradients) |
| `.tag`, `.chip`, `.pill` | `lib/components/ui/Badge.svelte` |
| `.card` | `lib/components/ui/Card.svelte` and `.card-standard` in `global.css` |
| `.field`, `.in` | `lib/components/ui/Input.svelte` |
| `.side`, `.who`, `.nav` | `lib/components/Sidebar.svelte`, `SidebarElement.svelte`, `Navbar.svelte` (mobile Menu button) |
| tabs and progress bar | `CategoryTabs.svelte`, `.progress` usages |
| checklist rows | `SubmissionChecklist.svelte` |
| team cards and rating form | `TeamCard.svelte`, `TeamSection.svelte`, `GradeTeamForm.svelte` |
| ranking table | `TeamRanking.svelte` |

## Screens to routes
| File | Route |
|---|---|
| Main | `/` (`routes/+page.svelte`, left-aligned hero, no glow, keep wave) |
| Login | `/login` (`Login.svelte`) |
| Info | `/info` |
| Upload | `/upload` |
| MySubmission | `/my-submission` |
| Presentations | `/presentations` (incl. PDF viewer chrome) |
| Rate, RateMobile | `/rate_presentation` (phone: stacked, 44px sliders) |
| Ranking | `/ranking` |
| Present | `/present` |
| Dashboard | `/admin/dashboard` |
| People | `/admin/people` |
| Import | `/admin/import` |
Not mocked, restyle with the same tokens: `/admin/ratings`, `/admin/audit`, `/admin/protocol` (print styles stay), `/admin/system-info`, error page.

## Layout rules
- Shell: sidebar 260px (hidden behind Menu below 1024px, as now), main area padding 40px 48px, content gap 24px.
- Info rows and tables: 1px lines only between rows of the same data. Table headers sentence case 13px, not uppercase.
- Sidebar shows name, role chip, category chips, deadline countdown (participants). Active nav item: violet tint with 1px inset ring.
- Final-stage, confirmation and warning banners: tinted solid fill plus 1px border, no gradients.

## Order of work
1. tokens + font + `global.css` 2. ui/ components 3. layout + Sidebar/Navbar 4. participant screens 5. jury screens 6. admin screens 7. run `npm run check`, unit tests, then `npm run test:e2e` and fix selector breakage 8. visual check at 375px, 768px, 1280px.
