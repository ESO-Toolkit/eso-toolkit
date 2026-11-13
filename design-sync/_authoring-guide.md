# design-sync/ authoring guide (local reference — NOT synced to claude.ai)

This folder is the local source for the claude.ai "ESO Helper Design System" project
(id df317386-a5c9-431a-a368-ac1fd0464b7a). Every file under `preview/` is a
self-contained HTML "card" rendered in the Claude Design pane. `colors_and_type.css`,
`SKILL.md`, `README.md` are project-level files. Files starting with `_` are local
authoring aids and are not uploaded.

## Hard rules for every preview card

1. **Line 1 must be exactly** (no BOM, nothing before it):
   `<!-- @dsCard group="Colors|Surfaces|Boundaries|Patterns|Components" -->`
2. Fully self-contained: all CSS inline in one `<style>` block, no external assets
   except the Google Fonts link below. No JS unless the card demonstrates a
   JS-driven effect (spotlight, scanning dot) — then keep it minimal and inline.
3. File size < 256 KiB (DesignSync cap). Aim well under.
4. Every recipe demo shows **dark and light side by side** using the app's real
   mechanism: two wrapper divs `data-color-scheme="dark"` / `data-color-scheme="light"`,
   with tokens scoped by attribute selector (see token block below).
5. Values are transcribed **exactly** from the cited source file — never rounded,
   never "improved". Label each demo with the source `file:line` in a small caption.
6. Glass demos must sit on the mini-backdrop (below) so `backdrop-filter` is visible.
7. Use the type stack: body Inter, headings Space Grotesk 600.

## Card shell template

```html
<!-- @dsCard group="Surfaces" -->
<meta charset="utf-8">
<title>Card Title</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  /* tokens + shell (copy verbatim from below) */
  /* card-specific recipes here */
</style>
<div class="ds-card">
  <h1 class="ds-title">Card Title</h1>
  <p class="ds-sub">One-line description. Source: src/theme/glassCardSurface.ts:29-70</p>
  <div class="ds-modes">
    <section class="ds-mode" data-color-scheme="dark"><h2>Dark</h2> ...demos... </section>
    <section class="ds-mode" data-color-scheme="light"><h2>Light</h2> ...demos... </section>
  </div>
</div>
```

## Token + shell CSS (copy verbatim into every card)

Values verified against `src/ReduxThemeProvider.tsx:37-69` on 2026-07-26.

```css
* { margin:0; box-sizing:border-box; }
body { font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif; background:#0b1220; padding:20px; }
h1,h2,h3 { font-family:'Space Grotesk',Inter,system-ui,sans-serif; font-weight:600; }

[data-color-scheme="dark"] {
  --bg:#0b1220; --panel:#0f172a; --panel-2:#0d1430; --text:#e5e7eb; --muted:#94a3b8;
  --accent:#38bdf8; --accent-2:#00e1ff; --ok:#22c55e; --warn:#ff9800; --danger:#ef4444;
  --border:#1f2937;
}
[data-color-scheme="light"] {
  --bg:#f8fafc; --panel:#ffffff; --panel-2:#f8fafc; --text:#1e293b; --muted:#64748b;
  --accent:#0f172a; --accent-2:#1e293b; --ok:#059669; --warn:#f97316; --danger:#dc2626;
  --border:#bcd9ff;
}
/* NOTE: light --accent is deliberately dark slate #0f172a, NOT a light blue.
   Cyan #38bdf8 accents remain hard-coded in many dark-leaning recipes even in light mode. */

.ds-card { max-width:1100px; margin:0 auto; color:#e5e7eb; }
.ds-title { font-size:1.4rem; color:#e5e7eb; margin-bottom:4px; }
.ds-sub { font-size:.8rem; color:#94a3b8; margin-bottom:16px; }
.ds-modes { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:760px){ .ds-modes { grid-template-columns:1fr; } }
.ds-mode { border-radius:16px; padding:18px; background:var(--bg); color:var(--text); border:1px solid var(--border); position:relative; overflow:hidden; }
.ds-mode > h2 { font-size:.72rem; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); margin-bottom:14px; position:relative; z-index:1; }
.ds-src { font-size:.68rem; color:var(--muted); font-family:'JetBrains Mono',Consolas,monospace; margin-top:6px; }
```

## Mini-backdrop (required under glass demos)

Simplified from `NebulaBackground.tsx` (dark) / `AuroraBackground.tsx` (light) —
enough visual noise for backdrop-filter to visibly blur. Place as the first child
of `.ds-mode`, then wrap demos in `position:relative; z-index:1`.

```css
.ds-backdrop { position:absolute; inset:0; pointer-events:none; }
[data-color-scheme="dark"] .ds-backdrop {
  background:
    radial-gradient(ellipse 60% 40% at 20% 25%, rgba(56,189,248,.28), transparent 65%),
    radial-gradient(ellipse 50% 45% at 80% 30%, rgba(129,140,248,.24), transparent 65%),
    radial-gradient(ellipse 55% 50% at 55% 80%, rgba(192,132,252,.18), transparent 65%),
    #0b1220;
}
[data-color-scheme="light"] .ds-backdrop {
  background:
    radial-gradient(ellipse 60% 40% at 20% 25%, rgba(125,211,252,.5), transparent 65%),
    radial-gradient(ellipse 50% 45% at 80% 30%, rgba(196,181,253,.42), transparent 65%),
    radial-gradient(ellipse 55% 50% at 55% 80%, rgba(167,243,208,.38), transparent 65%),
    #f8fafc;
}
```

## Labeling demos

Each demo block gets a caption: recipe name + source, e.g.
`<div class="ds-src">glassCardSurfaceSx(dark, '56,189,248') — src/theme/glassCardSurface.ts:29</div>`

## Groups in use

Colors, Surfaces, Boundaries, Patterns, Components. Keep group names exact —
the Design pane groups cards by this string.
