# Fan moments: a soft-drink spot for a big football tournament

**The film.** A 30-second soft-drink spot for a 2026 football tournament, 25 shots (average 1.20 s), letterboxed 1.85:1. A veteran commentator in a booth says "This is quite a game." Fans everywhere grip the drink and wait: an older man at home, green-nailed hands in a bar, two old men at a terrace table, a young man praying over his can. A whistle blows: "It'll be a free kick." The can is open, goosebumps rise, and then time stops inside the drink. A bubble drifts away in the dark, fizz rises, a single drop falls into a glass, and the sound drains to near silence for four seconds. The drop lands and everything slams back at once. A pupil snaps shut, and "Oh, what a goal!" plays over screams, roars, toasts, a bottle spraying foam, a can poured over a head, and bottles clinking at sunset ("Ecstasy, euphoria!"). Then the emotion overflows: a droplet running down the bottle cuts to a tear running down a cheek ("And emotion overflows."), a woman by the sea drinks with her eyes closed, the tagline comes up, and the can sinks under the brand lockup.

The drink is a **generic soft drink** ({BRAND}, default "SODA"): a deep red can (#B5121B) and a straight-walled clear glass bottle with a red label band, each carrying a plain white bold sans wordmark. All cast are invented people (`set/char_*_sheet.png`).

## Arc (source = cut30)
| Act | Time | Shots | What it does |
|---|---|---|---|
| The match | 0.00-9.88 | s01-s08 | Hook and tension: the call, fans clutching the drink, whistle, "It'll be a free kick." |
| The held breath | 9.88-14.22 | s09-s11 | Macro fizz in black voids. The sound drains from -13 to -45 LUFS. |
| The goal | 14.22-21.31 | s12-s20 | The drop lands on the slam (14.04), then eruption: "Oh, what a goal! Ecstasy, euphoria!" |
| Overflow | 21.31-26.40 | s21-s24 | Droplet cuts to tear, "And emotion overflows.", she drinks, tagline |
| End card | 26.40-30.03 | s25 | The can's shoulder sinks out of frame under the lockup |

## Rules that make it this film
1. **One voice drives it.** The commentator gives five short lines (set/lines.json), building from calm to almost sung. He is on screen only in s01, seen from behind with the mic hiding his mouth. Every other line is voice-over across the montage.
2. **Every person is touching the drink.** Before the goal, every fan shot shows a can or bottle held, gripped or prayed over, and nobody drinks. The drinking happens only at the end (s23-s24).
3. **Bodies react like the drink.** Goosebumps match the fizz, a pupil snaps as the drop lands, and a tear matches the condensation droplet (s21 cut to s22). Match the textures.
4. **The held breath is the film.** For 4 s (s09-s11) the sound drains to near silence over macro shots in near-black (11-17 of 255). The drop lands at 14.00 and the full mix slams in at 14.04. Keep that sync in every cut.
5. **Dark before, light after.** Before the goal: interiors at 30-64 of 255, warm practicals, teal shadows. After it: sun, street and sunset at 66-149. The only saturated colour is the product red.
6. **Fast and short.** Shots run 0.46-2.38 s with hard cuts only: no dissolves, no speed ramps (the slow motion is in camera), and no supers until the tagline.
7. **Close and shallow.** Mostly close-ups and macros on long lenses. Only s14, s19 and s20 open up to medium wide, and those are handheld.

## The cuts
Score cut points come from `bin/template beats` (152 bpm grid, bar 1.579 s). After 14.0 the music has no clear drum grid, so each join sits at a point where the sound already changes.

### cut30 (30.0 s, 25 shots): the whole film
Every source shot in order, at its source times; s25 is trimmed by 0.03 s. Score: `set/score_30.wav` = source 0-30.0. Lines L01-L05 at their source times. Tagline 24.48-26.40, lockup 26.40-30.0.

### cut15 (15.0 s, 14 shots): hook, tension, held breath, goal, drink, lockup
| # | From | New | Source | Note |
|---|---|---|---|---|
| 1 | s01 booth | 0.00-1.61 | 0.00-1.61 | L01 "This is quite a game." |
| 2 | s04 terrace hands | 1.61-2.93 | 4.77-6.09 | |
| 3 | s05 young fan prays | 2.93-3.97 | 6.09-7.13 | whistle 2.89, L02 3.22-4.26 |
| 4 | s06 can + gaze | 3.97-4.77 | 7.13-7.93 | |
| 5 | s07 can lid macro | 4.77-5.62 | 8.45-9.30 | the sound starts draining |
| 6 | s08 goosebumps | 5.62-6.20 | 9.30-9.88 | |
| 7 | s10 rising bubble | 6.20-6.95 | 11.30-12.05 | |
| 8 | s11 drop into glass | 6.95-7.91 | 13.27-14.22 | the drop lands on the slam at 7.725 |
| 9 | s12 pupil | 7.91-8.37 | 14.22-14.68 | L03 "Oh, what a goal!" 8.19-9.47 |
| 10 | s13 scream at sea | 8.37-8.96 | 14.68-15.27 | |
| 11 | s14 bar roar | 8.96-9.51 | 15.27-15.82 | |
| 12 | s23 she drinks | 9.51-10.27 | 23.72-24.48 | |
| 13 | s24 drink + tagline | 10.27-12.19 | 24.48-26.40 | tagline on |
| 14 | s25 end card | 12.19-15.00 | 26.40-29.21 | lockup |

Score: `set/score_15.wav` = source [0-1.614] + [4.772-7.93] + [11.087-15.824] + [23.719-29.21], 30 ms crossfades, 0.15 s fade-out. L04 and L05 are dropped.

## Making it
- **Ingredients:** set/ holds 11 invented cast sheets, a crowd wardrobe sheet, can, bottle and macro product sheets, 7 empty locations matched to the film's brightness, the lines and voice, the score cuts, and the two post graphics with their fonts. To redraw the graphics for a new brand, run `python3 templates/fan-moments/draw_ui.py templates/fan-moments/set <BRAND> "<TAGLINE>" "<PARTNER_LINE>" <#COLOUR>`.
- **Render modes:**
  - s01 uses first frame + guide audio (`set/lines/L01.wav`). The mouth is hidden, so the framing is what matters.
  - Every other shot is picture-only: first + last frame from plates.
  - Product macros (s07, s09-s11, s17, s21, s25) are built from the product sheets. In s11 the splash must land at 1.28 s into the shot.
  - Lay the score under the cut and keep the clips' own sound off, or very low. The voice is in the score.
- **Graphics:** composite `set/ui_tagline.png` over s24 and `set/ui_end_card.png` over s25. Both are 1920x1080 with alpha and use hard cuts, no animation.
- **Slots:** brand, brand colour, product, tagline, partner mark and line, commentator and lines, fans, places, and sport (see `slots` in template.json).
