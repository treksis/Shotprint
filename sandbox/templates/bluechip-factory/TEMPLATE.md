# Template: bluechip-factory (founder interview with factory B-roll)

117.28 s, 1920x1080, 23.98 fps, 53 shots (average 2.21 s, median 1.96 s), hard cuts only. One founder
talks almost without stopping from 1.74 s to 102.40 s. The picture keeps cutting away from him to
archive, product, hands and the field while he keeps talking, and comes back to him for the lines that
carry the argument. The recipe is `template.json`: shots, lines with exact times, setups, sound and
look. The ingredient set is in `set/` and the composition of every shot is in `boards/`.

## The film in one paragraph

In a dark electronics assembly hall with cyan-blue benches, a founder in a loud floral shirt under a
black work jacket says his country built the first electronic computer to win a war. Black-and-white
1940s archive proves it. Then he says "we gave it away": the hardware is made abroad, and that is
"insane". The thesis is split across two cameras ("If you don't control your technology, / you can't
control your future"). He says "Now, we're bringing it home. This is {PRODUCT}", sweeps his arm toward
the bench, and the film cuts to a rugged tan-and-bronze laptop lit like jewellery in black. Workers'
faces and gloved hands show it being built ("knows how to extract, knows how to refine..."). The film
goes outside, where the laptop is set on a hard case in oak woodland, opened, typed on and carried,
intercut with his bench demo. A fast macro assembly montage climbs to the music's peak. A laser then
etches "DESIGNED IN CALIFORNIA / BUILT IN AMERICA" into the laptop's underside while he says "This is
America's birthright. It's time to bring silicon back to the valley." The film ends on a black card.

## Arc

| Act | Shots | Time | Job |
|---|---|---|---|
| Cold open | 1-3 | 0.00-6.13 | symmetrical establishing wide; the claim pre-laps, then lands on camera |
| Heritage archive | 4-10 | 6.13-18.60 | B/W 4:3 archive in a black surround, voice-over only |
| The loss | 11-15 | 18.60-33.95 | interview rig, three angles; the music drops 5 dB |
| The stakes | 16-20 | 33.95-47.71 | "That's insane", then the conditional thesis split across two cameras |
| Turn and reveal | 21-26 | 47.71-58.22 | "bringing it home / This is X"; an arm gesture cuts to the product in black |
| Proof: made here | 27-33 | 58.22-77.58 | workers and gloved hands, one "knows how to" per cut; bench demo; tight close-up |
| Proof: the field | 34-42 | 77.58-94.34 | daylight woodland intercut with the bench demo |
| Mission montage | 43-49 | 94.34-104.15 | cuts of about 1.2 s, the music builds to its peak |
| Payoff | 50-52 | 104.15-114.28 | laser etch over two angles, then the label is revealed |
| End card | 53 | 114.28-117.28 | black, small brand mark, the music tails off to silence |

## Rules that make it this film

1. **The voice never stops and the cut decides who you see.** Each line has exact words and
   absolute times in `lines[]`. Record or render each line once, place it on the timeline once, and
   cut the picture around it. 34 of the 53 shots carry his voice while he is off screen. Cuts land on
   phrase breaks: the thesis is split at its comma (s18 to s19), and the proof list puts one
   "knows how to" on each cut (s28-s31).
2. **A fixed interview rig.** Every presenter shot comes from one of these setups and never mixes
   them: CAM_A_WIDE (35 mm, he stands at the left third with the bench running diagonally to the
   right), CAM_B_OFFAXIS (85 mm f/1.8 from his left, eyeline to screen-right, light handheld float),
   CAM_C_FRONTAL (50 mm, chest-up), CAM_D_TIGHT (one face close-up, s33) and CAM_E (the bench demo).
   The interviewer sits camera-right. Shots alternate A/B/C and never cut A to A. The pushes are
   small, 2-4% over a shot.
3. **The rhythm.** Interview shots run 1.8-4.5 s. Archive and assembly shots run 1.0-2.0 s. The
   mission montage runs about 1.2 s per shot. The etch is the longest picture in the film (4.67 + 2.33 s),
   and the end card holds for 3 s.
4. **Proof through hands.** "Made here" is never said without being shown: profiles in safety
   glasses, white knit gloves, fingertips seating cables. Workers never look at the lens.
5. **The product enters late (50.84 s, 43% of the way in) and is lit like jewellery:** a black
   void, a rim or top light, gloved hands and slow moves. It sits at 18-44 brightness in black and
   rises to 81 in the hero tilt. Outdoors it is shown in daylight at 78-111.
6. **The payoff is physical, not a slogan card.** The claim is laser-etched into the product letter
   by letter, about 8 letters per second. These are the only words on screen apart from in-world
   signs and the end card. There are no supers, captions or lower-thirds.
7. **The sound.** It is one dry voice over one ~122 BPM electronic bed (`set/score.wav`). The music
   carries the shape: it drops at 18.6 for the loss, hits an accent at 34.0 on "That's insane", swells
   48-53 into the reveal, builds 94-104 to its crest on the cut into the etch, and drops at 106 under
   "birthright". There is no ambience or foley. The only effect is a faint laser sizzle.
8. **Restraint.** This is a documentary interview, not a pitch. Hands stay low with small open-palm
   beats. There is one smile (s41). The voice is conversational conviction and never rises into hype.
   Practical light only, no haze, no flares. The laser spark is the only glow in the film.

## 30-second cut

This is what gets made: `cut30` in template.json. It runs 30.00 s, 15 shots at 2.00 s average against the source's 2.21 s, with hard cuts only. The whole arc survives: claim, loss, thesis, turn, reveal, made here, the etch payoff and the end card. Every shot inherits all of its fields from the source shot it is built from (`from`); only the window and the duration change.

| # | Time | From | Setup | Line (cut30 time) |
|---|---|---|---|---|
| 1 | 0.00-1.87 | s01 | EST_AISLE | L01 pre-laps at 0.94 |
| 2 | 1.87-3.95 | s02 | CAM_A_WIDE | L01 lands, ends 3.92 |
| 3 | 3.95-5.60 | s08 | ARCHIVE_STILL (4:3 in black) | L04 "Then we gave it away." as voice-over 4.30-5.28 |
| 4 | 5.60-7.75 | s18 | CAM_B_OFFAXIS | L10 5.79-7.53 |
| 5 | 7.75-9.59 | s19 | CAM_C_FRONTAL | L11 8.11-9.49 |
| 6 | 9.59-11.80 | s21 | CAM_B_OFFAXIS | L13 9.98-11.40 |
| 7 | 11.80-12.72 | s22 | CAM_A_WIDE, arm sweep | L14 "This is {PRODUCT}." 12.02-12.76 |
| 8 | 12.72-15.81 | s23 | PRODUCT_HERO_HANDHELD | L15 13.36-15.76 |
| 9 | 15.81-16.81 | s26 (first 1.0 s) | PRODUCT_BENCH_LOW | none |
| 10 | 16.81-17.93 | s44 | ASSY_THROUGH_FRAME | L21 "{PRODUCT} is America's comeback." 16.20-17.62 |
| 11 | 17.93-19.31 | s46 | ASSY_TOPDOWN | none, the music builds |
| 12 | 19.31-23.21 | s50 (first 3.9 s) | ETCH_MACRO_DIAGONAL | L23 22.04-23.12 |
| 13 | 23.21-25.54 | s51 | ETCH_MACRO_FLAT | L24 24.29-25.71, "valley" crosses the cut |
| 14 | 25.54-27.50 | s52 (first 1.96 s) | ETCH_PLATE_REVEAL | none |
| 15 | 27.50-30.00 | s53 | END_CARD | none |

- **Lines.** `set/lines/Lnn.wav` holds the founder's own recordings, clean, with word times in `set/lines.json`. Use each clip as the `guide_audio` of its presenter shot (first frame on the setup plate, then guide audio). Place it at its `clip_cut30` time and never retime it. The source's product name is muted inside L14 and L21; fill exactly that window with the new name made from `set/voice_founder_clean.wav` (see "Sound mix, product name and textures" below).
- **Score.** `set/score_30.wav` is already cut to 30.00 s. Lay it from 0.0 at unity. It has five joins, each on the 122.05 BPM beat grid with an error of 2 ms or less, crossfaded over 40 ms. It enters full on the archive cut (3.96) and steps up on the cut into the montage (15.81). It crests exactly on the cut into the etch (19.31), drops at 21.56 under "birthright" and tails off under the end card. Laid at unity with the lines and run through the master limiter (below), the mix measures -18.1 LUFS; the source is -18.0.
- **Presenter sizes, measured.** Keep these numbers; earlier rebuilds framed tighter.
  - CAM_A: head height is 20% of frame height, with the head centred at 43% x and the frame cutting at mid-thigh.
  - CAM_B: head height is 40%, with the head at 26-47% x.
  - CAM_C: head height is 45% and the hair touches the top edge. It is near frontal: about 15 degrees off the lens axis toward screen-right, not a three-quarter view.
- **The etch is big and rotated.** Use `set/ui_etch_diagonal.jpg`, `ui_etch_flat.jpg`, `ui_label.jpg` and `ui_end_card.jpg`. Positions and timings are in `set/ui.json`, and the typeface is `set/font_etch.ttf`.
  - In s50 the two-line block is rotated 32 degrees clockwise, so its baselines run down to the right. The letters are 6.6% of frame height, and the spark writes 8.5 letters per second.
  - In s51 the block is near straight-on, with 8% letters. AMERICA sits at the lower right and the flag is etched last.
  - Boards s50, s50a, s50b and s51 are drawn from the same geometry.
- **Do not** cut two shots from the same setup in a row. The archive still at shot 3 exists to break B from B.

## 15-second cut

This is the 30 s cut tightened: `cut15` in template.json. It runs 15.00 s, 8 shots at 1.88 s average (median 1.85 s) against the source's 2.21 s (median 1.96 s), hard cuts only. The arc is hook, reveal, one proof, payoff, end card. The claim, the loss and the mission line are dropped. Every shot inherits all of its fields from its source shot (`from`); only the window changes. Shots 3-7 are the same takes as cut30 shots 7, 8, 11, 12 and 13, trimmed, so one set of renders serves both cuts.

| # | Time | From (source window) | Setup | Line (cut15 time) |
|---|---|---|---|---|
| 1 | 0.00-2.10 | s01 (last 2.10 s: 0.57-2.67) | EST_AISLE | L10 "If you don't control your technology," pre-lap voice-over 0.14-1.88 |
| 2 | 2.10-3.94 | s19 (whole) | CAM_C_FRONTAL | L11 "you can't control your future." 2.46-3.84, to lens |
| 3 | 3.94-4.86 | s22 (whole) | CAM_A_WIDE, arm sweep | L14 "This is {PRODUCT}." 4.16-4.90 (crosses the cut by 0.04) |
| 4 | 4.86-7.95 | s23 (whole) | PRODUCT_HERO_HANDHELD | L15 "American designed, American built." 5.50-7.90 |
| 5 | 7.95-9.33 | s46 (whole) | ASSY_TOPDOWN, the one proof | none; the build climbs |
| 6 | 9.33-11.33 | s50 (first 2.00 s: 104.15-106.15) | ETCH_MACRO_DIAGONAL | none; cut on the crest |
| 7 | 11.33-13.18 | s51 (last 1.85 s: 109.30-111.15) | ETCH_MACRO_FLAT | L24 "It's time to bring silicon back to the valley." 11.93-13.35 |
| 8 | 13.18-15.00 | s53 (first 1.82 s) | END_CARD | "valley" ends 0.17 s into the card |

- **Hook.** The wide opens the spot as in the 30 s cut, but it carries the thesis instead of the heritage claim. L10 sits over the wide as a pre-lap, 0.58 s ahead of L11 (its source gap), so L11 lands on CAM_C exactly as in the source and he says "future" almost to lens. Shot 2 is the 30 s cut's shot 5 unchanged.
- **Reveal.** The arm sweep and hero tilt are unchanged from the 30 s cut. The score's swell hits at 5.21, 0.35 s after the cut to the product.
- **One proof.** The top-down gloved hands seating the bronze rail, 1.38 s, no line. The build enters one bar before the crest (7.30, under "built"), so the music leads the picture into the proof.
- **Payoff.** The cut into the diagonal etch lands on the music's crest (hit 9.26, cut 9.33: the source's own 70 ms). Hold the diagonal until IN CALIFORNIA is complete (11.13) plus 0.20 s. The flat etch opens with BUILT / IN already etched and the spark on the first A. AMERICA is written by 12.38, and the flag's top stripes have started by the cut (the flag never finishes in this cut). The push in s50 covers only its first 2 s: scale 1.000 -> 1.026.
- **End card.** It cuts in at 13.18 under the last word and holds 1.82 s while the score's own end-card tail decays. The score fades out by 15.00.
- **Lines.** Use five clips from `set/lines/` (L10, L11, L14, L15, L24) at their `clip_cut15` times in `set/lines.json` (word times have `cut15` too). The presenter shots use the same guide-audio rule as the 30 s cut.
- **Score.** `set/score_15.wav` is already cut to 15.00 s in three segments. Lay it from 0.0 at unity.
  - 0.00-7.30: the reveal swell (src 45.89-53.19), with a 0.25 s fade-in.
  - 7.30-13.28: the last bar of the build, the crest and the drop (src 102.12-108.10).
  - 13.28-15.00: the source's own end-card tail (src 114.02-115.74), with a 0.5 s fade-out.
  - Both joins are on bar lines of the 122.05 BPM grid, with 40 ms equal-power crossfades. At the first join, the swell's last two hits sit one beat (-16 ms) and one eighth (+6 ms) before the build's first onset. The second join stops 20 ms before the downbeat hit at src 108.12, so that hit is never heard, and comes in three bars later in the tail.
  - With the lines at unity and the master limiter, the mix measures -17.8 LUFS with a -1.0 dBFS peak.
- **Do not** add the label shot (s52) or any super. {PRODUCT} is heard once (L14) and is not shown on screen in this cut.

## Sound mix, product name and textures (both cuts)

- **Balance: lines and score both at 0 dB.** The line clips and score files are cut from the master's own separated stems, so unity is the source balance. The source never ducks the music. While he speaks, the voice runs a median 5.6 dB over the music (400 ms windows; 10th percentile -5.2 dB at the accents and the crest, 90th +14.3 dB in the drops). Per line, voice minus music: L10 -0.5, L11 -6.7, L14 +9.5, L15 +1.0, L24 +8.3 dB (all lines are in `sound.mix`).
- **Overs: limit the master, never the score.** The source is peak-normalised to -0.05 dBFS with only a light limiter. The voice alone peaks at -0.4 dBFS (L24) and -0.5 dBFS (L15). When a cut lays a line on a louder bar than its own, the sum goes over 0 dBFS: +1.4 dBFS at 5.7-6.2 s and 12.1-12.8 s in cut15, and +1.5 dBFS in cut30. A score cut of -6 dB still peaks at +0.5 dBFS and breaks the balance. Instead, sum in float and run one peak limiter on the master: ceiling -1.0 dBFS, attack 5 ms, release 50 ms, no makeup gain (`alimiter=limit=0.891:attack=5:release=50:level=false`). Details are in `sound.mix_rule`.
- **The product name.** `set/voice_founder_clean.wav` is 15.68 s of his voice with no music under it (noise floor -74 dBFS). Use it as `ref_audios` (with the founder sheet as `refs`) to render the whole line with the new name, then cut the name at its word edges.
  - The name must fit its slot without a speed change: L14 0.50 s (0.30-0.80 in the clip), L21 0.44 s.
  - Match the muted original's level: -21.9 dBFS RMS in L14 and -17.1 dBFS in L21.
  - `voice_founder.wav` has the score bed under it, and a render copies that bed. Don't use it for generation.
- **Etch texture.** Numbers are in `look.etch_texture`, and the spark's look is in `set/fx_etch_spark.jpg`.
  - The slate is static: no animated grain, no flicker. In s50 a shallow focus band runs along the text and the corners fall soft.
  - The spark is a white-hot core 1.1-2% of frame width with a small blue-white bloom.
  - It draws stroke by stroke and jumps between strokes in one frame. In s51 two or three heads are often lit at once.
  - In s50 a faint amber vapour trails up and to the right, about 15% of the frame width long.
  - No particles, smoke or flare streaks.
- **Archive texture.** Numbers are in `look.archive_texture`. The 4:3 window is 693x508 px at 1280x720, with a black surround.
  - The newsreels (s04-s07) flicker gently (brightness std 1 level), with animated grain and +-1 px of gate weave.
  - The stills (s08-s10) are completely frozen, with their own coarse print grain baked in. Add no grain, flicker or weave to them.

## Look

Low-key and contrasty. The interview and factory shots measure 38-53 brightness (CAM_C and CAM_D
are the darkest, 33-40). The cool steel-grey and black are broken by three colours only: the
cyan-blue bench tops, the warm floral shirt, and the product's coyote-tan and bronze. Depth of field
is shallow on everything except the two wides. The archive is B/W inside a black 4:3 surround, at
42-86 brightness. The newsreels flicker gently and the stills are frozen (`look.archive_texture`). The field footage is warm, dappled, late-afternoon daylight.

## Ingredient set (`set/`)

| Id | File | Fixes |
|---|---|---|
| char_founder | char_founder_sheet.jpg | the presenter and only voice (a fictional stand-in of the source's type) |
| char_founder_wardrobe | char_founder_wardrobe.jpg | floral camp shirt, open black work jacket, white knit gloves (only in s32-s42) |
| char_worker_a / _b / _c | char_worker_*_sheet.png | the technicians in s27, s28 and s49, and s30, s31 and s44 |
| char_field_user | char_field_user_sheet.jpg | the operator outdoors (only his hands, forearms and legs are seen) |
| char_staff_wardrobe | char_staff_wardrobe.jpg | the factory uniform: black jacket with a print block on the back, gloves, wrist strap, glasses |
| product_laptop | product_laptop_sheet.jpg, product_laptop_open_sheet.jpg | the hero product, closed and open |
| product_parts | product_parts_sheet.jpg | chassis tray, bronze frame rail, copper heat spreader, flex cable, board |
| product_shell_plate | product_shell_plate.jpg | the blank underside for the etch (the text goes on in post) |
| prop_field_case | prop_field_case.jpg | the black hard case used outdoors |
| loc_factory_aisle | loc_factory_aisle.jpg | the assembly hall |
| loc_interview_station | loc_interview_station.jpg | the presenter's bench, for CAM_A, CAM_C and CAM_E |
| loc_rack_wall | loc_rack_wall.jpg | the dark background, for CAM_B and CAM_D |
| loc_field_woodland | loc_field_woodland.jpg | the oak woodland in daylight |
| loc_archive_artillery / loc_archive_computer_room | loc_archive_*.png | the B/W archive places |
| voice_founder | voice_founder.wav | 7.5 s of his voice (35.80-43.30), timbre only; it carries the music bed, so prefer set/lines for every kept line |
| voice_founder_clean | voice_founder_clean.wav | 15.68 s of his voice with no music (-74 dBFS floor): the reference for generating {PRODUCT} and new lines |
| lines | lines.json, lines/Lnn.wav | the 10 recorded lines of the 30 s cut (5 of them in the 15 s cut), clean, with word times and cut30 / cut15 times |
| score_30 / score_15 | score_30.wav, score_15.wav | the soundtrack cut to 30.00 s and to 15.00 s |
| fx_etch_spark | fx_etch_spark.jpg | the laser spark's look (blank slate, no letters) |
| ui | ui.json, ui_etch_diagonal/flat, ui_label, ui_end_card | exact etch, label and end-card layouts |
| fonts | font_etch.ttf, font_sans.ttf | Share Tech Mono and Inter (OFL) |
| score | score.wav | the film's own music, 117.3 s (side-channel stem) |

## Building it

- Presenter shots: render with first + last frame on that setup's plate, using a neutral end pose,
  and `guide_audio` set to the line's take. Keep the end plate's mouth relaxed and mid-word. Never
  retime a take.
- B-roll: render first + last frame from plates built out of the location and product sheets, using
  the `a`/`b` boards wherever there is a move (s22-s24, s27, s28, s32, s34-s36, s39, s40, s43, s45,
  s47, s49, s50).
- Archive: render the newsreel shots s04-s07 as B/W clips. Hold s08-s10 as still plates. Composite
  all of them into the black 4:3 surround in post.
- Text: composite in post the etch (tracked to a rendered spark), the label block in s52 and the
  end card.
- Lay the score from 0.0 at unity with the lines at unity (the voice runs a median 5.6 dB over it), and
  catch the overs with the master limiter (see "Sound mix, product name and textures").

## Slots

`{PRODUCT}` is spoken in L14 and L21 and etched in s52. `{COMPANY}` is spoken in L16 and L22 and
etched with `{YEAR}`. You can also swap the presenter and voice, the heritage archive subject, the
claim lines, `{BRAND_MARK}` and `{FINE_PRINT}`. Keep every time, setup, move and the music arc.

## Notes

- `bin/dissect` found 52 shots. Its shot 50 holds a low-contrast hard cut at 108.82, where a
  diagonal etch angle changes to a straight-on one. That shot is split here, so the film has 53
  shots and the later shots are renumbered.
- Line times come from transcribing each shot's window and are good to about +-0.15 s. The founder's
  stutters are cleaned except the deliberate restart "That's... that's insane".
- The source's own product and company names are replaced by `{PRODUCT}` and `{COMPANY}`.
