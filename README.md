# Draw Clever — v2

A complete redesign of the Draw Clever website — a luxury architecture & interior
design atelier with studios in Romania and Spain.

> **Design language — "Midnight Couture."** Ink-black canvas, warm-white text, and
> the brand's own champagne → bronze **gold ramp** sampled straight from the logo.
> Cinematic, restrained, editorial. Display type is **Playfair Display SC** (the
> brand serif); UI/body is **Montserrat**.

## What's here

A single, deeply-built homepage (`index.html`) with:

- **WebGL depth-parallax hero** (`src/hero.js`, Three.js). A real depth map drives
  per-pixel parallax as the cursor moves — foreground swims, background holds.
  Degrades gracefully: no WebGL → static graded photo; no depth map → cinematic pan;
  `prefers-reduced-motion` → still image.
- **Gold-gradient display type** — headline accents use the logo's exact gold ramp
  via `background-clip: text`.
- **Selected Works** — an editorial grid of 8 projects, each opening a fullscreen
  **lightbox gallery** (`src/lightbox.js`) with keyboard nav, focus handling and
  neighbour preloading.
- Manifesto, full-bleed parallax interludes, studio + facts, disciplines, four
  tenets, contact CTA, footer.
- Film-grain overlay, scroll-progress bar, scroll reveals, a mobile drawer, and a
  full responsive pass. Reduced-motion friendly.

## Brand palette (from the logo)

| Token | Hex | |
|---|---|---|
| Champagne | `#EAD9B0` | lightest gold |
| Light gold | `#D9BD82` | |
| Core gold | `#C8A96A` | the signature |
| Amber | `#B5853F` | |
| Bronze | `#9C6B2E` | deepest ("the VER in CLEVER") |
| Ink | `#0A0908` | canvas |
| Warm white | `#F3EEE6` | text |

The signature gradient is `--grad-gold` in `index.html`.

## Run it

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # → dist/
npm run preview  # serve the production build
```

Built with **Vite**. `base: './'` emits relative asset URLs, so the build runs from
a domain root, a GitHub Pages project subpath, or straight off disk — no config change.

## Structure

```
index.html                 # the homepage (styles inline)
src/hero.js                # Three.js depth-parallax hero
src/lightbox.js            # project gallery lightbox + manifest
public/
  Renders/<Project>/…       # project photography (+ depth_map_output.png)
  Logo Variants/…           # brand marks
  Fonts/…                   # self-hosted Montserrat + Playfair Display SC
```

### Add a project

1. Drop images in `public/Renders/<Project Name>/`.
2. Add an entry to `PROJECTS` in `src/lightbox.js` (key = the card's `data-project`).
3. Add a card in the Selected Works grid in `index.html`.

---

© 2026 Draw Clever — *We redefine the luxury life.*
