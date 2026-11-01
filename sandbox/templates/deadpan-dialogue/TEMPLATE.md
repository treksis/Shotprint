# Deadpan dialogue: the helpful answer that turns into an ad

**The film.** A 30-second deadpan comedy for an AI assistant, shot as a two-hander in an outdoor
calisthenics park on one sunny late afternoon, letterboxed 2.39:1. A skinny teen fails a pull-up,
drops off the bar and asks a huge, friendly trainer: "Hey, can I get a six-pack quickly?" The trainer
holds a long, blank beat (2.38 s) and then answers like a chatbot: "Perfect. That is a clear and
achievable goal." In the same warm voice, phrase by phrase, the answer slides into an ad read: "But
confidence isn't just built in the gym. Try {PITCH_PRODUCT}. The insoles that add one vertical inch
of height and help short kings stand tall. Use code {PROMO_CODE} for big discounts." The teen's
silent closes take every blow. The trainer freezes in a salesman grin, the music lands on a hard
downbeat, and two supers make the point: "There is a time and place for {SUPER_TOPIC}." over the
grin, then "{SUPER_PLACE} should not be one of them." over the teen staring flatly with his phone.
End card: {BRAND_MARK} {BRAND} / {TAGLINE} on a warm gradient, with a sung hook over it.

The trainer *is* the AI. The joke is that an assistant's helpful register and an ad's register
sound exactly alike. Nobody winks.

## The arc (source = cut30)

| Time | Shot | What happens | Sound |
|---|---|---|---|
| 0.00-1.70 | 1 HIGH_BAR | top-down: teen strains at the bar, sinks below it | ambience, grunt 1.50-1.97 |
| 1.70-5.67 | 2 TWO_SHOT | over the trainer's back: teen drops, steps in, asks | L01 3.85-5.62 |
| 5.67-10.08 | 3 TRAINER_MED | **2.38 s deadpan beat**, "Perfect.", "That is a clear and achieva-" | L02 8.05, L03 9.03 |
| 10.08-12.41 | 4 TEEN_CU | silent reaction; "...goal." "But confidence isn't just built" off-screen | L03 tail, L04 11.16 |
| 12.41-17.05 | 5 TRAINER_MED | "...in the gym. Try {PITCH_PRODUCT}. The insoles that add one vertical inch of-" | L04 tail, L05 13.61, L06 15.13 |
| 17.05-19.72 | 6 TEEN_CU | silent reaction; "height... and help short kings stand tall." off-screen | L06 tail, L07 17.92 |
| 19.72-25.53 | 7 TRAINER_CU | "Use code {PROMO_CODE} for big discounts." then a frozen grin; **music hit 22.97, super 1 at 22.93** | L08 20.10-22.78, music |
| 25.53-28.23 | 8 TEEN_MED | teen looks up from his phone, flat stare; super 2 | music |
| 28.23-30.03 | 9 END_CARD | wordmark + tagline | sung hook 28.62-29.66 |

## Rules that make it this film

1. **Two people, six camera setups, no camera moves.** Everything is locked off on sticks. Shots 3
   and 5 are one setup (TRAINER_MED), and so are shots 4 and 6 (TEEN_CU). Make one plate per
   setup and reuse it.
2. **Hold the silences.** The 2.38 s beat after the question and the pauses between the trainer's
   phrases (0.3-0.6 s, listed in `set/lines.json`) are the comedy. Never close them up or retime them.
3. **Lines run across cuts.** The trainer keeps talking over the teen's closes (shots 4 and 6) and
   cuts land mid-word ('achieva-|ble', 'built |in the gym', 'of |height'). The teen's closes are
   silent: mouth shut, eyes moving, one blink.
4. **One tone throughout.** The trainer's read is warm, measured and upbeat from "Perfect." to
   "big discounts." The turn to the ad must not be performed as a turn.
5. **Music only at the payoff.** The first 22.9 s are dialogue and room tone only. The track enters
   hard on a downbeat at 22.97, exactly as the grin freezes, and every later picture cut sits on a
   bar (25.53, 28.23).
6. **Supers are plain.** A cream book serif, one line, centred at the frame's optical centre, cut on
   and off hard, no animation.
7. **Look:** golden-hour backlight in every dialogue shot, teal and amber, soft lifted contrast,
   leaf bokeh on the closes, 2.39:1 bars on every shot including the end card. Picture-band brightness
   is about 130 for wides and mediums, 125 for the trainer close, 102 for the teen closes and 161 for the
   top-down sand.

## Render plan

- **Speaking shots** (2, 3, 5, 7): first frame = the setup plate; `guide_audio` = the cut's dialogue
  stem (`set/dialogue_30.wav` / `set/dialogue_15.wav`) trimmed to the shot's [start, end]. That stem
  holds silence where the shot is silent, so the beat and the grin hold come out still.
- **Reaction and picture shots** (1, 4, 6, 8, and cut15 shot 5): first + last frame from the plates,
  no speech. Lay the off-screen lines on in the edit.
- **Graphics** (supers, end card): composite from `set/ui_*.png` / `set/ui.json` with
  `set/font_serif.ttf`. Never ask a video model for text.
- **Mix:** `set/score_30.wav` (or `_15`) under the whole film, plus each line clip once at its
  `start`. The product name (L05) and promo code (L08) windows are muted in the clips; fill them
  with the new names in the trainer's voice (`set/voice_trainer.wav`) inside the same window.

## cut30 (30.00 s, 9 shots, average 3.33 s)

The source shot for shot, with the end card trimmed by 0.03 s. Score: `set/score_30.wav` = score.wav
0-30.00 (one segment). Supers 22.933-25.53 and 25.53-28.23, end card 28.23-30.00. All eight lines at
their source times.

## cut15 (15.00 s, 7 shots, average 2.14 s)

The 30 s spot tightened to hook, beat, one proof, payoff, end card:

| n | from | Time | Source | Change |
|---|---|---|---|---|
| 1 | 2 | 0.00-2.15 | 3.52-5.67 | teen already standing; the question whole (L01 at 0.27) |
| 2 | 3 | 2.15-3.81 | 6.89-8.55 | the beat cut to 1.16 s, then "Perfect." (L02 at 3.25); L03 dropped |
| 3 | 4 | 3.81-5.25 | 10.97-12.41 | silent teen close; "But confidence isn't just built" off-screen (L04 at 3.94) |
| 4 | 5 | 5.25-7.93 | 12.41-15.09 | "...in the gym. Try {PITCH_PRODUCT}." (L05 at 6.39); L06-L08 dropped |
| 5 | 7 | 7.93-10.53 | 22.93-25.53 | punch in to the frozen grin on the music hit, super 1 from the first frame; silent |
| 6 | 8 | 10.53-13.23 | 25.53-28.23 | teen, super 2 |
| 7 | 9 | 13.23-15.00 | 28.23-30.00 | end card |

Score: `set/score_15.wav` = score.wav 15.00-30.00 (one segment, no join). It is room tone to 7.97,
then the music from its first downbeat, untouched to the end (downbeats 7.97, 10.58, 13.18 against
picture cuts at 7.93, 10.53, 13.23). Speaking shots keep picture and voice on one offset, so lip sync
holds.

## Slots

`{BRAND}`, `{BRAND_MARK}`, `{TAGLINE}`, `{BRAND_COLOUR}` (end card); `{SUPER_TOPIC}`, `{SUPER_PLACE}`
(supers); `{QUESTION}` (L01); `{PITCH_PRODUCT}`, `{PROMO_CODE}` and the pitch lines L02-L08 (keep
their shape and durations); the cast, the places and the music. Defaults and windows are in
`template.json` → `slots`.

## Set

`char_teen_sheet.jpg` and `char_trainer_sheet.jpg` show invented people; `loc_park_rig.jpg`,
`loc_park_field.jpg` and `loc_sand_pit_high.jpg` are the places; `voice_teen.wav`,
`voice_trainer.wav`, `lines/L01-L08.wav` + `lines.json`, `dialogue_30.wav` and `dialogue_15.wav` are
the voices; `score.wav`, `score_30.wav` and `score_15.wav` are the soundtrack; `ui_super_1.png`,
`ui_super_2.png`, `ui_end_card.jpg`, `ui.json` and `font_serif.ttf` are the graphics. Boards
`boards/s01-s09.jpg`, plus start/end sketches for shots 1, 2 and 8.
