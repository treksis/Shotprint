# Pitch: MuseClone Studio

## The one-liner

**Take a winning ad apart, prove the recipe by rebuilding it blind, then make it again with your product, at
30 s and 15 s.**

## The story (2 minutes)

1. **Ads that work have a structure.** The hook, the cut timing, the framings, the moment the music drops,
   the line that lands on the product. Agencies copy structure all the time; they just do it by hand.
2. **Video models can make shots, not films.** A shot holds for 2-10 s and a model stays consistent across
   10-15 shots. That is exactly a 30 s or 15 s spot, and not a 2-minute film. So we built for spots.
3. **A template is a film reverse-engineered.** We measure the ad (every cut, fade, brightness, loudness,
   spoken line, in seconds, with no model), then an agent writes the **recipe** (every shot's timing,
   framing, camera move, light, text and sound, as numbers), draws the **ingredient set** (cast, product,
   places, screens, voice, score) and a **storyboard** per shot, and cuts it to 30 s and 15 s like an editor.
4. **The proof: a blind rebuild.** A second agent that never sees the ad gets only the template and makes
   the film again. Put it next to the real footage cut the same way: same shots, same timing, same sound.
   Not the same pixels (that would mean the source leaked); the same film.
5. **Then it's yours.** Swap the ingredients (your product sheet, your people, your lines) and keep the
   recipe. Every plate, clip and cut lands on a canvas you can inspect and steer.

## Demo path (3 minutes)

1. Landing page: the hook video plays real Meta films next to their blind rebuilds.
2. **Templates** (sidebar): thirteen ready templates, each "Ready · rebuilt blind".
3. Open **Hardware launch film** → **See the proof**: real 30 s cut (left) vs blind rebuild (right). Toggle
   **15 s spot**. Scroll the storyboard strip, the lines and the ingredient set.
4. Open **Deadpan dialogue** or **Flagship phone reveal**: a 2026 Cannes Film Grand Prix spot and a 24M-view
   launch film, rebuilt from their templates with invented cast and brand.
5. **Made from this template**: the same recipes used for ten Meta products, made by Opus from the
   templates with new product sheets, invented cast and new lines: **Meta Ray-Ban Display** (hardware
   launch), **Facebook Marketplace** (room makeover), **Meta AI** (deadpan), **Meta Quest 3S** (phone
   reveal), **Ray-Ban Meta** at the match (fan moments), **WhatsApp** (farm story), the **Meta AI app**
   intro (motion graphics), **Ray-Ban Meta** as a holiday gift (holiday story), **Meta Quest 3** (car
   launch) and **Threads** (athlete monologue), each at 30 s and 15 s. The 15 s versions reuse the 30 s
   clips: 2-6 minutes, no new renders. A 43 s reel of all ten: `lab/pitch/meta_products_reel.mp4` (local).
6. **Make a 30 s film from this** → the brief is prefilled → a project opens with the template on its
   canvas.

## The library (13 templates, each with a 30 s and a 15 s cut)

| Template | Source (described generically in the product) | Format |
|---|---|---|
| Hardware launch film | Meta, "Introducing Meta VR Glasses" | Product reveal |
| Founder on the factory floor | Founder interview + factory B-roll | Founder story |
| Agent product intro | Meta, "Introducing Muse" | Motion graphics |
| Feature tour | Meta, "Take the full tour of Muse" | Presenter + screens |
| Flagship Phone Reveal | 2026 flagship smartphone launch film (24M views) | Tech product reveal |
| One Last Harvest Together | 2026 big-game snack spot (HarrisX #1) | Heritage story |
| Foal and Eagle Grow Up | 2026 big-game beer spot (Ad Meter #1) | Animal epic |
| Fans Feel the Goal | 2026 tournament soft-drink spot (7.8M views) | Fans + product macro |
| Parent Visits, Room Transformed | Home-furnishing spot (963k views) | Comedic makeover |
| Deadpan Helpful-Answer Ad | 2026 Cannes Lions Film Grand Prix | Deadpan dialogue |
| Gift Unlocks a Memory | 2025 department-store Christmas film | Holiday story |
| Dark Performance Car Launch | 2025 performance-sedan launch film | Car launch |
| Deadpan Legend Monologue | 2026 sportswear big-game spot | Athlete monologue |

Third-party templates carry no brand: products and taglines are slots with invented defaults ("Halvard
Lager", "Lune 2 Pro", "Wren"), and the cast are invented people who fit the roles, never likenesses.

## Numbers

| Step | Time | Notes |
|---|---|---|
| Measure an ad (`bin/dissect`) | ~17 s for 86 s of film | cuts, fades, brightness, loudness, transcript, shot boards; no model |
| Author a 30 s + 15 s template (Opus) | 10-47 min | recipe, 20-30 sheets, 30-60 storyboards, score cut on the bar; 36-80 stills |
| Blind 30 s rebuild | 12-62 min | 11-16 clips (MiniMax-H3) + ~25 stills; 48-62 min when six films shared one GPU, 12-33 min when three did |
| Blind 15 s rebuild | 10-30 min | 6-10 clips |

Six ads went from a YouTube link to a seeded template with blind 30 s and 15 s proofs in about 2 h 5 min
of wall time, in parallel, on one G4 GPU. Three more (holiday story, car launch, athlete monologue)
followed in about 1 h. Per-template numbers: `lab/pitch/RUN.md` (local).

## Under the hood

- **Studio**: React + a canvas over the project folder; each project is a Docker sandbox running Muse Code;
  the chat is its MSP stream.
- **Templates**: `sandbox/kit/docs/template_spec.md`; tools `bin/dissect`, `bin/template` (beats, score,
  reference, check); skills `make-template` and `template-fill`.
- **Generation**: MiniMax-H3 (picture and sound in one pass: first/last frame, reference + voice, guide
  audio for lip-sync) on a GPU; Muse Image for stills, sheets and storyboards.

## What's local only

Proof videos (`public/templates/proof/`), the Meta product examples (`public/templates/examples/`, they
still use the templates' scores, which must be replaced before public use), the source films (`sandbox/references/`) and source audio in
templates (score, lines) are not in git: they contain other companies' footage and music. The hook video
and landing images use Meta's own films only.
