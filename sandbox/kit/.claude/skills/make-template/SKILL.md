---
name: make-template
description: Turn a film (an ad, a launch film, a product tour) into a director template that makes 30-second and 15-second spots: measure it, choose the 30 s and 15 s cuts, cut the score on the bar, and build the recipe, ingredient set and storyboards for the kept shots. Use when the person gives a video and asks to dissect it, templatify it, reverse-engineer it, or make a template from it.
---

# Make a template

A template is a real film taken apart so it can be made again: the **recipe** (`template.json`,
`TEMPLATE.md`), the **ingredient set** (`set/`) and a **storyboard** per shot (`boards/`). The format is
`docs/template_spec.md`; read it first. Templates make **30 s and 15 s spots**: video models hold a
shot for 2-10 s and stay consistent across 10-15 shots, not across a long film. So measure the whole
film, but build only what the two cuts use.

The test it must pass: another agent that never sees the film gets only `templates/<id>/` and makes
a 30 s film that plays like the real footage cut the same way. Same shots, framings, moves, people,
places, product and sound at the same moments. Not the same pixels.

Work in one pass, no subagents. Target: about 30 minutes.

## 1. Measure (1 minute)

```bash
bin/dissect inputs/<film>.mp4 --template <id>
```

Read `dissection/<film>.md` and every shot board. Fill the top level of `template.json`: `acts`, `look`
(brightness ranges as numbers), `text_style`, `sound`, `slots`. Give **every** source shot a one-line
`action`. Copy the soundtrack: `ffmpeg -i inputs/<film>.mp4 -vn -ac 2 -ar 48000 templates/<id>/set/score.wav`.

## 2. Choose the cuts (the editor's job)

`bin/template beats templates/<id>/set/score.wav` gives the tempo and the bar starts.

Write `cut30` first, like an editor making the official 30 s spot: hook, the product's best moments,
the payoff, the end card. Keep the source's pace (average shot length close to the measured one).
Then `cut15`: the 30 s cut tightened to hook, one proof, payoff, end card. For each:
- `shots`: `n`, `from` (source shot), `start`/`end` in the new timeline, `src` [in, out] in the source,
  and `change` (what differs from the source shot). Picture cuts may sit off the bar; the score
  joins may not.
- `score.segments`: `[{src_in, src_out}]` on bar starts, summing to the duration; `xfade_ms` 30,
  `fade_out` 0.15. Then `bin/template score templates/<id> 30` (and `15`).
- `lines`: kept speech with exact words and new times; `in_score: true` when the soundtrack already
  carries it.
- `text`, `end_card` in the new timeline.

Check the cut: `bin/template reference templates/<id> 30 inputs/<film>.mp4 notes/ref30.mp4`, extract a
frame per shot and look; listen at each join (`ffmpeg -ss <join-1> -t 2`). Redo the cut if a moment
doesn't land or a join jumps.

## 3. The kept shots, fully

For every source shot either cut uses, fill every per-shot field of the spec with numbers: size in
frame as % of width, camera height and angle, move with start/end and speed, light, brightness, text
with exact words, size, position and in/out times, audio with absolute times, and the `render` mode
that will hold it (picture: first + last frame; speaking: first frame + guide audio from its line
clip; screens: composited from `ui_` sheets; motion graphics: drawn in code).

## 4. Ingredient set (parallel `bin/img`, then look at every image)

Only for what the kept shots need:
- `char_<name>_sheet.png`, `product_<name>_sheet.png`, `loc_<name>.png`: from source frames, but
  **off the shot framings** (neutral background, empty wide place), matching the film's darkness.
  Name every distinctive product part and its colour as a number.
- `lines/Lnn.wav` + `lines.json`: each kept line cut from the source at phrase boundaries
  (`dissection/<film>.json` has the turns), and `voice_<name>.wav`, 10-20 s of clean voice.
- `ui_<screen>.png` + `ui.json` for screens: flat, full-size, exact copy; scrolls, taps, zooms by time.
- Nothing from another brand. A screen or prop that evokes a franchise gets a generic version that
  `bin/img` accepts.

## 5. Boards

One pencil sketch per kept shot, from its middle frame (`dissection/frames/`), with start and end
sketches for a moving shot. Prompt in `docs/template_spec.md`. Redo any with photographic detail.

## 6. Check and ship

`bin/template check templates/<id>` until it says OK, then write `TEMPLATE.md` (the film in a
paragraph, the arc, the rules that make it this film, and the two cuts). Reply with the two cuts
(shots and arc), the set ids, the number of images, and what you were unsure of.
