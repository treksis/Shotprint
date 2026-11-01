---
name: template-fill
description: Make a film by filling a director's template (templates/<id>/ with TEMPLATE.md, template.json, set/, boards/) with a new subject, instead of inventing the film's structure. Use whenever a templates/ folder is present and the task is a film "in the style of" its source, a cutdown of it, or a close rebuild of it. Covers the fill sheet, swapping the ingredient set, plates from boards, render modes per shot (first/last frame, guide audio, reference + voice, composited screens), timing to the recorded lines, and assembly from a cut list.
---

# Template fill

A template is a real film taken apart: **the recipe** (`template.json` + `TEMPLATE.md`: every shot's
timing, framing, move, light, text and sound, with measured numbers) and **the ingredient set**
(`set/`: character, product and location sheets, voice, recorded lines, UI screens, score), plus a
storyboard sketch per shot (`boards/sNN.png`). The format is `docs/template_spec.md`.

The film you make is one of the template's cuts: `cut30` (the default) or `cut15` when the brief asks
for 15 s. Each cut lists its shots in the new timeline; every shot inherits the fields of the source
shot it comes `from`. Your job is to **keep the recipe and swap the ingredients**. Where the template gives a number (time,
brightness, size in frame, move speed), hit the number. Where it has a slot (`slots`, `{PRODUCT}`,
`{PRESENTER_NAME}`...), fill it for the new film.

Read in this order: `TEMPLATE.md`, `template.json` (top level, then every shot), the boards, then
the set sheets you will use.

## 1. Fill sheet (no GPU yet)

Write `notes/fill.md` before generating anything:
- every slot and its value; for the product, a **must** list (shape, material, colour, distinctive
  parts) and a **never** list;
- the new ingredient set: which sheet replaces which set id (`char_*`, `product_*`, `loc_*`, `ui_*`),
  and what is kept as is;
- the lines: for each entry in `lines.json`, the new words, fitted to the same duration (count
  syllables against the source line; a generated read runs 10-20% slower, so write shorter);
- for a cutdown, which shots survive and the new timeline;
- per shot: what we see and the render unit that supplies it (from the shot's `render` field).

## 2. Ingredients

Make the new sheets with `bin/img` in the template's own sheet format (same views, same neutral
background) so they slot in. Locations must match `look`: same brightness numbers, no added haze.
Lines: record or generate each line as its own clip, `lines/Lnn.wav`, and measure its length; a line
that runs long gets rewritten shorter, not sped up.

## 3. Plates from boards

One plate per shot (two for a moving shot: start and end), made by `bin/img` with the board as the
composition image and the set sheets as identity images: "Keep the exact composition of the sketch
(image 1): ... The person is the one in image 2, the place is image 3 ...". Put the shot's
`shot_size`, `subject_in_frame`, `camera` and `light` into the prompt, and the measured brightness.
Look at every plate next to its board and sheets; redo it if the framing, face, product or darkness is
off. A wrong plate costs one image; a clip from it costs a render.

Shots of one `setup` share a plate, so a cut back to that camera matches.

## 4. Render, per the shot's `render` field

- **Picture shots (product, B-roll, places):** first + last frame from the shot's start/end plates.
  No speech, no readable text, no music (the score comes in at assembly).
- **Speaking on camera:** first frame = the setup plate, `guide_audio` = that line's clip. This holds
  the framing and the lip-sync. Reference + voice mode ignores the first frame, so the framing
  drifts; use it only to generate a voice when there is no line clip. Speaking shots get a neutral
  end pose (lips parted, hands low).
- **Screens and UI:** composite them in post from the `ui_*` sheets and `ui.json` (scrolls, taps,
  zooms by time) onto a plate or clip of the device. Don't ask a video model to draw readable UI.
- **Motion graphics:** draw them in code at the sizes and timings the template gives.

`seconds` is 2-10 per clip; a longer shot is two clips chained (the first clip's last frame is the
second's `first_frame`).

## 5. Cut and assemble

Write `cut.json` with the template's shot times, then assemble (`tools/assemble.py cut.json
final/final.mp4`, or ffmpeg). Place each line clip once, at its `lines.json` time; picture cuts follow
the template, and a line may run over a cut exactly where the template says it does. Never retime
generated audio or picture (no atempo, no setpts speed changes): trim instead. Score: `set/score.wav`
(or its replacement) from 0 s under the whole film, the mix as in `sound`. Text and end card: as in
`text_style` and each shot's `text`, with exact sizes and positions.

## 6. Check against the template

Extract the middle frame of every shot and set it beside its board; measure each shot's brightness
against the template's numbers. Listen to every line at its time. Fix the worst shot first, then
reassemble.
