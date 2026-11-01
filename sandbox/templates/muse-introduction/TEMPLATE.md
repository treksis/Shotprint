# Muse introduction: app-launch motion film

An 82.5-second launch film for an AI-agent app, made entirely of motion graphics: kinetic type, floating chat UI and a small plush 3D mascot on bright off-white fields, cut to one upbeat 115 BPM pop/hip-hop track. There is no live action, no voice-over and no dialogue. The story is told in on-screen text and UI. The film opens on the app icon, which pulls back into a grid of everyday 3D objects. It names the product, then plays three short demos of the agent doing errands for the user (school supplies, a race sign-up, a flight rebooking). Between the demos come "AI that ___ for you" carousels, and it closes by mirroring the opening into a black end card. Measured: 37 beats, average 2.23 s, median 1.92 s. Brightness stays at 187-252 until the final black card (6-7).

## The 30-second cut

**This is what gets made.** 30.21 s, 24 fps, 725 frames, 14 shots (average 2.16 s, median 2.0 s; the full film averages 2.23 s). All of it is cut from the film's own beats; `cut30` in template.json has every shot, element time, line and cut point.

| # | Time | From | What changes |
|---|---|---|---|
| 1 | 0.00-2.12 | s1 | starts 0.21 s in (icon alone 0.66 s, then the pull-back into the object grid) |
| 2 | 2.12-4.25 | s2 | "Introducing / Muse" |
| 3 | 4.25-8.25 | s3 | "Muse [mascot] is / your [31] personal / AI [notebook] agent" |
| 4 | 8.25-9.88 | s4 | "A new / kind of AI", hard cut on its natural end |
| 5 | 9.88-13.50 | s19 | opens on a 0.71 s hold of the settled chat (avatar, bubble 1, typing dots), then the 10k question and "Yes, sign me up!" |
| 6 | 13.50-15.17 | s20 | browser task card rises, scrolls, expands into the browser |
| 7 | 15.17-18.21 | s21 | form fills and scrolls, browser rises, slow push to Submit |
| 8 | 18.21-19.26 | s22 | punch onto Submit, tap, wash to pale |
| 9 | 19.26-20.42 | s23 | "You're in." / "Let's gooo!!" |
| 10 | 20.42-21.63 | s24 | mascot runs on the treadmill in confetti (the one generated clip) |
| 11 | 21.63-24.79 | s25 | carousel: AI that tracks your goals / analyzes sleep / fills out forms / builds plans for you |
| 12 | 24.79-26.67 | s35 | "It's your Muse" shrinks into the closing object grid |
| 13 | 26.67-29.55 | s36 | AI that keeps you up-to-date / in the loop / in control |
| 14 | 29.55-30.21 | s37 | black end card: icon, "Muse", two generic badges, Meta logo |

**The arc in 30 s.** Hook: the icon and the object grid, the name and the category, while the track plays its opening hook (0-9.88). Middle: one demo only, the race sign-up, because it is proactive, ends on a tap and owns the chorus drop. The music falls into its stop under "A new kind of AI" and drops at **10.49**, 0.6 s after the chat appears. Breadth: carousel 2 restates the demo as four benefits. Payoff: "It's your Muse" closes the bookend with the opening grid, and the end card lands on the music's last hit at **29.55**.

**Score.** `set/score_30.wav` (-15.9 LUFS) is the soundtrack cut at two downbeats with 30 ms equal-power crossfades. At 8.39 the hook bar (source 8.60, right after the track's own 0.1 s gap) cuts into the last bar of the build (source 35.52), so the stop drop-outs fall at 8.88 and 9.63 and the drop follows at 10.49. At 25.08 the cut goes from chorus to chorus, 12 bars later (52.20 -> 77.20), at the same phrase position. In cut30 time the beats fall at 0.33 + k x 0.521 s across both joins. Lay it from 0.00 under the whole cut and never retime it. Inside each block, picture and score share one offset: cut30 = source - 0.21 (shots 1-4), - 27.125 (shots 5-11), - 52.125 (shots 12-14). So every pop in the shot list stays on its beat.

**Lines.** There is no speech. The only words heard are sung lyrics inside the score (`set/lines.json`, clips `set/lines/L01-L08.wav`): L01 "Game for the game with a brand new sauce..." 0.25-5.93, the count-in "...go, one two three, move it" 8.39-12.70, and "I got the sauce to make you go" once per bar 13.02-28.98.

**Sizes (measured on frames, as % of frame).** The old text sizes were about 0.6x too small. Headlines have a cap height of 9.5-10.5% H (about 150 px at 1080p). The carousel middle line is about 60 px. Wide chat text is 36 px (cap 2.4% H). Macro chat ("You're in.") is 80 px. Every kept shot now has `elements` (source time, cut30 time, box) and numbered moves in `camera_move`.

**UI.** Each kept screen is drawn flat at full size with its exact copy: `ui_chat_signup`, `ui_task_card`, `ui_browser_form` plus `ui_form_full`, `ui_submit_closeup`, `ui_chat_youre_in` and `ui_end_card`. `ui.json` gives the boxes, typing, scrolls, zooms and taps by time. `ui_assets_30.jpg` and `ui_emoji_sheet.jpg` hold the product images and emoji: sneaker, jogger, pie chart, girl runner, sleep mask, pen, the app icon tile and the idle and working avatars. `ui_meta_logo.jpg` is the Meta lockup. The store badges are generic ("DOWNLOAD / on mobile", "GET THE APP / on tablet").

**Render.** Everything is motion graphics except shot 10 (s24), an H3 keyframe clip from a `bin/img` first frame of the running mascot. Mute it.

**Word times.** Every word, emoji and chat line in the kept shots now has its own measured in time (`words_in` in `cut30.text` and `cut15.text`, and per-word `elements` in the shots). Titles build fast: "A new / kind of AI" pops one word per frame and is complete 0.17 s after "A" (at 8.71-8.88 in the source, not one word per half-beat). Shot 3 adds one word per 2 frames (6.04-6.29) and its emoji 0.5 s later.

## The 15-second cut

**This is the short spot.** 15.50 s, 24 fps, 372 frames, 8 shots (average 1.94 s, median 1.75 s). It is the 30 s cut tightened: hook, one proof, payoff, end card. `cut15` in template.json has every shot with its source frames, every word time, the lines and the score joins.

| # | Time | From | What changes |
|---|---|---|---|
| 1 | 0.00-2.17 | s1 | starts 0.17 s in, on the track's first note (icon alone 0.70 s), then the pull-back into the object grid |
| 2 | 2.17-6.21 | s3 | "Muse [mascot] is / your [31] personal / AI [notebook] agent"; opens one frame early on shot 2's last frame ("Muse" already black and centred), so "Introducing Muse" drops out exactly one bar |
| 3 | 6.21-7.83 | s4 | "A new / kind of AI": A 6.46, new 6.50, kind 6.54, of 6.58, AI 6.63 |
| 4 | 7.83-11.21 | s19 | 0.71 s hold of the settled thread, then the 10k question and "Yes, sign me up!" (10.71, on screen 0.5 s, settled at the cut) |
| 5 | 11.21-12.00 | s22 | hard punch-in straight to the Submit macro (opens after the zoom has landed), tap 11.36, wash 11.63 |
| 6 | 12.00-13.08 | s23 | "You're in." (12.21) / "Let's gooo!!" (12.54); ends as its slide-left exit starts |
| 7 | 13.08-14.96 | s35 | "It's your Muse" pulls back into the closing object grid; hard cut to black |
| 8 | 14.96-15.50 | s37 | black end card, build compressed: icon 14.96-15.17, "Muse" 15.04, badges and Meta logo complete by 15.21 |

**The arc in 15 s.** Hook (0-7.83): the icon and the grid, the product's name and its category. One proof (7.83-13.08): the race sign-up in three beats, asked, tapped, done. The agent asks while the music falls into its stop, "Yes, sign me up!" lands just before the stop's first drop-out, the Submit punch and tap fall between the drop-outs (11.21, 11.36), "You're in." follows the second drop-out and the chorus hits at **12.63**, 0.09 s after "Let's gooo!!" pops. Payoff (13.08-14.96): "It's your Muse" closes the bookend with the opening grid. The end card lands on the music's last hit (14.92, card at **14.96**). Dropped from the 30 s cut are "Introducing Muse", the form and task card (s20, s21), the treadmill (s24), both carousels (s25, s36). No generated clip is needed.

**Score.** `set/score_15.wav` (-18.0 LUFS, the source's own level) is the soundtrack cut at two joins with 30 ms equal-power crossfades, ending on the track's real ending. At **10.50** the hook (source 10.67, inside the hook's own -47 dB gap, one bar later than the 30 s join and the same bar spectrally) cuts into the last bar of the build (35.50): the stop's drop-outs fall at 10.86-11.00 and 11.82-11.98. At **12.60**, in the pre-drop dip, it cuts 20 bars ahead (37.60 -> 79.28) into the last chorus bar, whose downbeat hit (12.63) takes the drop's place. Then come the ending break (14.20), the hits at 14.40 and 14.68 and the last hit at 14.92, and the tail fades out by 15.50. The chorus repeats on a 4-bar phrase (jumps of 4, 8, 12, 16 or 20 bars match; 18 does not), which is why the hook keeps 5 bars and the chorus only 1. Lay it from 0.00 and never retime it. Picture offsets are whole frames and sit a whole number of bars (or, for shots 5-6, 18 beats) from the score under them, so every pop stays on its beat; the beats fall at about 0.36 + k x 0.521 s throughout.

**Lines.** These are sung, inside the score: L01 "Game for the game with a brand new sauce..." 0.29-5.97 (whole), the stop's count-in "...go, one two three" 10.50-12.60 ("move it" is not in the cut), and "I got the sauce to make you go" once, 12.60-14.42.

**Set for this cut.** The same sheets as the 30 s cut, plus `ui_mascot_head.jpg` (the inline mascot-head emoji of shot 2) and `product_object_set_sheet_b.jpg` (the grid objects missing from the first sheet). Shots 1 and 7 have a measured `grid_order`.

**Render.** Everything is motion graphics. Build it on the 30 s cut's assets and lay `set/score_15.wav` under the whole cut.

## The arc

| Act | Time | Shots | What it does |
|---|---|---|---|
| Reveal | 0.00-10.08 | 1-4 | The icon pulls back into the object grid. "Introducing Muse". "Muse is your personal AI agent", with emoji popping between the words. "A new kind of AI". |
| Demo 1: school supplies | 10.08-31.17 | 5-15 | "This week has been hectic." Prompt bar. Inbox. Email. The agent builds a cart and asks permission. The user taps Allow. "Done!" (The music breaks down under 19.2-27.0.) |
| Carousel 1 | 31.17-34.42 | 16 | "AI that goes shopping / books meetings / drafts replies / is always working for you" |
| Demo 2: race sign-up | 34.42-48.75 | 17-24 | Sleep dashboard. The plan is adjusted. "Should I sign you up?" The agent fills a web form and taps Submit. "You're in." The mascot runs on a treadmill in confetti. (The music stops at 35.7-37.5 and the chorus drops at 37.5.) |
| Carousel 2 | 48.75-52.00 | 25 | tracks your goals / analyzes sleep / fills out forms / builds plans |
| Demo 3: flight delay | 52.00-69.92 | 26-31 | The status pill cycles through checks. Flight delayed. "Would you like me to change your flight?" "Yes, please!" Calendar 18 -> 19, "Updated flight". "Your Muse gets it done" in confetti. |
| Carousel 3 + apps | 69.92-76.92 | 32-34 | books trips / sends the gift / saves money / looks out. Then "Connect your apps", where the icons turn into checks: "All in one place". |
| Brand close | 76.92-82.54 | 35-37 | "It's your Muse" inside the object grid. "AI that keeps you up-to-date / in the loop / in control". Black end card: icon, name, store badges, Meta logo. |

## The rules that make it this film

1. **It cuts on the music.** The track runs at 115 BPM (beat 0.521 s from 0.08 s). Words, emoji, bubbles and line swaps pop on beats or half-beats. Keep the track's landmarks: the breakdown (19.2-27.0) under the quiet email/cart work, the stop (35.7-37.5) on the training-plan close-up, and the chorus drop (37.5) going into the form-filling. The film ends on the music's last hit, at the cut to black (81.67).
2. **One virtual camera over a flat screen plane.** The camera never shows perspective rooms. It makes three kinds of move:
   - punch-ins (hard 3-4x scale cuts: 12.67, 27.54, 45.33, 58.92, 64.58);
   - slow pans that follow typed text in macro (shots 6 and 27);
   - pull-backs that reveal (shots 1, 7 and 35).

   Most beat changes are no-cut transitions: morphs, slide-ups, shared-element expands, a card flip and a rack-focus. Only 6 hard cuts exist.
3. **Each demo follows the same loop.** Trigger message -> mascot status pill cycling short present-tense statuses ("is working", "Creating shopping list", "checking alternate routes") -> one permission or yes/no question -> payoff (a "Done!" title, the treadmill and confetti, or "gets it done" with confetti).
4. **Wide, then macro.** Each chat starts wide and small (text about 20 px, lots of empty white), then punches into a macro where the words are 70-90 px and cropped by the frame edges.
5. **The type system.** Use a friendly geometric sans in sentence case, black on off-white, centred, with the block centre at about 45% height. Carousels use three lines: big "AI that" / a smaller emoji + verb phrase / big "for you". The only coloured word is the blue "Muse" in shot 2.
6. **Colour discipline.** Use off-white fields: title cards get a pale-blue glow from the bottom, and UI scenes get a soft grey shade to the bottom-right. Royal blue #1A6CF0 marks every action: the Allow and Submit buttons, the checks and the calendar selection. There is one yellow accent (the training card) and one red accent (the Delayed bar). Black appears only in the browser bezel and on the end card.
7. **The mascot is the agent's face.** It appears as a round avatar on the status pill (idle, or working with headphones and a laptop), as an inline emoji in headlines, and twice as a full 3D hero (running on a treadmill, and with a party horn). It never speaks.
8. **The film is a bookend.** The object grid and the icon open it, and the same grid and icon close it.

## Building it again

- **Set** (`set/`):
  - `char_muse_sheet.jpg` and `char_muse_wardrobe.jpg`: the mascot and its variants.
  - `product_muse_app_icon_sheet.jpg`: the app icon.
  - `product_object_set_sheet.jpg`: the 3D emoji library.
  - `product_ui_kit_sheet.jpg` and `product_ui_cards_sheet.jpg`: the UI language.
  - `loc_title_backdrop.jpg` and `loc_ui_canvas.jpg`: the two background fields.
  - `score.wav`: the full soundtrack.
  - `voice_singer.wav`: the lead-vocal timbre, sung over the band.
- **Boards** (`boards/`): one per shot (`sNN.jpg`). The 23 shots with a move or a big change also have a start board and an end board (`sNNa.jpg`, `sNNb.jpg`).
- **Render**: build it as motion graphics (HTML/HyperFrames or similar) on the score's beat grid. Use stills from the set for the mascot, the icon and the emoji. Only shot 24 (the mascot on the treadmill) suits a generated clip: an H3 keyframe clip from a `bin/img` first frame. Mute the clip and lay `score.wav` under the whole cut.
- **Swap** (see `slots` in template.json): the app name, icon, mascot, demo stories, UI copy, carousel verbs and end card. Keep the beat map, the six punch-ins, the act lengths and the music landmarks.
- Use made-up names, domains and brands in all UI copy. The film's payment and store badges are described generically on purpose.
