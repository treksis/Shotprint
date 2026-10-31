# MuseClone v1 — Landing + Studio Access Rebuild Plan

> **For the implementing agent (Gemini):** Follow this file top to bottom. Each task lists the exact files, what to delete, what to build, and how to verify it. Do not add sections, effects, or copy that aren't listed here. If something is ambiguous, pick the most **conventional, boring SaaS pattern** — that is the goal.

---

## 0. Why we're rebuilding

The current landing page ([LandingPage.tsx](src/client/components/LandingPage.tsx)) is an "editorial two-by-two tile board": a 60px tile header, four hero tiles, a 132-square SVG diagram, unequal flex panels, a giant SVG wordmark footer. Reviewers can't tell what the product does in 5 seconds. It reads as AI-generated art direction, not a product website.

The Studio entry flow is also wrong: clicking "Open studio" pops a Demo/Live chooser dialog ([StudioModeDialog.tsx](src/client/components/StudioModeDialog.tsx)), and the passcode `META2026` is printed all over the public UI.

### Target behaviour

1. **Landing** (`/`) = conventional marketing page: **navbar → hero with a hook video → feature explanation → how it works → demo/live explainer → final CTA → footer.**
2. **"Open studio"** goes **straight into the Studio in Demo mode.** No dialog. Demo is fully open, no login.
3. **Live mode is gated.** Any live action (or the "Go live" button) opens a small **reviewer access form**. The reviewer pastes the passcode we give them in the hackathon submission notes. The passcode is **never shown in the UI.**

---

## 1. Ground rules

- Stack stays as-is: React 19 + Vite + Tailwind v4 + Hono Worker. No new dependencies: **do not add** framer-motion, shadcn, or UI kits.
- Keep the existing palette + font tokens from [index.css](src/client/index.css) and [.interface-design/system.md](.interface-design/system.md): white `#ffffff`, light grey `#f4f4f4`, ink `#111111`, muted `#6b6b6b`, accent `#1a4be0`, font **Literata**. Only the **layout** is changing.
- Banned: gradients, glow, glassmorphism/backdrop-blur, emoji, drop shadows on cards, purple/indigo, `transition-all`, uppercase micro-labels, decorative SVG diagrams, "unlock / supercharge / revolutionize" copy.
- Max content width `max-w-[1200px] mx-auto px-6`. Section vertical padding `py-24` (desktop), `py-16` (mobile).
- Type scale (only these): `14 / 16 / 18 / 22 / 32 / 48 / 64 px`. Hero H1 = 64px desktop, 40px mobile.
- Buttons: primary = `bg-[#111111] text-white`, secondary = `bg-white border border-[#e5e5e5] text-[#111111]`. Height 44px, radius 8px. Keep the existing `btn-tactile` class.
- Every animation respects `prefers-reduced-motion` (already handled in index.css for `[data-reveal]`).

---

## 2. Task A — Hook video asset

**Files:** `public/hero/` (create), [index.html](index.html)

1. Create `public/hero/`.
2. The user will drop in the real hook video. Code must reference:
   - `public/hero/hook.mp4` (H.264, ~15–30s, 1920×1080, muted, < 8 MB)
   - `public/hero/hook.webm` (optional, same content)
   - `public/hero/hook-poster.jpg` (first frame, 1920×1080)
3. Until the user supplies them, use this temporary fallback so the page still works:
   - video: `https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4`
   - poster: the first preset template's `thumbnailUrl`
   Put both paths in one constant at the top of `HeroSection.tsx`:
   ```ts
   const HOOK_VIDEO = { mp4: '/hero/hook.mp4', webm: '/hero/hook.webm', poster: '/hero/hook-poster.jpg' };
   const HOOK_FALLBACK = { mp4: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' };
   ```
   On `<video onError>`, swap `src` to the fallback once.
4. **What the hook video should show** (note for the user, put it in a comment): 3s viral source clip → split screen dissection overlay (cuts + SAM box) → same cuts reshot with the user's product → "Same cuts. Your product." end card.

---

## 3. Task B — Rebuild the Landing page

**Delete:** the entire body of [LandingPage.tsx](src/client/components/LandingPage.tsx) (keep the file + exported `LandingPage` name and props so [App.tsx](src/client/App.tsx) still compiles). Remove `SCATTER_SQUARES`, `RIBBON_SQUARES`, `ORDERED_SQUARES`, `DEFAULT_CUTS`, the two-by-two board, the unequal flex band, the SVG wordmark footer.

**Create** `src/client/components/landing/` with one file per section, composed in `LandingPage.tsx` in this order:

| # | File | Section |
|---|------|---------|
| 1 | `SiteHeader.tsx` | Sticky navbar |
| 2 | `HeroSection.tsx` | Headline + CTAs + hook video |
| 3 | `LogoStrip.tsx` | "Built with" model/infra strip |
| 4 | `ProblemSection.tsx` | Why this exists (short) |
| 5 | `FeatureSection.tsx` | 4 alternating feature rows |
| 6 | `HowItWorks.tsx` | 3 numbered steps |
| 7 | `DemoVsLive.tsx` | What reviewers can do in each mode |
| 8 | `FinalCta.tsx` | Closing CTA |
| 9 | `SiteFooter.tsx` | Simple footer |

Props for `LandingPage` stay: `{ templates, projects, onEnterJudgeStudio, onOpenVault }`. Rename the usage internally to `onOpenStudio = () => onEnterJudgeStudio()`.

### B1. `SiteHeader.tsx`
- `sticky top-0 z-40 bg-white/100 border-b border-[#eeeeee] h-16`.
- Left: blue 16px square + "MuseClone" (18px, semibold).
- Center (≥ lg, hidden on mobile): anchor links `Features` (`#features`), `How it works` (`#how-it-works`), `Demo & Live` (`#access`), `Blueprint vault` (button → `onOpenVault`).
- Right: primary button **"Open studio"** → `onOpenStudio`.
- Mobile: hide center links; keep logo + "Open studio".

### B2. `HeroSection.tsx` (the hook)
Layout: centered text block on top, wide video below. `pt-20 pb-16`.
- Small line above H1 (16px, muted, sentence case, not uppercase): `Built for the Meta Global AI Hackathon`
- **H1** (64px / 40px mobile, `tracking-[-0.03em]`, max 2 lines): **`Copy what went viral. Swap in your product.`**
- Sub (18px, muted, `max-w-[60ch] mx-auto`): `MuseClone breaks a viral video into a shot-by-shot template with Meta Muse Spark, then rebuilds every shot around your product with Muse Image and fal.ai.`
- CTA row (centered, gap-3): primary **"Open studio — free demo"** → `onOpenStudio`; secondary **"Watch how it works"** → smooth-scroll to `#how-it-works`.
- Fine print under CTAs (14px, muted): `No sign-up. Demo runs on cached results at zero cost.`
- **Video frame** (`mt-12`): `rounded-[12px] overflow-hidden bg-[#111] aspect-video w-full max-w-[1100px] mx-auto`, `border border-[#eeeeee]`.
  - `<video autoPlay muted loop playsInline preload="metadata" poster=…>` with `<source webm>` + `<source mp4>`.
  - Bottom-right overlay button (white pill, 14px): toggles mute/unmute (`Sound on` / `Sound off`). Default muted.
  - If `prefers-reduced-motion: reduce` → do not autoplay; show poster with a centered "Play" button.

### B3. `LogoStrip.tsx`
- `py-10 border-y border-[#eeeeee]`.
- Label (14px muted, centered): `Powered by`
- One row of **text** wordmarks (no fake logos), 16px, `text-[#6b6b6b]`, gap-10, wraps on mobile: `Meta Muse Spark` · `SAM 3` · `Muse Image` · `fal.ai Kling` · `Cloudflare Workers` · `D1 + R2`.

### B4. `ProblemSection.tsx`
- `py-24`, two columns on lg (5/7), stacked on mobile.
- Left: H2 (48px): `Viral ads have a structure. Most teams guess at it.`
- Right: 2 short paragraphs (18px):
  1. `A winning short-form ad is a sequence of decisions: the first-second hook, the cut timing, the camera move, where the product sits in frame.`
  2. `Recreating that by hand takes a shoot and an editor. Prompting a video model from scratch loses the structure. MuseClone keeps the structure and replaces the subject.`

### B5. `FeatureSection.tsx` — `id="features"`
- Section H2 centered (48px): `From reference video to finished ad`
- Sub (18px muted, centered): `Four steps, each one visible and editable in the studio.`
- 4 rows, **alternating** image-left / image-right on lg (`grid lg:grid-cols-2 gap-16 items-center`), stacked on mobile (text first). Gap between rows `space-y-24`.
- Each row: step label (14px accent, e.g. `Step 1 · Dissect`), H3 (32px), paragraph (18px muted, max 48ch), 3-item bullet list (16px, plain `•` or a 6px accent square — no icons-in-circles), and a media panel.
- Media panel: `rounded-[12px] overflow-hidden bg-[#f4f4f4] aspect-[4/3]`. Use **real screenshots of our own studio** (`public/landing/feature-1.jpg` … `feature-4.jpg`). Until they exist, render the matching preset data from `templates[0]`/`projects[0]` (thumbnail/keyframe image with a simple caption chip). No fake UI mockups.

| Row | Label | H3 | Paragraph | Bullets | Media fallback |
|---|---|---|---|---|---|
| 1 | Step 1 · Dissect | `Turn any viral video into a template` | `Paste a link or upload a clip. Muse Spark logs every cut, camera move, pacing beat and on-screen text into a reusable blueprint.` | Cut-by-cut timeline with timestamps · Hook score for the first 3 seconds · Tempo, shot types and text overlays | `templates[0].thumbnailUrl` |
| 2 | Step 2 · Track | `Know exactly where the subject sits` | `SAM tracks the hero object in every shot, so your product lands in the same spot, at the same size, as the original.` | Focal box per cut · Confidence score · Used as the placement guide for generation | `templates[0].thumbnailUrl` with a CSS box at `blueprint.scenes[0].samFocalRegion` |
| 3 | Step 3 · Rebuild | `Regenerate each shot with your product` | `Upload a product photo. Muse Image draws a first frame for each cut, then fal.ai animates it with the original camera move.` | Edit any prompt before rendering · Re-roll a single shot · Keeps original cut lengths | `projects[0].scenes[0].keyframeUrl` |
| 4 | Step 4 · Verify | `Check it against the original` | `Muse Spark watches both videos side by side and scores how closely the new ad follows the source structure.` | Side-by-side synced playback · Per-cut fidelity score · Export MP4 | `projects[0].scenes[1].keyframeUrl` + chip `96% match` from `fidelityReport.overallScore` |

### B6. `HowItWorks.tsx` — `id="how-it-works"`
- `bg-[#f4f4f4] py-24`.
- H2 centered (48px): `How it works`
- 3 columns on md+ (stacked on mobile), each: big number (48px, accent, `tabular-nums`), H3 (22px), 1 sentence (16px muted).
  1. `Bring a viral video` — `Pick one from the blueprint vault or paste your own link.`
  2. `Add your product` — `Upload a photo and a one-line description.`
  3. `Get a new ad` — `Review each shot, render, and export.`
- Below: centered secondary button `Browse the blueprint vault` → `onOpenVault`.

### B7. `DemoVsLive.tsx` — `id="access"`
- `py-24`. H2 centered (48px): `Try it now, or run it live`
- Sub (18px muted, centered): `The demo is open to everyone. Live generation calls paid models, so it's reserved for hackathon reviewers.`
- 2 cards side by side (md+), `rounded-[12px] border border-[#eeeeee] p-8`, no shadow:
  - **Demo** (badge `Open to everyone`, grey): bullets — `Explore 3 dissected viral templates` · `Open finished reshoots in the studio` · `Edit prompts and see cached results` · `Zero cost, no sign-up`. Button primary **"Open demo studio"** → `onOpenStudio`.
  - **Live** (badge `Reviewers`, accent tint `bg-[#eef2fd] text-[#1a4be0]`): bullets — `Dissect any new video with Muse Spark` · `Generate new keyframes with Muse Image` · `Render motion with fal.ai` · `Requires the reviewer access code from our submission`. Button secondary **"I have an access code"** → calls `onOpenStudio()` then opens the Live access form (see Task C; pass a flag, e.g. `onEnterJudgeStudio(undefined, { openLiveGate: true })` — extend the prop signature accordingly).
- **Do not** print the passcode anywhere.

### B8. `FinalCta.tsx`
- `bg-[#111111] text-white py-24 text-center`.
- H2 (48px): `Same cuts. Your product.`
- Sub (18px, `text-[#bdbdbd]`): `Open the studio and remix a viral ad in a few minutes.`
- Button: white bg, ink text, **"Open studio"** → `onOpenStudio`.

### B9. `SiteFooter.tsx`
- `bg-[#111111] text-[#bdbdbd] border-t border-[#222] py-10`, 14px.
- Left: `© 2026 MuseClone · Built for the Meta Global AI Developer Hackathon`.
- Right: links `Studio` (→ `onOpenStudio`), `Blueprint vault` (→ `onOpenVault`), `GitHub` (`href="#"` placeholder, `TODO` comment).
- No giant wordmark.

### B10. Scroll reveal
Keep the existing `IntersectionObserver` + `[data-reveal]` hook — move it into a tiny `useReveal()` in `src/client/lib/useReveal.ts` and call it once in `LandingPage`. Apply `data-reveal` to section headings and feature rows only (not the hero — the hero must be visible instantly).

---

## 4. Task C — Studio access: Demo open, Live gated

### C1. Remove the chooser dialog
- **Delete** [StudioModeDialog.tsx](src/client/components/StudioModeDialog.tsx).
- In [App.tsx](src/client/App.tsx): remove `showModeDialog`, `dialogInitialChoice`, `pendingProjectId`, `handleRequestOpenStudio`, `handleEnterDemo`, `handleEnterLive`, `handleOpenModeDialog`, and the `<StudioModeDialog>` render.
- New handler:
  ```ts
  const handleOpenStudio = (projectId?: string, opts?: { openLiveGate?: boolean }) => {
    if (projectId) setActiveProjectId(projectId);
    else if (!activeProjectId && projects[0]) setActiveProjectId(projects[0].id);
    setCurrentView('studio');            // mode stays whatever it is (default: demo)
    if (opts?.openLiveGate) setShowLiveGate(true);
  };
  ```
- Default state on first visit: **demo** (`isJudgeMode = false`). Live persists only in `sessionStorage` (already the case in [api.ts](src/client/lib/api.ts)).

### C2. New `LiveAccessDialog.tsx` (`src/client/components/LiveAccessDialog.tsx`)
A small modal, **only** for entering the reviewer code. Props:
```ts
{ isOpen: boolean; reason?: string; onClose(): void; onUnlocked(): void }
```
- Native `<dialog>` or a fixed overlay `bg-black/40`; panel `max-w-[420px] rounded-[12px] bg-white p-6 border border-[#eeeeee]`. Close on Esc and backdrop click. Focus the input on open; return focus to the trigger on close.
- Title (22px): `Reviewer access`
- Body (16px muted): `Live mode calls Meta Muse and fal.ai on our account. Enter the access code from our hackathon submission to turn it on.`
- If `reason` is passed (e.g. "Rendering new clips needs live mode."), show it above the body in 14px ink.
- Form: label `Access code`, `<input type="password" autoComplete="off" spellCheck={false}>` with a show/hide toggle, submit button **"Turn on live mode"** (primary), secondary **"Keep using demo"** (closes).
- On submit → `verifyJudgePasscode(code)`. On success → `onUnlocked()` and close. On failure → inline error `That code didn't work. Check the submission notes and try again.` (red text 14px, `aria-live="polite"`). Disable button + show `Checking…` while pending.
- **No hint, no "Plug in META2026" button, no placeholder containing the code.**

### C3. Mode indicator + entry points in the Studio
- [Navbar.tsx](src/client/components/Navbar.tsx) (studio/vault top bar): replace the Demo|Live segmented control with one status pill + one button:
  - Demo: grey pill `Demo · cached results` + text button **"Go live"** → opens `LiveAccessDialog`.
  - Live: green pill `Live · reviewer` + text button **"Exit live"** → `setJudgeMode(false)`.
  - Rename nav item `Landing` → `Home`.
  - Props become `{ currentView, onNavigate, isJudgeMode, onRequestLive(): void, onExitLive(): void, activeProjectName? }`.
- [StudioWorkspace.tsx](src/client/components/studio/StudioWorkspace.tsx): remove the duplicate "Demo Mode · Go Live" toolbar button added last round (the Navbar is the single place). Keep `isJudgeMode` prop.
- Add a thin **demo banner** at the top of the studio sheet when in demo: `bg-[#f4f4f4] text-[14px] px-4 py-2` — `You're in the demo. Results are pre-generated. ` + link-button `Go live` → opens dialog. Hidden in live mode.

### C4. Gate the live actions (client)
Create `src/client/lib/useLiveGate.ts`:
```ts
export function useLiveGate(isJudgeMode: boolean, openGate: (reason: string) => void) {
  return <T extends unknown[]>(reason: string, fn: (...a: T) => Promise<void> | void) =>
    (...a: T) => (isJudgeMode ? fn(...a) : openGate(reason));
}
```
Wire it in `App.tsx` and pass the guarded handlers down. Actions that **require live**:

| Action | Where | Reason text |
|---|---|---|
| Dissect a new video | [TemplateVault.tsx](src/client/components/TemplateVault.tsx) "Dissect viral video" submit | `Dissecting a new video needs live mode.` |
| Create a new product reshoot | TemplateVault create-project submit | `Creating a new reshoot needs live mode.` |
| Regenerate keyframe | [StoryboardCenterPanel.tsx](src/client/components/studio/StoryboardCenterPanel.tsx) | `Generating new keyframes needs live mode.` |
| Render clip / Render all cuts | StoryboardCenterPanel | `Rendering new clips needs live mode.` |
| Re-run fidelity check | [SyncedRightPanel.tsx](src/client/components/studio/SyncedRightPanel.tsx) | `Running a new fidelity check needs live mode.` |

Actions that stay **open in demo**: browsing vault, opening any preset project, switching cuts, synced playback, editing prompt text (saved locally only), Export MP4 of the cached master.

When a gated action is triggered in demo, the button itself stays enabled (so reviewers discover the gate) and shows a small lock glyph (`lucide-react` `Lock`, 14px) next to its label.

After `onUnlocked()`, **re-run the action that triggered the gate** (store the pending callback in a ref in `App.tsx`).

### C5. Gate the live actions (server) — required, the client gate alone is not security
In [src/worker/index.ts](src/worker/index.ts):
1. Add middleware `requireLive` that reads `X-Judge-Key`, compares (constant-time-ish, uppercase/trim) to `c.env.JUDGE_PASSCODE`. If missing/wrong **and** the request isn't a cache hit → respond `402 { error: 'live_mode_required' }`.
2. Apply it to: `POST /api/templates/dissect` (+ aliases `/api/dissect`, `POST /api/templates`), `POST /api/projects`, `POST /api/projects/:id/scenes/:i/keyframe` (+ aliases), `POST /api/projects/:id/scenes/:i/render*`, `POST /api/projects/:id/render-all`, `POST /api/projects/:id/verify*`.
   - Exception: if the SHA-256 cache already has the result for that input, return it without the key (keeps demo working for preset inputs).
3. `handleJudgeAuth`:
   - Remove the hardcoded `|| rawPasscode === 'META2026'` and the `'META2026'` fallback; if `JUDGE_PASSCODE` is unset, always return `authorized: false`.
   - Remove the passcode from the 401 error text → `error: 'invalid_access_code'`.
   - Drop the fake `creditsRemaining` dollar strings; return `{ authorized, mode }` only.
4. [wrangler.jsonc](wrangler.jsonc): remove `JUDGE_PASSCODE` from `vars`. Document setting it with `npx wrangler secret put JUDGE_PASSCODE`. For local dev add it to `.dev.vars` (gitignored) and make [dev-server.ts](src/worker/dev-server.ts) read `process.env.JUDGE_PASSCODE`.

### C6. Client API cleanup ([api.ts](src/client/lib/api.ts))
- `verifyJudgePasscode`: delete the `catch` branch that authorizes `META2026` offline. On network error return `{ authorized: false, mode: 'error' }`.
- `setJudgeModeState`: **stop writing `judge_key` into the URL** (it leaks the code into history/screenshots). Remove the URL param read in `getJudgeModeState` and in `App.tsx`'s `useEffect`. Keep `sessionStorage` only.
- `requestWithFallback`: if the response is `402 live_mode_required`, throw a typed `LiveModeRequiredError` so the UI can open the gate instead of showing a red error.
- Remove `DEFAULT_JUDGE_PASSCODE` export and every import of it.

### C7. Purge the passcode from the UI
Run `grep -rn "META2026" src/ index.html` — the **only** allowed hit afterwards is none. Remove it from: `LandingPage`, `Navbar`, `StudioWorkspace`, `TemplateVault`, footer text, any `title=`/`aria-label`.

---

## 5. Task D — Routing sanity

Keep the simple state router in `App.tsx`, but sync to the URL so reviewers can share links:
- `/` → landing, `/?view=studio` → studio, `/?view=vault` → vault. Update with `history.pushState` on navigation and listen to `popstate` so the browser Back button works.
- Remove `?demo=true` and `?judge_key=` handling.

---

## 6. Acceptance checklist (verify every item before reporting done)

**Build**
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `npm run build` → succeeds
- [ ] `grep -rn "META2026" src index.html wrangler.jsonc` → no matches
- [ ] `StudioModeDialog.tsx` no longer exists; no imports of it

**Landing (`http://localhost:5180/`)**
- [ ] Order is exactly: header → hero (H1, sub, 2 CTAs, video) → powered-by strip → problem → 4 features → how it works → demo vs live → final CTA → footer
- [ ] Hook video autoplays muted, loops, has a sound toggle; falls back if `/hero/hook.mp4` is missing
- [ ] Within the first screen at 1440×900 a visitor sees the H1, the primary CTA and the top of the video
- [ ] No tile grid, no SVG square diagram, no giant wordmark
- [ ] Mobile 390px: no horizontal scroll, header shows logo + "Open studio" only

**Studio access**
- [ ] Clicking any "Open studio" goes straight to the studio in **Demo**, no dialog
- [ ] Demo banner visible; Navbar pill reads `Demo · cached results`
- [ ] Clicking "Render all cuts" in demo opens **Reviewer access** dialog with the reason line
- [ ] Wrong code → inline error, stays in demo
- [ ] Correct code (from `.dev.vars`) → pill turns `Live · reviewer`, banner disappears, and the original Render action runs
- [ ] "Exit live" returns to demo
- [ ] Reloading the tab keeps live (sessionStorage); a new tab starts in demo
- [ ] URL never contains the access code
- [ ] `curl -X POST localhost:8788/api/projects/<id>/render-all` without `X-Judge-Key` → `402` (unless cached)

**Design gates** (run from `v1/`)
- [ ] `node ../.agents/skills/design-taste-frontend/scripts/lint.mjs src/client/components/landing/*.tsx src/client/components/LandingPage.tsx src/client/components/LiveAccessDialog.tsx src/client/components/Navbar.tsx` → 0 FAIL
- [ ] `node ../.agents/skills/design-taste-frontend/scripts/inspect.mjs http://localhost:5180` → 0 FAIL; **open and look at** `.taste-skill/inspect/desktop-fold.jpg` and `mobile-fold.jpg` before reporting

---

## 7. Suggested execution order

1. Task C5 + C6 (server gate + api cleanup) — smallest, unblocks everything.
2. Task C1–C4, C7 (dialog swap, navbar, gating).
3. Task A (video constant + fallback).
4. Task B (landing sections) — build `SiteHeader` + `HeroSection` first and screenshot before doing the rest.
5. Task D (URL sync).
6. Run the full checklist in §6.

## 8. Out of scope (do not touch)
- The three studio panels' internal layout and visuals (only add the lock glyph + guarded handlers).
- `TemplateVault` visuals (only guard the two submit actions).
- AI pipeline logic in `ai-pipeline.ts`, D1 schema, presets data.
