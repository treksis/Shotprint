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
- `slots`: what a new film swaps (product, presenter, lines, places, text, end card).

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
- `voice_<name>.wav`: a clean clip of each speaking voice (from `bin/dissect`'s turns).
- `score.wav`: the film's soundtrack. Real productions cut to a track, so the score is an ingredient.

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
- Check before finishing: every shot has every field, every set id exists in `set/`, and every board
  exists.
