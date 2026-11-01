# animal-icons: two animals grow up on a ranch

## The film

A 60 s big-game spot (36 shots, average 1.67 s, median 1.61 s, 2.20:1 letterbox) told with animals only and one
song. A newborn draft foal on a working ranch finds a downy eaglet under a fallen log. In a night storm the foal
goes out and stands over it; the band crashes in on the shelter. Seasons pass: tracks side by side in the snow,
the young eagle riding the running yearling and falling off its first flights. Then the time jump: the grown
horse charges out of the mist and rears against the sun while the adult eagle spreads its wings behind it, so
for one beat the horse has wings. The eagle lifts off the horse's head and flies. A glass of golden lager glows
on a fence rail at sunset, a hand sets the can beside it, the tagline builds. On the porch the old rancher, can
in hand, is welling up; his friend asks "You crying?" and he says, flatly, "Sun's in my eyes." The eagle climbs
over the golden field and the end card fades in. No voice-over: the song tells the story.

## Arc

| Act | Source shots | Time | What it does |
|---|---|---|---|
| Meeting | 1-8 | 0-14.97 | foal meets eaglet; quiet rubato intro (-50 to -25 dB) |
| Storm | 9-12 | 14.97-22.11 | rain; the foal shelters the eaglet; band entry downbeat 19.67, first sung line 20.3 |
| Winter | 13-16 | 22.11-27.40 | tracks in the snow, the yearling on the farm |
| Lessons | 17-24 | 27.40-37.12 | young eagle rides the yearling, tries to fly, falls; ranchers watch |
| Grown | 25-32 | 37.12-50.22 | grown horse charges; winged-horse image (29); eagle flies off the horse |
| Product and tag | 33-36 | 50.22-60.06 | glass, tagline, porch joke, end card |

## Rules that make it this film

- **Animals carry the story; people appear once, at the end, for the joke.** No dialogue before 54.45 s.
- **Two animals, three ages each:** char_foal -> char_yearling -> char_horse (same white blaze and white
  feathered stockings at every age); char_eaglet -> char_young_eagle -> char_eagle. Keep the markings constant.
- **Low cameras.** Most animal shots are at the animal's eye level or below (10-60 cm off the ground), long
  lenses (85-135 mm feel) with shallow focus; the wides are locked off.
- **Light by season:** near-black barn with a bright doorway (23-24/255), golden backlight and lens flare in
  summer (90-145), cold teal storm (24-37), flat blue-grey snow (120-140), pink dusk (65).
- **Cut on the music.** Picture cuts are free, but the big beats land on the score: the band entry on the
  shelter, "free as a bird" over the first flight, "Won't you fly high" as the eagle lifts off the horse,
  "free bird" over the product.
- **The winged-horse image is the hero frame** (shot 29): shoot into the sun, the eagle hidden exactly behind
  the horse's withers, wings rising from 27% to 53% of the frame width.
- **Product is plain and warm:** one tapered glass of golden lager and one can on a weathered rail, golden
  valley behind, white bold serif supers that fade in 0.25-0.30 s and hold. The brand appears only on the can
  label and the end card.
- **The tag is deadpan:** a two-line setup and flat reply, the rancher never turns his head.
- **Letterbox:** 2.20:1 (black bars 103 px top and bottom in 1080). Positions in template.json are % of the
  picture inside the bars.

## Score

`set/score.wav` is the whole 60 s mix: a famous 1970s Southern-rock ballad in a slow re-recorded arrangement,
with the storm's rain under 15-22 s and the two porch lines at 54.45 and 56.35. The intro is rubato (~48 bpm,
chords G 1.10, D/F# 3.88, Em 6.1, F 11.0, C 13.1, D 15.14); the band verse is ~60 bpm (downbeats 19.67,
23.74, 27.47, 31.6, 35.5); the climax is 72 bpm (downbeats 39.61, 42.94, 46.27, 49.60, 52.93, 56.26, 59.59).
`bin/template beats` reports 145.75 bpm: that is the climax's eighth-note pulse, and its 1.647 s "bars" sit a
beat off the real downbeats, so the cuts below use the real downbeats and chord changes instead.

## cut30 (30.00 s, 19 shots, average 1.58 s)

Score: `set/score_30.wav` = source [0.00-5.55] + [15.14-27.47] + [47.94-60.06], 30 ms crossfades, 0.15 s fade
out. Joins at 5.55 (the D chord's decay into its next bar, rain enters with it) and 17.88 (verse downbeat after
"now" into beat 3 of the bar before "Won't you fly", a two-beat pickup). In the cut: band entry 10.08, sung
"'Cause I'm as free as a bird now" 10.71-17.83, "fly" downbeat 19.54, "free bird" 22.44-24.54, "You crying?"
24.39-25.09, "Sun's in my eyes." 26.29-27.14, end card 27.69, end 30.00.

| n | from | start-end | source | what |
|---|---|---|---|---|
| 1 | 1 | 0.00-1.50 | 0.00-1.50 | foal arrives in the bright barn doorway (silhouette) |
| 2 | 5 | 1.50-2.65 | 7.30-8.45 | eaglet's-eye view: foal's head turns to the lens |
| 3 | 7 | 2.65-4.30 | 10.35-12.00 | ground level: muzzle to the eaglet, then lifts away |
| 4 | 8 | 4.30-5.55 | 13.10-14.35 | dusk wide: foal and eaglet in the pasture |
| 5 | 9 | 5.55-6.80 | 15.14-16.39 | night rain: eaglet alone (rain starts on the score join) |
| 6 | 10 | 6.80-7.96 | 16.73-17.89 | foal peers out of the barn door at the rain |
| 7 | 11 | 7.96-10.42 | 18.06-20.52 | feathered legs step in around the eaglet; band hits at 10.08 |
| 8 | 12 | 10.42-11.85 | 20.60-22.03 | foal stands over it in the storm ("'Cause I'm as free") |
| 9 | 13 | 11.85-13.05 | 22.70-23.90 | winter tilt up to the yearling by the barns |
| 10 | 19 | 13.05-14.20 | 30.36-31.51 | young eagle flaps off the running horse and drops ("bird") |
| 11 | 22 | 14.20-15.20 | 34.26-35.26 | yearling canters with the eagle on its back |
| 12 | 27 | 15.20-16.20 | 40.38-41.38 | grown horse gallops at camera, backlit |
| 13 | 29 | 16.20-18.60 | 42.55-44.95 | the winged horse against the sun (score jumps at 17.88) |
| 14 | 31 | 18.60-19.80 | 46.30-47.50 | head-on run, eagle lifts off its head ("Won't you fly") |
| 15 | 32 | 19.80-21.00 | 48.40-49.60 | eagle flies toward the lens; legal line |
| 16 | 33 | 21.00-22.03 | 50.98-52.01 | hand holds the glass; {SUPER_1} |
| 17 | 34 | 22.03-24.37 | 52.09-54.43 | glass on the rail, can set down, {TAGLINE} ("free bird") |
| 18 | 35 | 24.37-27.16 | 54.43-57.22 | porch: "You crying?" / "Sun's in my eyes." (in sync) |
| 19 | 36 | 27.16-30.00 | 57.22-60.06 | eagle over the golden field; {BRAND} end card (in sync) |

Arc: hook (meeting, 0-5.55) / middle (storm, shelter on the band entry, growing up, the winged horse,
5.55-17.88) / payoff (flight, product, 17.88-24.37) / tag and end card (24.37-30.0).

## cut15 (15.00 s, 9 shots, average 1.67 s)

Score: `set/score_15.wav` = source [0.00-3.71] + [48.77-60.06]. One join at 3.71: the decaying first chord
slams into beat 4 of the climax with the bass walk-up; the picture cuts from the foal to the grown horse on the
same frame. "fly" downbeat 4.54, "free bird" 7.44-9.54, "You crying?" 9.39-10.09, "Sun's in my eyes."
11.29-12.14, end card 12.69.

| n | from | start-end | source | what |
|---|---|---|---|---|
| 1 | 1 | 0.00-1.25 | 0.00-1.25 | foal in the barn doorway |
| 2 | 5 | 1.25-2.35 | 7.32-8.42 | foal's head turns to the lens |
| 3 | 7 | 2.35-3.71 | 10.50-11.86 | muzzle to the eaglet |
| 4 | 29 | 3.71-5.41 | 43.00-44.70 | the winged horse (score slam at 3.71, "fly" at 4.54) |
| 5 | 31 | 5.41-6.31 | 46.40-47.30 | eagle lifts off the horse's head |
| 6 | 32 | 6.31-7.33 | 48.50-49.52 | eagle flies toward the lens |
| 7 | 34 | 7.33-9.37 | 52.39-54.43 | can set beside the glass, tagline ("free bird") |
| 8 | 35 | 9.37-12.16 | 54.43-57.22 | porch joke (in sync) |
| 9 | 36 | 12.16-15.00 | 57.22-60.06 | eagle over the field, end card (in sync) |

Arc: hook (they meet) / one proof (the grown pair: winged horse, flight) / payoff (product, tagline) / tag
and end card.

## Ingredient set

- Animals (sheets from source frames, off the shot framings): `char_foal`, `char_yearling`, `char_horse`,
  `char_eaglet`, `char_young_eagle`, `char_eagle`.
- People (invented, drawn from text only): `char_rancher` (late 50s, lean, tanned olive-brown skin, grey
  stubble, faded brown cap, plaid flannel over a white tee), `char_friend` (early 50s, stocky, ruddy, sandy
  beard, olive cap, tan bib overalls).
- Product (generic, no label art from the source): `product_glass` (plain tapered pint glass, golden lager),
  `product_can` (cream can, forest-green bands, gold {BRAND} wordmark, default HALVARD).
- Places (empty, the film's light): `loc_barn`, `loc_log_nest`, `loc_pasture_sunset`, `loc_storm_pasture`,
  `loc_winter_farm`, `loc_meadow`, `loc_log_field`, `loc_golden_field`, `loc_rail`, `loc_porch`.
- Text: `ui_super.png`, `ui_tagline.png`, `ui_endcard.png`, `ui_legal.png`, `ui.json` (positions and fades).
- Sound: `score.wav`, `score_30.wav`, `score_15.wav`; `lines/L01.wav`, `lines/L02.wav`, `lines/S35_take.wav`,
  `lines.json`. Each voice exists for under a second in the film, so the line clips are the voice reference.

## Render plan

- **Animal shots: first + last frame from plates.** Make each plate from the shot's board (`boards/sNN.jpg`,
  or `sNNa`/`sNNb` for the moving shots 5, 11, 13, 19, 29, 31, 32, 34, 36) composited with its `loc_` sheet and
  the animal sheets, at the shot's measured brightness. Keep markings identical across ages.
- **Shot 35: first frame + guide audio** (`lines/S35_take.wav`); never retime the take. If lips drift,
  re-render on the same first frame.
- **Shots 33-34:** first + last frame plates with the product sheets; supers composited from the `ui_` files.
- **Assembly:** cut to the `src`-derived durations in `cut30` / `cut15`, lay `score_30.wav` / `score_15.wav`
  under the whole cut (it already carries the lyrics, the rain and the two lines), add the letterbox bars.

## Slots

{BRAND}, {PRODUCT}, {SUPER_1}, {TAGLINE_1}/{TAGLINE_2}, {LEGAL}, {ANIMAL_A} (foal -> horse), {ANIMAL_B}
(eaglet -> eagle), {RANCHER}/{FRIEND}, {LINES} (setup + deadpan reply, keep lines.json timing), {PLACE},
{SCORE}. Defaults are in template.json `slots`.
