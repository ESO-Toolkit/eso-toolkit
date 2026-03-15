# Atmospheric Background Technique — A Reusable Pattern

A breakdown of the multi-layered nebula/aurora background used across the ESO Toolkit site, distilled into portable principles you can apply to any project.

---

## Architecture Overview

The background is a **single React component** (`SiteBackground`) mounted once at the app root, inside the theme provider but outside the router. It renders _no interactive content_ — purely visual atmosphere that sits behind everything.

```
<ThemeProvider>
  <SiteBackground />   <!-- fixed, z-index 0–3, pointer-events: none -->
  <AppRoutes />        <!-- your actual content, z-index 4+ -->
</ThemeProvider>
```

It swaps between two variants based on the theme mode:
- **Dark mode** → `NebulaBackground` (cosmic purples, cyans, star particles)
- **Light mode** → `AuroraBackground` (soft pastels, floating light motes)

Both variants use the **exact same 4-layer architecture**, just with different colours and intensities.

---

## The 4-Layer Stack

Every layer uses `position: fixed; inset: 0;` so it covers the full viewport and stays put during scroll. Each layer has an incrementing `z-index` (0–3) and `pointer-events: none` so it never interferes with clicks.

### Layer 1 — Base Gradient Wash (Static)

**Purpose:** Establish the overall colour mood. This is what you'd see if everything else was stripped away.

**Technique:** Stack multiple `radial-gradient` calls on a single element, ending with a `linear-gradient` as the fallback base.

```css
/* Dark (nebula) */
background:
  radial-gradient(ellipse at 20% 30%, rgba(100, 50, 255, 0.15) 0%, transparent 50%),
  radial-gradient(ellipse at 80% 70%, rgba(0, 217, 255, 0.12) 0%, transparent 50%),
  radial-gradient(ellipse at 50% 50%, rgba(50, 0, 100, 0.1) 0%, transparent 60%),
  linear-gradient(135deg, #050810 0%, #0a0f1e 50%, #050810 100%);

/* Light (aurora) */
background:
  radial-gradient(ellipse at 25% 20%, rgba(165, 180, 252, 0.10) 0%, transparent 55%),
  radial-gradient(ellipse at 75% 75%, rgba(56, 189, 248, 0.08) 0%, transparent 55%),
  radial-gradient(ellipse at 50% 50%, rgba(236, 172, 190, 0.05) 0%, transparent 60%),
  linear-gradient(160deg, #f0f4ff 0%, #f8fafc 35%, #fdf2f8 65%, #f0fdfa 100%);
```

**Principle to steal:** Use 2–4 `radial-gradient` ellipses at different positions with very low alpha (0.05–0.15), layered on top of a base `linear-gradient`. The radial gradients add subtle colour pockets that break up uniformity.

---

### Layer 2 — Animated Colour Clouds (Slow CSS Drift)

**Purpose:** Add gentle organic movement so the background feels alive without being distracting.

**Technique:** 2–4 absolutely-positioned `<div>`s, each with:
- A single `radial-gradient` (one colour → transparent)
- Heavy `filter: blur(60–80px)` to make them soft blobs
- A slow CSS `@keyframes` animation (30–50 seconds) that combines `scale`, `translate`, and a tiny `rotate`

```css
@keyframes nebulaDriftSlow {
  0%, 100% { transform: scale(1) translate(0, 0) rotate(0deg); }
  50%      { transform: scale(1.15) translate(-30px, 15px) rotate(2deg); }
}
```

```css
.cloud {
  position: absolute;
  width: 65%;
  height: 65%;
  top: 10%;
  left: 5%;
  background: radial-gradient(ellipse, rgba(120, 60, 230, 0.2), transparent 70%);
  filter: blur(80px);
  animation: nebulaDriftSlow 40s ease-in-out infinite;
}
```

**Key details:**
| Parameter | Typical Range | Why |
|-----------|--------------|-----|
| Cloud size | 40–70% of viewport | Large enough to overlap and mix |
| Blur radius | 60–80px | Eliminates hard edges entirely |
| Animation duration | 30–52s | Slow enough to feel ambient, not animated |
| Scale range | 1.0–1.2 | Subtle breathing effect |
| Translate range | 10–30px | Keeps movement gentle |
| Rotate range | 1–2deg | Adds organic irregularity |

**Principle to steal:** Run separate animations on each cloud (`reverse` on some) so they move independently. Use `ease-in-out` for smooth reversals. Stagger durations (e.g., 30s, 40s, 50s) so the overall pattern doesn't obviously repeat.

---

### Layer 3 — Floating Particles (Stars / Motes)

**Purpose:** Add small points of light that give depth and a sense of space.

**Technique:** Generate an array of particle data at mount time using `useMemo` (so it's stable across re-renders), then render each as a tiny absolutely-positioned circle.

```js
const particles = useMemo(() => {
  return Array.from({ length: 60 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 1,          // 1–5px
    left: Math.random() * 100,             // random x%
    top: Math.random() * 100,              // random y%
    duration: 8 + Math.random() * 15,      // 8–23s animation
    delay: Math.random() * 8,              // staggered start
    opacity: 0.15 + Math.random() * 0.6,   // 0.15–0.75
    hasGlow: Math.random() > 0.7,          // 30% get a glow halo
  }));
}, []);
```

Each particle gets a multi-step keyframe animation:

```css
@keyframes nebulaFloat {
  0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.3; }
  25%      { transform: translateY(-15px) translateX(8px) scale(1.05); opacity: 0.7; }
  50%      { transform: translateY(-25px) translateX(-5px) scale(0.95); opacity: 0.5; }
  75%      { transform: translateY(-12px) translateX(12px) scale(1.02); opacity: 0.8; }
}
```

**The glow halo trick:** 30% of particles get a `box-shadow` that matches their colour but is blurred out wider. This makes certain "stars" feel brighter and more prominent without adding extra elements.

```css
box-shadow: 0 0 12px rgba(255, 255, 255, 0.45); /* size * 3, opacity * 0.6 */
```

**Principle to steal:**
- 45–60 particles is the sweet spot (visible but not heavy)
- Randomize `animationDelay` so particles don't move in sync
- Use a 4-step keyframe (not just 2) with direction changes to create non-linear, firefly-like paths
- The glow halo on a subset creates visual hierarchy without extra DOM nodes

---

### Layer 4 — Structural Grid Overlay (Static)

**Purpose:** Add a subtle tech/sci-fi structure that grounds the organic clouds and prevents the background from feeling too blobby.

**Technique:** A pure CSS grid using two `linear-gradient` lines (horizontal + vertical), each drawing a 1px line every 50px.

```css
background-image:
  linear-gradient(
    transparent 24px,
    rgba(0, 217, 255, 0.025) 24px,
    rgba(0, 217, 255, 0.025) 25px,
    transparent 25px
  ),
  linear-gradient(90deg,
    transparent 24px,
    rgba(0, 217, 255, 0.025) 24px,
    rgba(0, 217, 255, 0.025) 25px,
    transparent 25px
  );
background-size: 50px 50px;
opacity: 0.4;
```

**Principle to steal:** The grid lines are nearly invisible (alpha 0.025, then multiplied by 0.4 opacity = effective alpha ~0.01). They're felt more than seen — they add structure subconsciously. This layer is optional but especially effective for tech/gaming/dashboard UIs.

---

## Performance Considerations

| Decision | Why |
|----------|-----|
| `position: fixed` (not `absolute`) | Stays in place during scroll — no repaints on scroll events |
| `pointer-events: none` on every layer | Zero interaction cost, clicks pass straight through |
| `useMemo` for particle arrays | Prevents regenerating 60 objects on every re-render |
| CSS animations (not JS) | GPU-composited, runs on compositor thread, doesn't block main thread |
| `filter: blur()` only on 2–4 large clouds | Blur is expensive but applied to few large elements, not many small ones |
| No `will-change` | Browser already promotes fixed/animated elements to GPU layers |

---

## Adapting This to Other Designs

### Step-by-step Recipe

1. **Pick your mood colours** — Choose 2–3 accent colours for the radial gradients and clouds. Keep alphas very low (0.08–0.20).

2. **Set your base** — Layer 1's `linear-gradient` determines the dominant background colour. Everything else adds on top.

3. **Add 2–4 clouds** — Position them in different quadrants. Apply heavy blur (50–100px) and slow animations (25–50s). Each cloud = one colour.

4. **Scatter particles** — Generate 30–60 random dots. Match their colour to your theme (white for dark themes, pastels for light themes). Add glow halos to 20–30%.

5. **Optional grid** — Add a 1px-line grid for tech vibes, or skip for organic/nature themes.

### Theme Variations (Examples)

| Theme | Base | Cloud Colours | Particle Style |
|-------|------|---------------|----------------|
| **Ocean** | `#041220` | Teal, Deep Blue, Sea Green | White dots + blue glow |
| **Forest** | `#0a1a0f` | Emerald, Olive, Moss | Yellow-green firefly motes |
| **Sunset** | `#1a0a05` | Amber, Coral, Rose | Golden sparks |
| **Arctic** | `#f0f8ff` | Ice Blue, Pale Violet, White | Silver motes |
| **Cyberpunk** | `#0d0015` | Hot Pink, Electric Blue, Lime | Neon dots + heavy glow |

### Framework-Agnostic Version

The technique is pure CSS + DOM — no React-specific magic. In vanilla HTML:

```html
<div class="bg-layer bg-base"></div>
<div class="bg-layer bg-clouds">
  <div class="cloud cloud--a"></div>
  <div class="cloud cloud--b"></div>
  <div class="cloud cloud--c"></div>
</div>
<div class="bg-layer bg-particles">
  <!-- Generate with JS or hard-code 40-60 spans -->
</div>
<div class="bg-layer bg-grid"></div>

<div class="app-content">
  <!-- Your actual site -->
</div>
```

```css
.bg-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.bg-base   { z-index: 0; }
.bg-clouds { z-index: 1; }
.bg-particles { z-index: 2; }
.bg-grid   { z-index: 3; }

.app-content {
  position: relative;
  z-index: 4;
}
```

The particle generation is the only part that benefits from JS — everything else is pure CSS.

---

## Key Takeaways

1. **Layering is everything** — 4 simple layers combine into something that looks complex. Each layer alone is trivial.
2. **Low opacity is your friend** — Alphas of 0.02–0.20 create atmosphere without overwhelming content. When in doubt, go lower.
3. **Slow animations feel ambient** — Anything under 25 seconds starts to feel "animated". 30–50 second cycles feel like natural, ambient movement.
4. **Heavy blur erases sins** — A `blur(80px)` filter makes even a simple radial gradient look like a hand-painted nebula cloud.
5. **Randomized particles add life** — The combination of random position, size, speed, delay, and selective glow creates emergent complexity from simple rules.
