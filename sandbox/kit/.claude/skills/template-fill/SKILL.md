---
name: template-fill
description: Make an ad by filling a dissected director's template (templates/<name>/TEMPLATE.md + template.json) with a new product, presenter and lines, instead of inventing the film's structure. Use whenever a templates/ folder is present and the task is to produce a commercial "in the style of" its source film. Covers plates per camera setup, voice-first presenter takes, first-frame continuity, the guide-audio repair, continuity checks, and sync-safe assembly from a cut list.
---

# Template fill

A template is a professional film's decisions, measured: its arc, shot list, fixed camera setups,
measured camera moves, line functions with syllable budgets, sound plan, look and product rules. Your
job is to **fill the slots, not to redesign the film.** Where the template says "keep", keep. Where
you have latitude (which optional shot, the exact words of a line), use it for the new product.

Read in this order: `TEMPLATE.md` (all of it), `template.json`, the frames in `frames/` for every
setup you will use, and `master_shots.md` when you need to know how the source handled a moment.

## 1. Fill sheet first (no GPU yet)

Write `fill.md` before generating anything:
- every `{SLOT}` with its value: product name, product **must** list (shape, material, colour,
  distinctive parts) and **never** list (3-6 things it must not turn into), claim lines, brand mark;
- the six lines L1-L6 in the template's rhetorical pattern, each counted against its syllable budget;
- for each of the 15 shots: setup chosen (where the template offers alternatives), what we see, which
  line is heard, and the render unit that supplies it.
Check the fill sheet against `template.json` (durations, budgets, rules) and fix it before moving on.

## 2. Plates (stills; cheap, iterate here)

One plate per camera setup and per B-roll unit you use, each made by **editing that setup's reference
frame**: keep camera position, lens, height, light and set; replace the presenter (use the presenter
photos), the product (use the product photos), and rewrite or remove signage so no other brand
remains. Prompt with what to **make**, not what to avoid ("the man from image 2 stands where the
founder stands, waist-up, left third, same light"), and list the product must/never words in every
plate that shows it.

Look at every plate next to the presenter and product photos. Redo a plate if the face, the product's
shape, or the setup's framing is wrong. A plate that is wrong costs one image; a clip from it costs a
render and a retake.

For 9:16 editions use the template's 9:16 framing column and make vertical plates.

## 3. Hybrid H3 modes (read TEMPLATE.md section 11 and follow its table)

Reference path (Ref2V) for **voice and identity**, keyframe path (FL2V: `first_frame` + `last_frame`)
for **every picture that reaches the cut**. `first_frame` is ignored on the reference path, and a
first-frame-only clip drifts; anchor both ends.

Presenter on camera, per line:
1. **Voice take (Ref2V)**: `refs` = [setup plate, presenter photo], `ref_audios` = [voice reference],
   the line in `<d>[English] ...</d>`, no music. Check the words (transcribe). Redo only if the voice is
   wrong. Keep its audio as `takes/<line>.wav`.
2. **Picture (FL2V + guide)**: `first_frame` = setup plate, `last_frame` = that setup's end-pose plate,
   `guide_audio` = the take audio, no `refs`. The clip reproduces the take verbatim, lip-synced, and
   starts and ends on the setup. If the Ref2V take's own picture already opens and stays on the plate
   (continuity says adherence ≥ 0.9 at both ends), you may keep it and skip step 2.

End plates: make them by editing the start plate ("same camera, same light, a moment later: ...").
**Speaking shots get a neutral end plate** (same relaxed expression, lips slightly parted, hands low):
a smiling or closed-mouth end plate stops the lips from following the guide audio.

Before writing any prompt, read TEMPLATE.md section 9 (Restraint): describe behaviour plainly, keep
moves at the measured size, no glow/sparkle/hype words. The audience must not be able to tell the
film was generated.
For product shots the end plate is the end of the template's measured move for that unit.

## 4. Product shots and B-roll

FL2V with start and end plates. Use the supplied product sheet (`assets/product_sheet.png`), never a
sheet you assemble from other footage, and paste the template's `product lock` line into every product
prompt. Check the product against the product sheet **part by part, including colour and finish**, on both
plates (shield shape, temples, puck shape, cable) before rendering; a wrong part in a plate is in the
film. A small product must fill at least a third of the frame. For an action continuing across a cut,
chain: the previous clip's last frame is the next clip's `first_frame`. No speech, no lip movement, no
readable text, `non_diegetic_music: none`.

## 5. Continuity and repair (before assembly)

Write the cut list `cut.json` (format in `tools/assemble.py`) and a `plates.json` mapping each take to
its plate and setup, then run:

    tools/.venv/bin/python tools/continuity.py cut.json plates.json --template templates/<name>/template.json

Fix every FIX and look at every check:
- **plate adherence low** → the clip did not open on its plate: repair (presenter) or re-render (B-roll).
- **held head / morph spike** → move the cut so the picture starts after it (trim, never retime).
- **jump cut** → the template forbids same-setup cuts; swap one shot to another setup.
- **grade jump between interview setups** → `tools/grade_match.py clip ref_plate out` (audio kept).
- **camera move mismatch** → re-render with the move stated more strongly, or pick another window.
- **speech windows** → place cuts in the pauses; on-camera shots must start after the take's speech
  has started and the line must finish before a cut to another on-camera setup.

## 6. Assemble (sync-safe)

`tools/assemble.py cut.json final/final.mp4`. Each take is placed **once** (`at`), and both its
picture windows and its sound windows derive from that placement: this is how a line can run on
under B-roll (L-cut) or start under the establishing shot (J-cut) and still be in sync when we see
the face. Never use atempo, setpts speed changes, or `-shortest` on a take.

Score: one bed under the whole film (the template's sound section). If you can only get short music
pieces, join them at bar-aligned points with crossfades, then let `assemble.py` duck it under speech
and hard-cut it where the template says.

Post graphics: `tools/post_text.py etch ...` for the claim overlay, `tools/post_text.py endcard ...`
for the end card.

## 7. Review against the template, then fix the worst shot

Watch the cut (extract frames at every cut point and the middle of every shot) next to the template's
frames. Score yourself on the template's own terms: arc, setups held, product shape everywhere, lines
clear, cuts on phrase breaks. Retake the single worst shot first, re-run continuity, re-assemble.
