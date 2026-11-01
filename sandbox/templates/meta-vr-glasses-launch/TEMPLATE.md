# Meta launch film: director template (v2)

An 86-second launch film for VR glasses with a compute puck, 1920x1080 at 24 fps: 29 shots in 7 acts
(average 2.97 s, median 2.54 s). It opens out of black on three near-black product macros: the band
as a glowing horizon, the puck's mesh, and a lens waking up. A slow pull back reveals the floating
glasses and the name. Then come four lifestyle payoffs, and in each one the glasses turn an ordinary
place into something bigger:
- loft to cinema;
- cafe to workspace;
- airport gate to courtside;
- plane seat to theatre.

The film closes with an upright puck pulling back to the band, the floating hero with its cable,
and a bronze end card over the last lyric and silence. One song carries the whole cut. The only
on-camera line is "Hey Meta, play the movie." (25.90-27.90 s), and it runs across a cut.

## Arc
| Act | Shots | Time | Job |
|---|---|---|---|
| Tease and reveal | 1-4 | 0-20.63 | black -> macros -> centred hero + INTRODUCING / name |
| Cinema at home | 5-9 | 20.63-34.67 | hand takes the glasses, he puts them on and asks; a giant screen fills the loft |
| Design interlude | 10-11 | 34.67-39.42 | hinge macro, puck macro |
| Work and play in the cafe | 12-19 | 39.42-52.38 | keyboard, windows, icons, eye, POV, lifts the glasses, greets a friend |
| Sports anywhere | 20-22 | 52.38-62.29 | gate; a passer-by wipe turns it courtside; seats on the court |
| Sound and scale | 23-26 | 62.29-72.58 | profile, spatial audio rings, night flight, theatre |
| Hero and end card | 27-29 | 72.58-86.04 | puck pull back to the band, floating hero + name, end card |

## Rules that make it this film
- **Darkness is the brand.** Studio shots stay at brightness 2-59 (mostly 12-45). Shot 1 is almost
  black (2/11/26), and the reveal in shot 4 never gets above 25. The studio is a seamless black void
  with a low bronze glow and one warm light from behind. **No haze, smoke, dust or floor texture.**
  Lifestyle shots are soft, warm daylight (cafe 73-130), and the cinema and arena shots are dark
  (20-59). Grade every plate to the measured numbers in `template.json` before rendering.
- **Shot sizes are tight.** Macros fill the frame with one part: the band arc, the mesh, one lens,
  one hinge, the temple engraving. Never show the whole product in a macro. The whole product
  appears only in shots 4, 23 and 28.
- **Every act turns on the same beat.** The glasses go on and the space around him becomes bigger.
  The change happens inside one locked-off frame (the screen pops in, the windows fade, the gate is
  wiped away by a passer-by). It is never a camera move.
- **Camera restraint.** Mostly locked off or a slow push or pull. The only handheld shot is 20.
  Shot 27 is a pull back and rise from the upright puck, with the band rising into the foreground
  and a focus rack. It is not a tilt up the cable.
- **Sound.** `set/score.wav` is laid from 0 s and the cut follows it. The line starts on camera at
  25.90 s, 0.73 s before the 6/7 cut, and finishes over the back-of-head wide. The commentary is
  voice-over. The film ends on the last lyric, then 0.8 s of silence.
- **Text.** Small, white, widely tracked caps, one caption per feature shot, plain fades
  (0.4-0.45 s). Exact words, positions and in-times are in each shot's `text`. The layouts are in
  `set/text_*.png`.
- **Brand safety.** Screens show generic films and generic icons (`set/screen_film_*.png`,
  `set/ui_kit.jpg`). No other company's name, logo, team or app. Meta's logo and name are fine.

## Files
- `template.json`: the recipe. It covers the top-level look, the text style, the sound (music arc,
  speech and lyrics with absolute times), the set and the slots, and every shot's measured and
  directed fields.
- `set/`: the people, the product, the places, the screen content, the UI kit, the text design, the
  voices and the score.
- `boards/sNN.jpg`: the composition of each shot. `sNNa.jpg` and `sNNb.jpg` show the start and end
  frames for shots with a move or a big change (1, 3, 4, 5, 6, 7, 12, 14, 15, 18, 19, 21, 22, 27,
  28, 29).

## 30-second cut
What gets made: `cut30` in `template.json`, 30.0 s, 10 shots, average 3.0 s (the film's is 2.97 s). Every
field not listed in `cut30.shots` is inherited from the source shot it is built `from`.

| # | Time | From | Window (source s) | What it does |
|---|---|---|---|---|
| 1 | 0-2.00 | 3 | 9.85-11.85 | Hook: the lens wakes in the dark; fade from black 0.4 s; cut on the hit |
| 2 | 2.00-5.58 | 4 | 16.50-20.08 | End of the pull back; INTRODUCING on, the name fades in at 2.35 |
| 3 | 5.58-6.88 | 5 | 21.88-23.17 | The hand takes the glasses |
| 4 | 6.88-10.33 | 6 | 23.17-26.63 | He puts them on; "Hey Meta, play" on camera at 9.68 |
| 5 | 10.33-13.92 | 7 | 26.63-30.20 | "the movie." 10.82; the screen pops in 11.49-11.80 |
| 6 | 13.92-16.04 | 9 | 32.36-34.51 | 3D cinema, helmet pop-out; 3D & VR ENHANCED CINEMA |
| 7 | 16.04-20.38 | 21 | 53.86-58.18 | Gate; two body wipes (17.47-18.05, 18.22-18.70) to courtside; play-by-play |
| 8 | 20.38-22.54 | 22 | 59.17-61.33 | Seats on the court; IMMERSIVE SPORTS 20.61; "Got it." |
| 9 | 22.54-26.96 | 28 | 77.87-82.29 | Pull back to the floating hero; name at 23.57; 0.6 s dissolve 26.57-27.17 |
| 10 | 26.96-30.00 | 29 | 82.29-85.34 | SEE HOW IT FEELS 27.22 / SPRING 2027 27.87 over "Keep moving" |

**Arc.** The hook and reveal take 5.6 s. Then come two payoffs, each a place that becomes bigger: the loft
turns into a cinema, and the gate turns courtside. The hero and the end card close it. Left out: the cafe, the
design macros, the plane and the theatre.

**Sound.** Lay `set/score_30.wav` from 0 s at unity. It is `score.wav` cut at bar-aligned joins (111.5 bpm,
bar 2.153 s, 30 ms equal-power crossfades) at 3.43, 5.58, 13.90, 16.06 and 22.54 s. Every join keeps the
level the source has at that point. The muted title slot is refilled with music, so lay `set/lines/L02.wav`
("the movie.") on top at 10.80 s. Lines L01, L03 and L04 are already in the score. Use them as `guide_audio`
only (L01 for shot 4). Times and words: `cut30.lines` and `set/lines.json`.

**Gaps closed for the kept shots.**
- The band is warm mid-grey, never white. It measures #5F5954 (luma 85-95) in shot 4 and #A4A19B-#B5B4AE
  (luma 160-185, max 200) in shot 28. Colour chips are on `set/product_glasses_sheet.jpg`.
- The screen film is a generic, generatable commander in a hangar (`screen_film_scifi*.png`).
  The screen geometry, the pop-out helmet and the credit copy are drawn as layers:
  `set/ui_loft_screen_s07.png` and `set/ui_loft_screen_s09.png`, with timing in `set/ui.json`.
- Shots 7, 9 and 21 each have a step-by-step `build` (takes, layers, the wipe matte
  `set/fx_passerby_matte.jpg`, edge positions by time).

## 15-second cut
What gets made: `cut15` in `template.json`, 15.0 s, 5 shots, average 3.0 s (the film's is 2.97 s). It is the 30 s
cut tightened to hook, one proof, payoff and end card. Every field not listed in `cut15.shots` is inherited from the
source shot it is built `from`.

| # | Time | From | Window (source s) | What it does |
|---|---|---|---|---|
| 1 | 0-2.875 | 3 | 8.955-11.83 | Hook: the whole lens wake (dark rim, bloom 9.0-10.0, full); fade from black 0.4 s |
| 2 | 2.875-6.00 | 6 | 23.49-26.61 | He slides the glasses on, settles; "Hey Meta, play" on camera at 5.37, cut mid-line |
| 3 | 6.00-9.042 | 7 | 26.61-29.65 | "the movie." 6.51; the screen pops in 7.18-7.49, arms out 7.44; 1.55 s of cinema |
| 4 | 9.042-11.875 | 28 | 79.45-82.29 | The hero settles (65% -> 62% wide); the name is mid-fade at the cut, full at 9.99, out 11.59-12.04 |
| 5 | 11.875-15.00 | 29 | 82.29-85.41 | Dissolve 11.49-12.09 (the source's own); SEE HOW IT FEELS 12.14 / SPRING 2027 12.79 over "Keep moving" |

**Arc.** The lens wakes in the dark (hook). Then one proof, the loft: he puts the glasses on, asks, and the room
becomes a cinema. The whole product is seen once, as the payoff, with its name. The end card closes it. Dropped from
cut30: INTRODUCING (shot 4), the hand taking the glasses (5), the 3D close (9), the gate and the court (21-22).
Shots 2-3 and shots 4-5 are each one continuous stretch of the source.

**Sound.** Lay `set/score_15.wav` from 0 s at unity, and lay `set/lines/L02.wav` ("the movie.") on top at 6.4875 s.
The score is `score.wav` cut at two bar-aligned joins with 30 ms equal-power crossfades:
- 2.875 s: the quiet drone (source 10.59, before the beat drop) goes into the breath before the verse pickup
  (source 23.49). The jump is exactly 6 bars, so the song's beat and "I'll find another way" (2.94-4.79) arrive
  with the loft.
- 9.5875 s: the cinema swell's bar line (source 30.20) goes into the hero rebuild (source 80.00) on the beat.

"Keep moving" plays 11.79-13.99. The music then decays to silence at 14.85, with a 0.15 s fade. The picture cut
to the hero (9.042) is on the beat, 0.55 s before the music join. L01 is in the score: use it as `guide_audio` for
shot 2 only, placed 2.4125 s into the take (lips open 25.98 s in the source, 5.37 s here). Times and words are in
`cut15.lines` and `set/lines.json`.

**Gaps closed for the shots both cuts use (from the 30 s blind rebuild).**
- **The glasses are a sleek shield, not a headset.** The product lock in `set.product_glasses` gives the size: about
  3 cm deep, slim arms, worn like oversized wrap sunglasses. It also lists what to NEVER add: a strap, a face
  cushion, a goggle box or a brim. `set/char_man_glasses_on.jpg` shows them on his face (front, three-quarter,
  profile), and the glasses sheet carries the same note. Every worn shot and every product shot points to it.
- **Depth order in the loft.** In shots 7 and 9, the man and the sofa back stay in front of the floating screen and
  its pop-outs. The order is set in the builds and in `ui.json`, with the shape and place in
  `set/fx_loft_foreground_matte.jpg`; key the matte from your own plate. The arm pop-out now says to scale until the
  tips reach x 97% / 10% (about 1.3x), which removes the old 1.15x contradiction.
- **The end card is graded to the film.** `set/text_end_card.jpg` now measures mean luma 46 (the film reads 42-48),
  so use it as is.
- **The sofa colour is one value.** The loft sofa is a muted sand-tan boucle: #5B4C36 in shot 6's daylight and #27180E
  on the dim sofa back of shot 7. The sheet and the text now agree; it is not cream and not orange caramel.
