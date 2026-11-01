# Director template spec

A template is a film taken apart so that it can be made again. It holds two parts:
- **the recipe**: how the film is built;
- **the ingredient set**: what it is built from.

Test: an agent that has never seen the source gets only `templates/<id>/`. It must be able to make
a film that plays like the original: same shots in the same order and timing, same framings and
moves, same people, places and product in each shot, same sound landing at the same moments. It
doesn't have to be the same pixels; a pixel-for-pixel copy would mean the source leaked in. A
template that passes this test also works for a new film: swap the ingredient set and keep the recipe.

## Folder

```
templates/<id>/
  TEMPLATE.md         the film in words: one paragraph, the arc, the rules that make it this film
  template.json       the recipe (below)
  set/                the ingredient set: sheets, voice clips, score
  boards/sNN.png      a storyboard sketch per shot (composition only)
```

No source frames, contact sheets or clips go in the template. They stay in `dissection/`.

## template.json

Top level:
- `meta`: source, duration, size, fps, shot count, average and median shot.
- `acts`: name, shots, function.
- `look`: grade, contrast, light, depth of field, grain. Include the brightness range as numbers
  from `bin/dissect` (0-255; e.g. "studio shots sit at 10-30, lifestyle at 40-90").
- `text_style`: typeface feel, case, size, tracking, position, how it animates.
- `sound`: the music arc with times, where speech sits, the mix.
- `set`: ingredient id -> file(s) and what it fixes.
- `slots`: what a new film swaps (product, presenter, lines, places, text, end card). Every slot has a
  concrete default (an invented brand name and wordmark, a tagline), so a film made from the template's
  defaults never has to guess one.

Per shot:
- **Measured:** `n`, `start`, `end`, `dur`, `in` (transition), `brightness` {start, mid, end}, `colour`,
  `change`, `sound` (loudness).
- `setup`: a reusable camera-setup name, shared by every shot made from the same position.
- `location`, `cast` (set ids), `wardrobe`.
- `shot_size`: one of extreme close-up, close-up, medium close-up, medium, medium wide, wide, extreme
  wide, macro (the subject fills the frame).
- `subject_in_frame`: where the subject sits and how much of the frame it fills, e.g. "centred,
  70% of the width, horizon at the lower third".
- `camera`: height and angle (eye level, low, high, top-down, three-quarter front, profile), lens feel
  (wide, normal, long), depth of field.
- `camera_move`: type, direction and speed (locked off, slow push in, pan left, orbit right, handheld
  follow, tilt up...), plus what it reveals.
- `action`: what happens, in order, with times inside the shot when it matters.
- `light`: key direction, quality, colour, practicals; how dark (use the measured brightness).
- `text`: each item with exact words, position and its in/out times.
- `out`: the transition into the next shot (hard cut, dissolve and its length, match cut, wipe).
- `audio`: what is heard (music section, speech with exact words and absolute times, effects).
- `render`: the suggested build, e.g. "first + last frame: plate A -> plate B" or "reference + voice".
- `board`: `boards/sNN.png`.

## The 30- and 15-second cuts

A template makes **short films: a 30-second and a 15-second spot.** Video models hold a shot for
2-10 s and stay consistent across 10-15 shots, not across a long film, so long films are measured
whole but only cut down are made. The full shot list above is the source, studied; `cut30` and
`cut15` are what gets made. Each is a top-level object in template.json, with a section in TEMPLATE.md:
- `duration` (30.0 or 15.0, ±0.5), `arc`: how the film's arc survives in 30 s (hook, middle, payoff, end card).
- `shots`: in order, each with `n` (1..), `from` (the source shot number it is built from), `start`,
  `end`, `dur` in the new timeline, and what changes from the source shot (shorter, a different
  window of the move, merged with another). Every other field is inherited from the source shot.
- `lines`: the lines kept, with their new absolute times (a line may be shortened, never sped up).
- `score`: `set/score_30.wav` / `set/score_15.wav`, the soundtrack cut to length at bar-aligned points with short
  crossfades, and where its sections now fall.
- `text` and `end_card` in the new timeline.
Cut like an editor making the official spots: keep the hook, the product's best moments and the
payoff; keep the source's pace (the average shot length should stay close to the measured one). The
15 s cut is the 30 s cut tightened (hook, one proof, payoff, end card), not a separate film.

Only the shots the cuts use need the full per-shot fields, set sheets and boards. Other source shots
keep their measured fields and a one-line `action`.

## Ingredient set

Sheets are made with `bin/img` from source frames, but the subject is shown **off the shot framings**:
on a neutral background or as a wide empty establishing view. That way the set fixes identity and
place, not composition. Composition comes from the boards.
- `char_<name>_sheet.png`: front, three-quarter and profile head-and-shoulders, plus full body, on
  light grey. One person per sheet. `char_<name>_wardrobe.png` when the outfit changes.
- `product_<name>_sheet.png`: front, three-quarter, side and top views on light grey, every
  distinctive part named in the prompt.
- `loc_<name>.png`: each place empty and wide. **Match the film's look:** same light, same darkness,
  and no haze, smoke or grade the film doesn't have.
- `voice_<name>.wav`: a clean 10-20 s clip of each speaking voice, for timbre (from `bin/dissect`'s turns).
- `lines/Lnn.wav` + `lines.json`: the film's recorded lines, one clip per line, cut from the source at
  phrase boundaries, with absolute start/end and word times. This is the film's voice recording, like
  the score: a presenter take uses its line as `guide_audio`, so the pace and the cut points hold.
  Generated speech runs 10-20% slower than a real read and breaks the line times. A new film swaps
  these for its own recorded or generated lines and keeps `lines.json` as the timing target.
- `ui_<screen>.png`: every screen, card and panel shown in the film, drawn flat and full-size with its
  exact copy and layout, plus the product images, app icons and logo it uses. Screens described only in
  words get redesigned from scratch. `ui.json` gives each screen's scroll positions, taps and zooms by time.
- `score.wav`: the film's soundtrack. Real productions cut to a track, so the score is an ingredient.

## Numbers, not adjectives

- **Sizes come from the boards.** Measure `subject_in_frame` and text size on the board itself, as % of
  frame width and height, so words and board never disagree.
- **Motion has numbers:** start and end scale or position, duration, easing (linear, ease-out, spring)
  for every push, pan, morph, flip, pop and wipe. Say how to build a compound move from takes (e.g.
  "two takes joined by a 6-frame whip; a dark foreground pass hides the join").
- **Post graphics are exact:** typeface feel and weight, size, tracking, angle, position in %, and the
  words of every label, etch, lower third and end card.
- **One render mode per shot that actually works.** First-frame plates and reference-plus-voice don't
  combine (reference mode ignores the first frame). For a locked presenter setup, say which mode holds
  the framing (first frame + guide audio) and what to do if it drifts.
- **No refusable references.** If a screen or prop evokes a franchise, the sheet must already be a
  generic, generatable version of it; test it with `bin/img` before shipping.

## Storyboards

One sketch per shot, made with `bin/img` from that shot's middle frame:

```
bin/img --out templates/<id>/boards/s05.png --image dissection/frames/<stem>_s05.jpg --prompt \
  "Rough storyboard sketch of this frame: loose grey pencil lines on white paper, simple shapes only, no
   shading detail, no faces' features, no text or logos. Keep the exact composition: where everything
   sits, its size in frame, the horizon and the camera angle."
```

For a shot with a camera move or a big change, also sketch its start and end (`s05a.png`,
`s05b.png`) from frames you extract at those times. Look at every board. If it has drawn
photographic detail, redo it rougher.

## Rules
- No other company's name, logo, film, team or app in the template. Describe screen content
  generically, e.g. "a dark sci-fi film: an armoured figure with a red energy blade". A franchise
  name gets refused by the image model and leaks a brand. Meta's own branding is fine.
- Lines: exact words and absolute times from the transcript. Say whether each is on-camera speech,
  voice-over or a sung lyric.
- Use the measured numbers. Words like "dark" or "fast" go next to the number that pins them down.
- Check before finishing: every shot has every field, every set id exists in `set/`, every board
  exists, and every line in `lines.json` has its clip.
