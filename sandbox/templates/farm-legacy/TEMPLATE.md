# farm-legacy: an old farmer hands the farm to his daughter

## The film

A 60 s heritage spot (2026 big-game ad for a snack brand, here `{BRAND}`), 29 shots, average 2.07 s.
At golden hour an old farmer sits on his porch with his grown daughter and turns the farm keys over
in his hand: "So I've been thinking, might be time to hang it up." She asks for "one last time.
Together." A soft piano-and-voice cover of a well-known ballad enters on the cut to the field. One
last season, from planting to harvest, father and daughter side by side, is intercut with her
childhood on the same land through then/now pairs: planting now, then a white sun-flash into the same
furrow decades ago; a snack from the `{BRAND}` bag on a red pickup's tailgate, then the same two on the
same spot with the dog grown old. At harvest a potato is held up to the sky. She leads him into the
dark barn ("One more thing."), where the lights snap on to his retirement party. That night, back on
the same porch and in the same over-the-shoulder setups as the opening, he presses the keys into her
hand: "It's your farm now." She cries, they hug, the old dog lies at their feet, and a super says the
potatoes are grown by generations of farmers. End card over the crop rows at sunset.

## Arc

| Act | Shots | Time | What it does |
|---|---|---|---|
| The ask | 1-5 | 0.00-13.92 | dawn aerial, porch wide, keys insert, two over-the-shoulders; four lines, near silence |
| The last season | 6-20 | 13.92-38.43 | song enters; planting to harvest intercut with then/now memories |
| The surprise | 21-24 | 38.43-45.49 | "One more thing." -> dark barn -> lights on: retirement party |
| The handover | 25-28 | 45.49-57.91 | night porch: keys into her hand, "It's your farm now.", tears, hug, super |
| End card | 29 | 57.91-60.08 | aerial over the rows at sunset, badge, tagline, final chord |

## Rules that make it this film

1. **Quiet before the song.** Act 1 is dialogue and room tone only (-55 to -63 dB) with a soft piano
   creeping in from 6.8 s. The song enters on the cut to the field (swell 13.4-13.9, singer 14.20).
   Never put music under the first line.
2. **His first lines are never on his lips.** L01 plays over the aerial and L02 over the porch wide
   (his face is 2% of the frame) and the keys insert. Only "Okay, kiddo." and "It's your farm now."
   are seen being said. The daughter's ask is on camera, in a held over-the-shoulder.
3. **Bookend.** The handover reuses act 1's porch and its two over-the-shoulder setups (85 mm,
   same sides), at night: golden 62-78 becomes blue-and-lamp 36-48. The keys of shot 3 come back in
   shot 25.
4. **Then/now in the same frame.** Each memory pairs with a present shot of the same place and
   pose: planting (6 -> 7, through a white sun-flash), tailgate (10 -> 11, same camera position and
   lens, same `{BRAND}` bag). Memories are warmer and softer, under hazy cream skies.
5. **The product lives in the family, not in a pack shot.** The bag appears only in the two
   tailgate shots, label to camera, eaten from; the crop (potatoes) is the hero: pulled from the
   ground and raised to the sky (18-19). The brand appears again only on the end card.
6. **Restraint.** Natural motivated light, locked or gently handheld cameras, no slow motion, no
   effects beyond the one flash, no sound effects beyond the keys. Performances are small: a
   glance, a smile, then real tears at the end.
7. **Lines sit in the song's gaps.** "It's your farm now." has the song to itself (a piano-only gap
   47.3-50.3); the final sung phrase lands on the porch wide and the final chord on the end card.

## Score

`set/score.wav` is the film's soundtrack with the spoken lines taken out (vocal/music separation;
the singer stays, the dialogue is cut from the vocal stem where it stands alone; L05 overlaps the
singer and stays in). Line clips are placed on top at their times, unity gain, so the reference
plays like the source. The song is a slow piano-and-voice ballad cover, female voice, ~85 bpm and
rubato: beats drift from 0.63 to 0.86 s, so `bin/template beats` (172 bpm on a fixed grid) is off by
up to 0.3 s; the cuts join on the measured downbeats listed in `sound.downbeats`. Sung phrases: 14.20
(phrase 1), 19.7-24.62 (2), 25.2-35.6 (3-4), 35.56-41.5 (5, with L05), 42.0-47.26 (6), the piano gap
47.3-50.28, 50.28-53.36 (7), 53.84-56.86 (the title hook), final chord 57.04, silence from 59.61.

## cut30 (30.00 s, 16 shots, average 1.88 s, median 1.83 s)

Arc: hook (dawn, porch, keys: "So I've been thinking, / might be time to hang it up.") -> the ask
(over-the-shoulders, the piano swells) -> the last season (planting now/then through the flash, the
tailgate then/now with the `{BRAND}` bag, the harvest) -> the handover (keys, "It's your farm now.",
the hug) -> the porch wide with `{SUPER}` and the end card. The surprise party (21-24, L05) is dropped.

| n | from | time | src | setup | what |
|---|---|---|---|---|---|
| 1 | 1 | 0.00-1.45 | 0.000-1.450 | EST_AERIAL_DAWN | dawn aerial; L01 over it |
| 2 | 2 | 1.45-3.58 | 1.795-3.925 | PORCH_WIDE_DAY | the two on the bench; L02 starts |
| 3 | 3 | 3.58-5.04 | 4.760-6.220 | KEYS_INSERT_DAY | keys in his palm; jingle on the hand |
| 4 | 4 | 5.04-8.07 | 7.725-10.755 | OTS_DAUGHTER_DAY | L03 "How about one last time? Together." |
| 5 | 5 | 8.07-10.12 | 11.819-13.869 | OTS_FATHER_DAY | L04 "Okay, kiddo." |
| 6 | 6 | 10.12-12.87 | 13.907-16.657 | FIELD_PLANTING_NOW | planting now; song in; bloom on the last 2 frames |
| 7 | 7 | 12.87-14.70 | 16.664-18.494 | FIELD_PLANTING_THEN | through the white flash into the memory |
| 8 | 10 | 14.70-16.53 | 21.049-22.879 | TAILGATE_THEN | red pickup, girl, puppy, `{BRAND}` bag |
| 9 | 11 | 16.53-17.90 | 22.887-24.257 | TAILGATE_NOW | same spot now, bag in her lap, old dog |
| 10 | 18 | 17.90-19.19 | 34.205-35.495 | HARVEST_LOW | she pulls a potato plant |
| 11 | 19 | 19.19-20.73 | 35.500-37.040 | POTATO_RAISE | a potato raised to the sky |
| 12 | 25 | 20.73-21.85 | 45.523-46.643 | KEYS_HANDOVER_NIGHT | keys pressed into her hand |
| 13 | 26 | 21.85-23.40 | 48.071-49.621 | OTS_FATHER_NIGHT | L06 "It's your farm now." |
| 14 | 27 | 23.40-25.60 | 50.620-52.820 | OTS_DAUGHTER_NIGHT | tears, the hug |
| 15 | 28 | 25.60-27.83 | 54.002-56.232 | PORCH_WIDE_NIGHT | hug on the bench, dog; `{SUPER}` fades in |
| 16 | 29 | 27.83-30.00 | 57.928-60.098 | END_CARD_FIELD | end card; `{SUBLINE}` fades in |

Score segments (source): 1.19-6.58, 9.37-24.71, 47.29-49.96, 53.48-60.08; joins at 5.39, 20.73, 23.40 (the last two on picture cuts). Lines: L01 clip at 0.57 (speech 0.63-1.48), L02 clip at 2.72 (speech 2.78-4.03), L03 clip at 5.12 (speech 5.53-7.79), L04 clip at 8.75 (speech 8.81-9.51), L06 clip at 22.24 (speech 22.30-23.08).
Text: `{SUPER}` in 25.79, full 26.46, out 27.83; end card 27.83-30.00, `{SUBLINE}` fades in 28.20-28.60.
Flash: bloom from 12.80 on shot 6, cut 12.87, peak 12.93-13.05, settled 13.35.

## cut15 (15.00 s, 8 shots, average 1.88 s, median 1.90 s)

Arc: the 30 tightened: the ask as the hook ("Might be time to hang it up." / "How about one last
time? Together." / "Okay, kiddo."), the tailgate then/now with the bag as the one proof, the handover
line as the payoff, the porch wide with `{SUPER}`, the end card.

| n | from | time | src | setup | what |
|---|---|---|---|---|---|
| 1 | 2 | 0.00-1.80 | 2.923-4.723 | PORCH_WIDE_DAY | L02 "Might be time to hang it up." |
| 2 | 4 | 1.80-4.83 | 7.725-10.755 | OTS_DAUGHTER_DAY | L03 |
| 3 | 5 | 4.83-6.82 | 11.903-13.893 | OTS_FATHER_DAY | L04; swell just before the cut |
| 4 | 10 | 6.82-8.10 | 21.425-22.705 | TAILGATE_THEN | memory with the bag; singer enters |
| 5 | 11 | 8.10-9.29 | 22.929-24.119 | TAILGATE_NOW | now with the bag |
| 6 | 26 | 9.29-11.54 | 47.403-49.653 | OTS_FATHER_NIGHT | L06 "It's your farm now." |
| 7 | 28 | 11.54-13.00 | 54.963-56.423 | PORCH_WIDE_NIGHT | `{SUPER}` already full; final chord |
| 8 | 29 | 13.00-15.00 | 57.928-59.928 | END_CARD_FIELD | end card; `{SUBLINE}` fades in |

Score segments (source): 7.1-16.39, 47.29-49.96, 57.04-60.08; joins at 9.29, 11.96 (the first on the picture cut, the second is the final
chord landing 0.42 s into the porch wide). Lines: L02 clip at 0.29 (speech 0.35-1.60), L03 clip at 1.88 (speech 2.29-4.55), L04 clip at 5.43 (speech 5.49-6.19), L06 clip at 10.35 (speech 10.41-11.19). Text: `{SUPER}` full 11.54-13.00;
end card 13.00-15.00, `{SUBLINE}` fades in 13.37-13.77.

## Ingredient set

| id | file(s) | fixes |
|---|---|---|
| char_father | char_father_sheet.jpg, char_father_wardrobe.jpg | invented farmer ~72, white beard, bald with white sides; 4 outfits (porch day, planting, tailgate, night) |
| char_daughter | char_daughter_sheet.jpg, char_daughter_wardrobe.jpg | invented woman ~42, dark low ponytail, olive skin; 4 outfits |
| char_young_father | char_young_father_sheet.jpg, ..._wardrobe.png | the farmer at ~35 (derived from char_father); planting and tailgate outfits |
| char_girl | char_girl_sheet.jpg, char_girl_wardrobe.jpg | the daughter at ~6 (derived from char_daughter); yellow rain jacket + boots, overalls |
| char_dog | char_dog_sheet.jpg | golden retriever as a puppy and at 12 |
| product_bag | product_bag_sheet.jpg | the `{BRAND}` bag (generic yellow "POTATO CHIPS" default) |
| product_potato | product_potato_sheet.jpg | a dug potato; a pulled plant with tubers |
| prop_keys | prop_keys.jpg | key ring with a plain sprout medallion |
| prop_pickup_then / _now | prop_pickup_then.jpg, prop_pickup_now.jpg | faded red 90s pickup with plaid blanket; dark modern pickup with dog bed |
| loc_* | farm_aerial, porch_day, porch_night, field_planting, field_planting_then, barnyard, potato_field, endcard_field | each place empty, at the film's brightness |
| ui_* | ui_super.png, ui_end_card.jpg, ui_end_card_badge.png, ui.json | super and end card, flat 1920x1080, with positions and timings |
| lines | lines.json, lines/L01-L06.wav | the six recorded lines with word times |
| voice_* | voice_father.wav, voice_daughter.wav | all the clean speech each has (3.6 s and 2.8 s: the film has no more) |
| score | score.wav, score_30.wav, score_15.wav | soundtrack minus the spoken lines; the two cuts |

## Render plan

- **Speaking shots (4, 5, 26):** first frame + guide_audio. The first frame is the setup plate made
  from the board, the character sheet and wardrobe, and the porch plate (day or night); guide_audio is
  the line clip (L03, L04, L06). Render 3-4 s and trim to the shot. Never use reference mode for
  these: it drops the first frame and the 85 mm over-the-shoulder framing drifts.
- **Voice-over lines (L01, L02):** no lip-sync. Shots 1-3 are picture-only clips; lay the clips in the
  mix at their times.
- **Picture shots:** first + last frame from the a/b boards (6, 18, 19, 25, 27, 28) or one plate
  plus a small move (1, 2, 3, 7, 10, 11). No speech, no readable text, no music in the clip.
- **Flash (shot 7):** in post, from `ui.json` `flash_into_memory`.
- **Super and end card:** composited in code from the `ui_*` files at the `ui.json` positions and times.
- **Mix:** the cut score from 0 s, the line clips on top at unity gain, nothing ducked.

## Slots

`{BRAND}` (bag and badge), `{PRODUCT}` and the crop, `{SUPER}`, `{TAGLINE}`, `{SUBLINE}`, `{LEGAL}`,
`{PARENT_LOGO}`; the cast (father and grown daughter, their younger selves, the dog); the farm; the
six lines (same lengths and beats); the song (same arc). Details in `template.json` `slots`.
