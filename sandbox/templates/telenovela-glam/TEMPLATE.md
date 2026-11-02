# telenovela-glam: Telenovela Lip-Gloss Parody

## The film

The source is a 124 s big-game cosmetics spot from 2026, cut as a telenovela parody (52 shots, average 2.37 s, median 1.94 s). It opens on the brand's TV-badge ident ("{BRAND} presents"). At night a comedic leading lady drives while the car radio announces tonight's "world's biggest reggaeton show". She blurts "I don't speak Spanish!", the radio says "...unforgettable", headlights flood the cab, the camera snap-zooms in and she screams. Soap-opera opening credits run on crimson satin. She wakes in a pastel hospital room. The heartthrob doctor, mock-grave, uncaps a lip gloss as the plot twist: "Normally, I wouldn't do this, but you need juicy lips so you can roll those R's." A melodramatic speech-therapy montage follows, with swoons and a jealous rival doctor. One more coat of gloss and she turns into a gold-lamé diva who nails "Cheese, fire, cheese, fire!" while the whole hospital dances. On the title card she kisses the gloss under her own silver script name. The rival steals it ("It's mine!" / "To be continued..."), and the film ends on the ident.

**Names and language.** The brand, the star, the heroine's name and the product are slots: `{BRAND}` (default *rosabel*), `{HEROINE}` (default *Marisol*) and `{PRODUCT}` (a generic square lip-gloss vial with no label art). The shipped `set/score.wav` and line clips have the brand word and every spoken name muted. Some of the dialogue is Spanish ("presenta", "Normalmente", the practice words "Queso, fuego"). **Every line is given in English as its line text, with the source timing**, and `set/lines.json` notes the original language. The cast are invented people (`set/char_*`), not the actors.

## The arc

Ident, then the setup and the problem in one radio exchange. The crash is the hook. The product arrives as a soap-opera plot twist. The proof is the impossible words said perfectly. The payoff is spectacle (gold, a dance party), then a product title card and the ident.

## Rules that make it this film

1. **Play it straight-faced melodrama.** Sets are glossy and pastel, the beauty light is flattering, and performances are big but sincere. The jokes come from the stakes, not from mugging.
2. **Use melodramatic camera only at the beats.** There is one snap zoom (the crash, shot 4: 100 -> 300% in 0.8 s with shake) and one hair-whip turn (shot 43). Everything else is locked off or gently pushed. Build snap zooms as a post push on a held take, or ask H3 for the camera move.
3. **Make the product the hottest pink in every frame.** Show it as an insert (uncapping), a macro on the lips (doe-foot wand gliding) and the kiss on the title card. It never has a label.
4. **Stack the telenovela grammar.** Use the TV-badge ident, the crimson satin title with silver chrome script writing on, the heartthrob in an open-collared white coat with a gold chain, and the rival in the doorway (outside the cuts).
5. **Keep the sound native.** Lines are mixed into the score with music under them, and they sit at the measured times. Speaking shots are rendered with **first frame + guide_audio** from their line clip. Never retime a take.
6. **Grade to the measured numbers.** The car at night sits at 30-37 (the headlight flash reaches 73). The hospital, physio room and lobby sit at 85-145. The title card is crimson at 55-70. Ident cards are black with a crimson glow at 31-41.

## Setups (reusable plates)

CARD_IDENT (shots 1, 52) · CAR_FRONT (2, 4) · CAR_SIDE (3) · GLOSS_INSERT (14) · BED_OTS (15) · DOCTOR_MCU (16) · LIPS_MACRO (17) · PHYSIO_MCU (43) · LOBBY_HANDHELD (44) · LOBBY_WIDE (45) · TITLE_CARD (49).

## cut30: 30.0 s, 13 shots (average 2.31 s)

| # | from | time | src | what |
|---|---|---|---|---|
| 1 | 1 | 0.00-2.27 | 0.00-2.27 | Ident: striped TV shapes merge into the {BRAND} badge, "PRESENTS". VO "{BRAND} presents." |
| 2 | 2 | 2.27-5.41 | 2.27-5.41 | Through the windshield at night, she smiles at the radio: "Get ready for the world's biggest reggaeton show." |
| 3 | 3 | 5.41-8.78 | 5.41-8.78 | Side view: "I don't speak Spanish!" (6.62-7.72). |
| 4 | 4 | 8.78-10.05 | 8.78-10.05 | Headlights, snap zoom, scream. |
| 5 | 14 | 10.05-13.03 | 36.66-39.64 | Insert: the doctor uncaps the gloss. "Normally, I wouldn't do this," |
| 6 | 15 | 13.03-14.40 | 39.64-41.01 | Over the shoulder: wand to her lips, she puckers. |
| 7 | 16 | 14.40-17.07 | 41.01-43.68 | Doctor MCU: "...juicy lips so you can roll" |
| 8 | 17 | 17.07-18.87 | 43.68-45.48 | Lips macro, gloss glides on. "...those R's." |
| 9 | 43 | 18.87-23.10 | 93.48-97.71 | Hair whip into gold diva: "Cheese, fire, cheese, fire!" (20.54-22.19) |
| 10 | 44 | 23.10-24.24 | 99.79-100.93 | Handheld lobby dance. |
| 11 | 45 | 24.24-25.18 | 100.93-101.88 | Wide dance party. |
| 12 | 49 | 25.18-27.79 | 110.23-112.84 | Title card: she kisses the gloss, "{HEROINE}" script writes on, sung name VO. |
| 13 | 52 | 27.79-30.00 | 121.18-123.39 | End card: {BRAND} TV badge. |

Score: `set/score_30.wav`, built from segments [0-10.052] [36.661-45.531] [93.531-97.705] [99.791-101.878] [110.226-112.835] [121.183-123.46], with 30 ms crossfades and trimmed to 30.0 s. The joins land at 10.052, 18.922, 23.096, 25.183 and 27.792. 36.661 and 121.183 are pickup beats one beat before a bar (115 bpm). Every other join is on a bar start.

## cut15: 15.0 s, 6 shots (average 2.5 s)

| # | from | time | src | what |
|---|---|---|---|---|
| 1 | 3 | 0.00-3.10 | 5.68-8.78 | Radio "...going to be a..." / "I don't speak Spanish!" |
| 2 | 4 | 3.10-4.38 | 8.78-10.05 | Snap zoom, scream. |
| 3 | 14 | 4.38-6.98 | 36.66-39.27 | Gloss uncapped: "Normally, I wouldn't do this..." |
| 4 | 43 | 6.98-10.64 | 93.53-97.18 | Gold diva: "Cheese, fire, cheese, fire!" |
| 5 | 49 | 10.64-12.72 | 110.23-112.31 | Title card kiss and script name. |
| 6 | 52 | 12.72-15.00 | 121.18-123.46 | End card. |

This is the 30 s cut tightened: it drops the ident opener, the application shots and the dance. Score: `set/score_15.wav`, with segments summing to exactly 15.0 s.

## Ingredient set

- **Cast:** `set/char_heroine_sheet.jpg` and `set/char_heroine_wardrobe.jpg` (looks: 1 car cardigan, 2 hospital gown, 3 gold lamé, 4 blush ruffle title blouse), `set/char_doctor_sheet.jpg` and `set/char_extras_sheet.jpg`.
- **Product:** `set/product_gloss_sheet.jpg`.
- **Places:** `set/loc_car_night.jpg`, `set/loc_hospital_room.jpg`, `set/loc_physio_room.jpg`, `set/loc_hospital_lobby.jpg` and `set/loc_title_backdrop.jpg`.
- **Graphics:** `set/ui_shutter.jpg`, `set/ui_presents_card.jpg`, `set/ui_endcard.jpg` and `set/ui_title_script.jpg`.
- **Sound:** `set/lines/L01-L08.wav` and `set/lines.json` (word times), `set/voice_heroine.wav`, `set/voice_doctor.wav`, `set/voice_announcer.wav` (only 4.8 s of clean announcer speech exists), `set/score.wav`, `set/score_30.wav` and `set/score_15.wav`.
- **Boards:** one per kept shot in `boards/`, with a/b sketches for shots 1, 4, 14, 43, 49 and 52.
