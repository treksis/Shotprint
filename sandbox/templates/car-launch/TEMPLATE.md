# car-launch: performance sedan launch film

## The film
A 106 s launch film for a dark performance sedan, cut like a black-and-white mood piece that warms
into cold blue colour. It opens on nature in monochrome (sea swell, a breaking wave, a black cave),
then the car is revealed only in fragments of light in a black studio: a rim light along the roofline,
a glowing full-width rear light bar with the rear wing rising out of the dark, a gauge and an exhaust
tip. A headlight POV down an empty night street dissolves into an extreme macro of an eye. Studio
close-ups prove the aero parts (carbon wing, mirror caps, headlight blade). The score opens up into
night-city and misty-mountain driving, and the film ends on a tagline over a dusk valley and a black
brand end card. A low male narrator speaks a few spaced words over the score ("Discipline",
"Driven by resolute focus", "Refinement reveals precision").

## Arc
Elements (0-12) -> Reveal from black (12-26) -> Focus: street to eye (26-37) -> Refinement: aero
close-ups (37-47) -> Release: night city (47-62) -> Monochrome name beat (62-70) -> Mountain at
dusk (70-96) -> Title, tagline, end card (96-105.5).

## Rules that make it this film
- Black first. Studio shots sit at 2-30/255; the car is never fully lit, only traced by one rim or
  back light. Nature and studio are pure black-and-white; colour (cold blue-teal, red light bar,
  peach horizon) only arrives with the driving.
- Fragments, not the whole car: the light bar, the wing, a mirror cap, a headlight blade, a gauge.
- Cut on the score: hits land on bars (bar 1.836 s, from 0.517 s). Fast inserts (0.6-1.1 s) on the
  build, longer holds (2-5 s) under the VO.
- VO is sparse and spaced, captioned tiny at bottom-centre (1.4% of height). Text is otherwise only
  the tagline and the end card.
- Restraint in motion: locked-off or slow pushes/slides (1-5% of the frame per second); speed comes
  from tracking cars and the edit, never from shaky camera.
- {PRODUCT} is a generic unbadged matte-grey performance sedan (set/product_sedan_sheet.jpg): no
  maker badge, model name, plate text or wheel-centre mark anywhere.

## Cut 30 (30.0 s, 15 shots, score set/score_30.wav)
| n | time | from | what |
|---|---|---|---|
| 1 | 0-2.17 | S2 | sea swell, caption "Discipline." |
| 2 | 2.17-3.67 | S3 | breaking wave |
| 3 | 3.67-5.47 | S4 | black cave opening, slow push |
| 4 | 5.47-7.33 | S5 | studio side silhouette traced by rim light |
| 5 | 7.33-10.15 | S9 | rear light bar, wing rises out of black |
| 6 | 10.15-11.01 | S12 | gauge sweep -> exhaust tip (score hit) |
| 7 | 11.01-16.52 | S14 | headlight POV down empty street, dissolve to eye; VO "Driven by resolute focus" |
| 8 | 16.52-18.53 | S18 | rear lamp flick, slide along carbon wing; VO "Refinement reveals precision" |
| 9 | 18.53-19.65 | S19 | wing end plate on grey backdrop |
| 10 | 19.65-20.78 | S20 | carbon mirror cap |
| 11 | 20.78-23.28 | S27 | tracking headlight close-up, night bridge |
| 12 | 23.28-25.70 | S28 | front three-quarter on elevated highway, skyline |
| 13 | 25.70-27.05 | S34 | rear three-quarter chase, misty mountain road |
| 14 | 27.05-28.25 | S39 | valley aerial with {TAGLINE} |
| 15 | 28.25-30.00 | S40 | {BRAND} end card on black |

Score joins at 3.671, 11.013, 16.52, 22.027, 25.698 (segments 4.188-7.859, 17.037-24.379,
28.05-33.557, 37.228-42.735, 53.748-57.419, 99.637-103.939 of the source track).

## Cut 15 (15.0 s, 9 shots, score set/score_15.wav)
Sea (0-2.17, S2) -> wave (2.17-3.67, S3) -> rear light bar and rising wing (3.67-6.48, S9) ->
exhaust hit (6.48-7.34, S12) -> carbon wing (7.34-8.85, S18) -> headlight tracking on night bridge
(8.85-11.01, S27) -> mountain chase (11.01-12.21, S34) -> tagline over valley (12.21-13.57, S39) ->
end card (13.57-15.0, S40). Score: 4.188-7.859, 20.708-24.379, 53.748-57.419, 99.637-103.624.

## Building it
Car shots: first + last frame from car plates made per location (product sheet composited into the
loc_* sheet, at the board's framing). Studio silhouettes and nature: stills with a slow push. Eye:
macro still of char_eye with a slow push. Tagline and end card: drawn in code (set/ui_*.png). The VO
is already in the score (in_score); a new film records its own lines to the times in set/lines.json.
