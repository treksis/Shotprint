# Travel escape: a groomed toy-doll hero books his way out

**The film.** A 30-second travel-app comedy set in a toy-miniature world. Everything is a real 1:6 doll
diorama shot like premium stop-motion: plastic dolls with sculpted hair and mouths that never move,
cotton-wool clouds, fabric clothes, warm golden-hour light. A wry deadpan narrator ("the voice in the
sky") tells the story. The hero (`char_hero`, default name {HERO} = Dex) is a plastic-perfect, overly
groomed holidaymaker. Over an empty sunset beach the narrator says "When every day feels the same, one
man wants more." The hero watches a {BRAND}-liveried plane through binoculars, lowers them and says "I
need an adventure." He books on his phone ("So {HERO} goes to {BRAND}. {TAGLINE}"), shouts a question
at the sky ("So if I book my flight now but my stay later?") and the narrator answers like an app
("Book now or add later. You still save."). Stop-motion packing, a plane seat ("Thanks, voice in the
sky."), a cloud wipe to a tea room, a pastel street, a horse ("Good horsey."), a rewards screen and a
free rental roadster ("In {HERO} math, it was free."), then a wrong-side-of-the-road gag ("Oh, mi scusi.")
and an aerial end card: "{BRAND}. {TAGLINE}".

## The arc (source = cut30)

| Time | Shot | Setup | What happens | Lines |
|---|---|---|---|---|
| 0.00-1.42 | 1 | BEACH_WIDE | empty sunset beach, translucent sky logo | L01 VO |
| 1.42-2.96 | 2 | BINOC_POV | branded plane through binoculars, dips dark | L01 VO |
| 2.96-5.21 | 3 | HERO_TOWER_LOW | snap pull-back as he lowers the binoculars | L02 hero, L03 VO |
| 5.21-7.92 | 4 | PHONE_POV_BEACH | hotel list scroll, phone drops out of frame | L03, L04 tagline VO |
| 7.92-10.42 | 5 | TOWER_WIDE_SKY | tiny on the tower, shouts at the sky | L05 hero |
| 10.42-12.92 | 6 | SUITCASE_TOPDOWN | stop-motion packing, case closes and stands up | L06 VO |
| 12.92-15.17 | 7 | PLANE_SEAT | thanks the sky; clouds pour in (wipe) | L07 hero |
| 15.17-17.04 | 8 | RYOKAN_WIDE | clouds clear, tea | L08 VO |
| 17.04-19.08 | 9 | STREET_WIDE | wheels the suitcase to a yellow house | L09 VO |
| 19.08-20.54 | 10 | PLAIN_WIDE | pats a horse | L10 hero |
| 20.54-22.13 | 11 | CAR_PHONE_MOUNT | rewards screen $144.92 | L11 VO |
| 22.13-23.75 | 12 | CAR_SIDE | driving, scarf flying | L12 hero |
| 23.75-25.88 | 13 | ROAD_WIDE | wide drive, cypress wipes past | L13 VO |
| 25.88-27.25 | 14 | CAR_FRONT | swerves back to the right lane | L14 hero |
| 27.25-30.00 | 15 | AERIAL_ENDCARD | logo, tagline write-on, brand-colour border | L15 VO |

## Rules that make it this film

1. **It is all toys.** Real-looking miniatures, never CG-smooth or human. The dolls' mouths never move: lines
   play over a still face with small head tilts and stop-motion steps.
2. **Two voices alternate with almost no gaps.** Narrator (deadpan, documentary) and hero (earnest). Lines
   run over cuts (L03, L05, L06, L09, L11, L12, L14 all cross a cut). Never retime the clips.
3. **Pace:** 15 shots in 30 s (average 2.0 s, median 2.04); every scene change is a hard cut except the
   cloud wipe (14.67-15.40) and the foreground cypress wipe inside shot 13.
4. **Brand colour everywhere.** {BRAND_COLOUR} (tangerine #F58220) on phone case, suitcase, plane, car,
   parasols and scarf; the corner bug sits top-left on every shot until the end card.
5. **Postcard compositions:** symmetrical wides (ryokan, street, plain), locked off; motion comes from
   stop-motion action, the car rigs and two short camera moves (the 0.25 s pull-back in 3, the phone drop in 4).
6. **Look:** warm pastel golden hour; exteriors bright (125-175), interiors and dusk darker (77-110).
7. **Music:** one upbeat 136 bpm bed (bar 1.765 s) from 1.1 s to the end; surf only before it.

## Render plan

- **Speaking shots** (3, 5, 7, 10, 12, 14): first frame = the setup plate + `guide_audio` = the line clip
  (`set/lines/Lnn.wav`) placed at its time in the shot; prompt says the doll's mouth stays still.
- **App screens** (4, 7 phone, 11): plates with a blank tangerine phone; composite `ui_app_list`, `ui_trip_added`,
  `ui_rewards` in post (corner-pin), scroll per `set/ui.json`.
- **Picture shots** (1, 2, 6, 8, 9, 13): first + last frame plates; binocular mask, cloud wipe and cypress pass are
  separate elements.
- **End card** (15): aerial plate push-in + graphics drawn from the `ui_endcard*` sheets.
- **Voice-over** lines are laid in the edit from `set/lines/` (muted windows re-recorded with {BRAND}, {HERO}, {TAGLINE}).

## cut30

The source shot for shot (it is 30.0 s). Score: `set/score_30.wav`, one segment 0-30.

## cut15 (hook, one proof, payoff, end card)

| New | From | Src | Lines |
|---|---|---|---|
| 0.00-2.25 | 3 | 2.96-5.21 | L02 0.14, L03 1.44 |
| 2.25-3.34 | 4 | 5.21-6.30 | L03 '{BRAND}.' |
| 3.34-5.64 | 6 | 10.62-12.92 | L06 3.42 |
| 5.64-7.89 | 7 | 12.92-15.17 | L07 6.42, cloud wipe |
| 7.89-9.04 | 8 | 15.17-16.32 | music only |
| 9.04-10.63 | 11 | 20.54-22.13 | L11 9.12 |
| 10.63-12.25 | 12 | 22.13-23.75 | L12 11.11 |
| 12.25-15.00 | 15 | 27.25-30.00 | L15 12.69 |

Score: `set/score_15.wav` = src 2.647-11.714 + 24.067-30.0, join on the bar at 9.067.
