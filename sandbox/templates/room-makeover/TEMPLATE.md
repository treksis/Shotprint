# Room makeover: parent visits, room transformed

**The film.** A 30 s comedy spot for a home-furnishing store. A mother bursts into her daughter's new dorm
room ("I finally get to see your new place.") and finds a dark, bare basement room: a mattress on the
concrete, a lamp that won't stay on. The daughter defends it ("It's a vibe."). The lamp dies, the music
stops dead, and in the silence the daughter offers the store's name as a question and the mother says
it back as the answer. She orders on her phone in three taps while an announcer promises ease and
convenience. The film whips onto a cringe-worthy family photo being hammered into place, then cuts back
to the same wide on the same room, now warm, sunlit and colourful. The daughter groans "Mom,", the
mother answers "It's a great photo." and knocks her hammer in triumph. The end card sits over the
made-over room.

## The arc
1. **Arrival (0.00-3.84).** Doorway two-shot, handheld, excited mother and proud daughter.
2. **The bare room (3.84-13.85).** Locked wide of the gloomy room (brightness 52-56). Two-shot reactions and a flickering lamp insert alternate. Ends on 1.5 s of dead silence after the lamp dies (12.79) and the music stops on the bar (13.26).
3. **The turn (13.85-16.14).** "{BRAND}?" / "{BRAND}." The music slams back on the downbeat with the answer (14.91). The phone comes out.
4. **The order (16.14-20.98).** Close-up on three app screens (product, bag, pick up) under the announcer. Then a whip-in on the photo being hung.
5. **The reveal (20.98-24.15).** The SAME wide, now made over (brightness 87; the insert by the window is 112). Then the photo joke and the hammer.
6. **End card (24.15-30.0).** The made-over wide holds under "Shop online ... at {URL}". URL and legal come in at 26.13 and the logo swings in at 26.21-26.38.

## The rules that make it this film
- **Before and after are one camera.** ROOM_WIDE (shots 2, 5, 7, 11, 13) is a single locked plate. The after room is an edit of the before plate (`set/loc_room_after.jpg` was made from `set/loc_room_before.jpg`), so the walls, window, doorway and water-heater tank line up exactly. Only the dressing and the light change. The reveal works because nothing else moves.
- **Darkness is a number.** Before scenes sit at 32-56 of 255, after scenes at 87-112. Don't lift the before scenes and don't let the after scenes bloom.
- **The lamp is the set-up and the payoff.** The old drum lamp flickers (shots 2, 4, 7) and dies at 12.79. The app sells a lamp (product page). The new yellow gooseneck lamp stands next to the mother in shot 12.
- **Silence is the joke.** The score drops out on a bar (13.26) and comes back on a downbeat (14.91), 0.05 s before the mother says the brand name. Keep both edges on the bar.
- **Comedy is in the faces and the lines, not the camera.** Moves are small and handheld, the wides are locked, and every cut is a hard cut except the whip into the photo (0.17 s).
- **Dialogue rhythm.** Every speaking shot is built from its line clip (`set/lines/`, the source's own timing). Speaking shots render as first frame + guide audio. The brand name is a slot: L06, L07 and L08 are silent clips that mark exactly where it goes.
- **Screens are composited.** The three app screens are flat `ui_` sheets in a neutral black-and-white style. Their switches and taps follow `set/ui.json`.
- **No source branding.** The store, its colours, its product names and its web address are all slots ({BRAND}, {URL}, product names on the ui sheets). The school on the sweatshirt is a generic crest with the word "UNIVERSITY".

## Setups
DOOR_ENTRY (1), ROOM_WIDE (2, 5, 7 before; 11, 13 after), TWO_SHOT (3, 6, 8), LAMP_INSERT (4), PHONE_INSERT (9), PHOTO_INSERT (10), CORNER_MED (12).

## The 30 s cut (cut30)
All 13 source shots at their source times. The last shot is trimmed from 30.03 to 30.00. The average shot is 2.31 s and the median 1.46 s. All twelve lines stay at their source times. The score is one segment, 0-30.0.

| # | from | time | what |
|---|---|---|---|
| 1 | 1 | 0.00-3.84 | doorway: "I finally get to see your new place." / "Ta-da!" |
| 2 | 2 | 3.84-7.47 | bare-room wide: "Not what I was expecting." |
| 3 | 3 | 7.47-8.88 | two-shot: "It's a vibe." |
| 4 | 4 | 8.88-9.93 | the lamp flickers |
| 5 | 5 | 9.93-11.05 | wide: "And..." |
| 6 | 6 | 11.05-12.39 | two-shot: "...you're sleeping here?" |
| 7 | 7 | 12.39-13.85 | wide: the lamp dies; music stops at 13.26 |
| 8 | 8 | 13.85-16.14 | two-shot: "{BRAND}?" / "{BRAND}."; the music returns at 14.91; the phone comes out |
| 9 | 9 | 16.14-19.73 | phone: product, bag, pick up (VO L09) |
| 10 | 10 | 19.73-20.98 | whip onto the hung photo, two hammer taps |
| 11 | 11 | 20.98-23.06 | after-room wide: "Mom," / "It's a great photo." |
| 12 | 12 | 23.06-24.15 | the mother by the new lamp knocks the hammer |
| 13 | 13 | 24.15-30.00 | after wide + end card (VO L12) |

## The 15 s cut (cut15)
The 30 s cut tightened to hook, problem, turn, proof, payoff and end card: 7 shots, 2.14 s average.

| # | from | src | time | what |
|---|---|---|---|---|
| 1 | 1 | 0.00-3.84 | 0.00-3.84 | arrival, L01 and L02 at source times |
| 2 | 2 | 3.84-6.40 | 3.84-6.40 | bare room, L03 |
| 3 | 4 | 8.88-9.80 | 6.40-7.32 | lamp flicker; the music cuts out at 6.662 (bar join) |
| 4 | 8 | 13.92-16.142 | 7.32-9.542 | "{BRAND}?" 7.662, music back on the downbeat 8.311, "{BRAND}." 8.362, phone out |
| 5 | 9 | 16.142-18.082 | 9.542-11.482 | phone: product page, then the 'Add to bag' tap, then the bag; VO L09s "turn to the ease and convenience of {BRAND}." 9.70-11.56 |
| 6 | 10 | 19.73-20.98 | 11.482-12.732 | whip onto the hung photo, hammer taps |
| 7 | 13 | 25.95-28.218 | 12.732-15.00 | made-over wide; end card in at 12.912; the music's final button and decay |

The score is cut on bars (145.5 bpm, bar 1.649 s) into four segments: 0-6.662, 13.26-18.208, 19.858-21.507 and 28.105-29.846. The joins fall at 6.662, 11.61 and 13.259. Shots 4-5 and 6 share their score segment's source offset, so the music stop, its re-entry and the hammer taps stay in sync with the picture.

## Ingredients
- **Cast** (invented people): `char_mom_sheet`, `char_mom_wardrobe`, `char_daughter_sheet`, `char_daughter_wardrobe`.
- **Voices**: `voice_mom.wav`, `voice_daughter.wav`, `voice_announcer.wav`.
- **Places**: `loc_room_before`, `loc_room_after` (same camera), `loc_doorway_before`, `loc_corner_after`.
- **Props and products**: `prop_old_lamp_sheet`, `product_desk_lamp_sheet`, `product_room_set_sheet`, `prop_photo_sheet` (the photo and the hammer).
- **Screens and end card**: `ui_product`, `ui_bag`, `ui_fulfil` and `ui.json`, plus `ui_endcard`.
- **Lines**: `lines/L01-L12.wav` and `L09s.wav`, with times in `lines.json`.
- **Score**: `score.wav`, `score_30.wav`, `score_15.wav`.

## Unsure
- L04 is most likely "It's a vibe.", but one transcription pass heard "It's a lot."
- L08 is a third, muttered brand-name read. It may be the announcer's lead-in rather than the mother.
- The source's after wides sit about 8% tighter than its before wides. This template locks both to one plate on purpose.
