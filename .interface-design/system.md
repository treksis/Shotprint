# Interface & Frontend Design System — MuseClone

> Grounded in local project skills: `frontend-design`, `design-taste-frontend` (Seed `1173446171` — *The printed annual* + App Seed `283019769` — *Framed sheet*), `interface-design`, and `emil-design-eng`.

## 1. Domain & Intent

- **Human:** Commercial creative director, DTC founder, or hackathon judge evaluating whether a viral short-form video's pacing and framing can be extracted and reshot around a new product.
- **Task:** Inspect a dissected viral film's cuts and spatial masks (`SAM 3.1`), swap in a product photo (`Muse Image`), and render/compare the reshot film (`fal.ai` + `Muse Spark 1.3` verification).
- **World & Feel:** Editorial film contact sheet meets a calm, high-precision daylight editing bay (*The Printed Annual* + *Framed Sheet*). Paper, carbon ink, and biro blue. Zero dark-mode neon AI slop, zero purple/indigo gradients, zero glowing cards, zero emojis.
- **Signature Element:**
  1. *On the Page:* The two-by-two contact board hero with a live scrubbable 4-cut filmstrip dissector and the 144-square "Many into one" SVG compression diagram (raw frames → Muse Spark blueprint ribbon → ordered reshot cuts).
  2. *In the App (`data-ui`):* Tinted stone frame (`#f6f6f4`) holding an inset white work sheet (`#ffffff`, `8px` inset, `16px` radius, `1px #eaeaea` edge, zero shadow) with synchronized side-by-side 9:16 contact monitors and live `SAM 3.1` focal reticles.

## 2. Rejecting AI Slop Defaults

| Rejected Default | Replacement in MuseClone |
| :--- | :--- |
| `Inter` / generic system font on `#07090E` slate dark mode | **Literata** (optical size `7..72`, weights `400/500/600`) on `#ffffff` paper & `#f6f6f4` stone frame |
| Purple/indigo/blue gradients (`bg-gradient-to-*`, `bg-clip-text`) | Flat solid fills only (`#ffffff`, `#f4f4f4`, `#111111`, and `#1a4be0` biro blue under 3% share) |
| Emojis in buttons (`⚡`, `🎬`, `🎥`) & pulsing dots (`animate-ping`) | Plain active verbs in sentence case (`Open studio`, `Reshoot cut`, `Verify alignment`) |
| Floating glass cards with drop shadows (`shadow-2xl`, `backdrop-blur`) | Step in background tone (`#ffffff` vs `#f4f4f4`) on pages; flat `1px #eaeaea` sheet in `data-ui` |
| Tiny tracked-out uppercase eyebrows (`text-[10px] uppercase tracking-widest`) | Sentence-case labels at `13–14px` in `#6b6b6b` (4.5:1+ contrast on white and `#f4f4f4`) |
| `transition-all` and sluggish `ease-in` | Exact properties (`transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), opacity 160ms`) + `:active { transform: scale(0.97) }` |

## 3. Tokens

```css
:root {
  /* Page Tokens — Sheet and Biro */
  --bg: #ffffff;
  --surface: #f4f4f4;
  --ink: #111111;
  --muted: #6b6b6b;
  --accent: #1a4be0;
  --accent-ink: #ffffff;
  --field-1: #111111;
  --field-1-ink: #ffffff;

  /* App Sheet Tokens — Framed Sheet (Light) */
  --chrome: #f6f6f4;
  --sheet: #ffffff;
  --well: #f4f4f2;
  --border: #eaeaea;
  --rule: #f0f0ee;
  --control: #d1d5db;
  --positive: #247b50;
  --pill-positive-bg: #dcfae5;
  --pill-positive-ink: #04250e;
  --negative: #c4242a;
  --pill-negative-bg: #ffedea;
  --pill-negative-ink: #831c1e;

  /* Typography — Five steps max */
  --font-serif: 'Literata', Georgia, serif;
  --step-small: clamp(0.8125rem, 0.79rem + 0.1vw, 0.875rem);   /* 13–14px */
  --step-body: clamp(1.0625rem, 1.02rem + 0.25vw, 1.1875rem);  /* 17–19px */
  --step-lead: clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);         /* 20–24px */
  --step-head: clamp(2rem, 1.4rem + 2.8vw, 3.5rem);            /* 32–56px */
  --step-display: clamp(4.5rem, 9vw, 9.5rem);                  /* Hero title */

  /* Motion — Emil Kowalski curves */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
}
```

## 4. Component & Layout Measurements

- **Outer Frame Margin:** `8px` on the two-by-two board and `Framed sheet` app shell; `32px` (`16px` mobile) on editorial sections.
- **Vertical Axis (Landing Page):** `42%` on desktop (`grid-cols-12`, headings & body hang from column 6; columns 1–5 hold side notes or figures).
- **Buttons:** Flat solid fill (`#111111` ink or `#1a4be0` accent), `8px` radius, `36px` height in app (`56px` in closing CTA), `transform: scale(0.97)` on `:active` over `160ms var(--ease-out)`.
- **Numeric Discipline:** `font-variant-numeric: tabular-nums` on every timecode, score, view count, cut duration, and latency figure.
