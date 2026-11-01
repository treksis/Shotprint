# Muse tour: presenter-led app walkthrough (157 s, 19 shots)

## The film in one paragraph
A product designer stands behind a stone table in a dim, warm living-room set and walks the viewer through a new phone app, one tab at a time, in one relaxed and continuous take. Each time he names a tab, the film hard-cuts to a bright, flat recording of the phone on a pale blue gradient, and his voice carries on over it. A virtual camera pushes in on the UI only when there is something to read, and the content scrolls to land each example on the word he is saying. Two camera angles share the presenter time: a locked frontal wide (A) and a long-lens close-up from camera right (B). The film ends on "You can download Muse today", a quarter-second of black, and a centred end card. A soft A-minor pad sits about 15-20 dB under the voice the whole way through.

## Arc (acts)
| Act | Shots | Time | What it does |
|---|---|---|---|
| Intro | 1 | 0-5.09 | Wide, name lower third, "quick walkthrough of our new app, Muse." |
| Chat | 2-5 | 5.09-45.5 | Chat feels like messaging (long-press reaction); a history scroll shows golf, tickets, family doc, chess on cue |
| Status and permissions | 6-8 | 45.5-69.07 | Agent works in background: status pill, then status sheet, then approval card |
| Feed | 9-10 | 69.07-89.21 | Personal feed; zoom on the editable feed prompt |
| Ideas | 11-12 | 89.21-107.52 | Long zoomed scroll of proactive suggestions |
| Goals | 13-14 | 107.52-131.51 | Goals list, a detail timeline, long-term goals below |
| Library | 15-16 | 131.51-146.69 | Artifacts list, then an interactive dashboard |
| Sign-off | 17-19 | 146.69-156.99 | Thanks, download call, black, end card |

## Rules that make it this film
1. **Two worlds, hard cuts only.** The presenter is dim and warm (brightness 68-72/255); the screens are bright and cool (200-221). Every cut jumps between them. There are no dissolves, wipes or whooshes. The only black is 152.03-152.28 before the end card.
2. **Short bridges, long screens.** Presenter shots last 1.42-5.63 s and screen shots 12.5-21.5 s. Pattern: A wide → screen → A → B → screen → … (see `template.json`). B close-ups (2.7-3.3 s, 1.4-1.7 for the shortest) come right before a screen and often end on him **looking down at his phone** (s09, s13), which motivates the cut.
3. **Cut mid-sentence, on the tab name.** "The next tab is | ideas", "Now, anything | you create with Muse, you can find on | the library tab". The voice is one unbroken take: on camera in A/B, voice-over on the screens.
4. **Locked cameras.** A and B never move. All motion on the screens is a virtual 2D camera with only two sizes: SMALL (phone fully visible, centred, 24% of frame width) and ZOOM (35-39% width, cropped top and/or bottom), with 0.5 s eased scale changes. It zooms only for reading (context menu, feed prompt, ideas list, status pill) and pulls back for navigation.
5. **UI beats land on the words.** Taps show as a soft grey touch circle. Each spoken example (golf, movie tickets, family weekend, chess, permission, prompt, timeline, dashboard) is on screen within about a second of being said. Tab changes are taps on the five-icon bottom bar.
6. **Restraint.** Natural soft light, no grade tricks, no haze, no captions or supers on screens. The app UI carries the words. The only on-image texts are the lower third (0.5-5.09) and the end card.
7. **Sound.** A quiet ambient pad (Am7 colour) with no beat and no hits on cuts. It starts with the first word and ends on a held chord under the end card, fading to silence by 155.2. There are no UI sound effects.

## Setups
- **A_wide**: frontal medium-wide at eye level on a normal lens, locked. The presenter is centred at x 35-66%, eyes at 30% height, and the table edge sits flat at 90%. Shelving is on the left, the warm floor lamp and olive tree on the right.
- **B_close**: medium close-up from about 25° camera-right on a long lens with shallow depth of field. The face is slightly left of centre and his eyes look about 25° to frame right of the lens, toward camera A, with the head turned about 20° to frame right (`set/char_presenter_eyelines.jpg`, right panel). The background is blurred shelf edge and tree leaves.
- **SCR_phone**: an unbranded black-bezel phone on a near-white to sky-blue (#8fc3f3) diagonal gradient, flat and straight-on.
- **END_card**: on black, a centred stack: icon at y 17-45%, "Muse" at 49-56%, two store badges at 68-74%, Meta wordmark at 86-90%.

## How to rebuild
1. Make the voice track first, as one continuous take, with the exact lines and times in `template.json` → `sound.voice_track` (voice timbre: `set/voice_presenter.wav`; for the 30 s cut the recorded lines in `set/lines/` replace this step).
2. Make plates A and B once (`char_presenter_*` + `loc_living_room_set`, compositions from `boards/`). Render each presenter shot with `guide_audio` set to its slice of the voice track. Never retime.
3. Build the screen shots as motion graphics from the UI sheets and backdrop, following each shot's `camera_move` keyframes and `action` times.
4. Lay `set/score.wav` under everything at its native level, then add the lower third and the end card.

## Ingredient set (`set/`)
`char_presenter_sheet.jpg`, `char_presenter_wardrobe.jpg`, `voice_presenter.wav`, `loc_living_room_set.jpg`, `loc_screen_backdrop.jpg`, `product_muse_phone_sheet.jpg`, `product_muse_ui_chat_status.jpg`, `product_muse_ui_feed_ideas.jpg`, `product_muse_ui_goals_library.jpg`, `char_muse_avatar_sheet.jpg`, `product_muse_icon_sheet.jpg`, `score.wav`.
For the 30 s cut: `lines/L01-L07.wav` + `lines.json`, `score_30.wav`, `ui_chat_s2.jpg`, `ui_chat_s8_researching.jpg`, `ui_chat_s8_teetimes.jpg`, `ui_chat_thread_tall.jpg`, `ui_status_sheet.jpg`, `ui_status_sheet_scrolled.jpg`, `ui_status_list_tall.jpg`, `ui_ideas_health.jpg`, `ui_goals.jpg`, `ui_end_card.jpg`, `ui_phone_frame.png` + `ui.json`, `char_presenter_eyelines.jpg`.
For the 15 s cut: `lines/L04s.wav` (and L01, L02, L07), `score_15.wav`; the same ui sheets.

## Notes and uncertainties
- Line times come from transcript turn boundaries and per-shot transcription. Times inside a shot are interpolated (±0.5 s). The transcriber's doubled words were removed.
- `score.wav` is rebuilt from pitches and levels measured in the speech pauses (A2, G3, C4, E4, A4). The chord movement under the voice could not be separated from speech, so the Am7/Fmaj7/Cmaj7 cycle in the file is a stand-in.
- UI copy in the sheets is generic placeholder text. Write the real screen text per the `on_screen` and `action` fields and keep it free of third-party names.

## 30-second cut
The seeded film is 30.0 s, 9 shots, cut from the full film above like the official 30 s spot. Full detail is in `template.json` → `cut30`; screen builds are in `set/ui.json`.

| # | Time | From | Setup | What is heard | Change from the source shot |
|---|---|---|---|---|---|
| 1 | 0.00-3.85 | s1 | A_wide | L01 "And I'm very excited to give you a quick walkthrough of our new app, Muse." | Starts 1.24 s in, after the name; lower third {PRESENTER_NAME} / Muse Product Design already on |
| 2 | 3.85-7.02 | s2 | SCR_phone | L02 "Your personal agent who's always working for you." | First 3.17 s: end of the chat thread; push-in to ZOOM (low) 5.56-6.06 |
| 3 | 7.02-9.69 | s7 | B_close | L03 "So it's useful for me to see what it's doing at any given time," | Whole shot |
| 4 | 9.69-16.25 | s8 | SCR_phone | L04 "If I want more detail, I can tap on it and I'll see what it's doing, what it has done, what it will do," | 56.80-63.36 of the source: pill "researching courses" → "finding tee times", pull back, tap on "tap" (11.93), status sheet grows out of the pill, list scrolls ("drafting email") |
| 5 | 16.25-19.09 | s13 | B_close | L05 "Ultimately, Muse is designed to help you accomplish…" (starts 0.20 s before the cut) | Whole shot |
| 6 | 19.09-22.36 | s14 | SCR_phone | "…your goals, and you'll find them here on the goals tab." | First 3.27 s: tap on the goals tab, goals list |
| 7 | 22.36-24.31 | s17 | A_wide | L06 "We're really excited for you to check it out." | From 148.37 (drops "And that's a quick walkthrough of Muse.") |
| 8 | 24.31-26.02 | s18 | B_close | L07 "You can download Muse today." | Whole shot |
| 9 | 26.02-30.00 | s19 | END_card | score bloom | 0.25 s black, card fades up 26.27-26.99, holds |

**Arc.** Hook (the wide intro and the promise on the first screen), proof (B close, then the live status pill and the status sheet: what it is doing, has done, will do), payoff ("help you accomplish your goals" landing on the goals tab), sign-off on A then B, end card.

**Pace.** Average 3.33 s, median 3.17 s (source 8.26 / 4.96). Presenter bridges keep source lengths (1.71-3.85 s) and the A → screen → B → screen pattern; screens hold one spoken beat each. Hard cuts only, every cut jumps between the dim warm set (68-72) and the bright screens (200-221).

**Voice.** `set/lines/L01-L07.wav` are the recorded lines (cut at pauses, word times in `set/lines.json`). Lay them at the cut30 times exactly; never retime. Silences between them: 0.14 s at 10.11, 0.20 s at 15.85, 0.39 s at 21.97.

**Presenter takes (5 H3 clips, one mode).** Keyframe mode, no refs: `first_frame` = plate_A (shots 1, 7) or plate_B (shots 3, 5, 8), `guide_audio` = the line clip, `seconds` = clip length rounded up; trim the take to `use_window`. Make plate_A and plate_B once with `bin/img` from `char_presenter_sheet` + `char_presenter_wardrobe` + `loc_living_room_set`, framed like `boards/s01.jpg` and `boards/s04.jpg`. Shots 7 and 8 share one guide (L06 + L07 joined, 3.66 s): the A take uses 0-1.95, the B take 1.95-3.66. Prompt "locked-off tripod, no zoom". If framing scales or slides by more than 3%, re-render with the same plate and guide; never switch to reference mode (it ignores `first_frame`).

**Screens.** Motion graphics from the `ui_*.png` sheets (exact copy, 390x844 pt at 3x) on `loc_screen_backdrop`, following `set/ui.json`: scroll positions in pt, taps (grey 56 pt circle), SMALL/ZOOM camera with eased 0.45-0.5 s moves. The tall pages (`ui_chat_thread_tall.jpg`, `ui_status_list_tall.jpg`) are the scroll content.

**Score.** `set/score_30.wav` at native level (-30.8 LUFS): score 0-20.5, joined on the bar line at 20.5 to score 146.5 (same chord, 0.25 s crossfade), Am7 bloom at 26.0 under the end card, silence from 29.2.

**Text.** Lower third 0.00-3.85: {PRESENTER_NAME} bold white, right edge x 91.5%, baseline y 78.2%, cap height 3.2% (DejaVu Sans Bold 32 px at 720p, 87% wide); "Muse Product Design" regular, cap height 2.3% (DejaVu Sans 23 px), baseline y 82.2%, 18.8% of frame width. End card `set/ui_end_card.jpg`: icon y 17-45%, "Muse" 49-56%, generic badges 68-74%, Meta wordmark 86-90%.

## 15-second cut
The 30 s cut tightened to hook, one proof, payoff and end card: 15.0 s, 4 shots. Full detail is in `template.json` → `cut15`; the screen build is `set/ui.json` → `cut15_shots`.

| # | Time | From | Setup | What is heard | Change |
|---|---|---|---|---|---|
| 1 | 0.00-3.85 | s1 (= cut30 #1) | A_wide | L01 "And I'm very excited to give you a quick walkthrough of our new app, Muse." | None: the same take and lower third as cut30 shot 1 |
| 2 | 3.85-10.29 | s8 (= cut30 #4) | SCR_phone | L02 "Your personal agent who's always working for you." (4.16), L04s "what it's doing, what it has done, what it will do," (7.16) | Source 56.80-63.24: cut30 shot 4 moved 5.84 s earlier, 0.115 s shorter. ZOOM top on the pill ("researching courses" → "finding tee times" at 4.55), pull back 5.05-5.50, tap on the pill 6.05, sheet grows 6.15-6.50, list scrolls 8.95-9.45 on "done" |
| 3 | 10.29-12.00 | s18 (= cut30 #8) | B_close | L07 "You can download Muse today." (from 10.19) | Guide is L07 alone (cut30 joined L06+L07) |
| 4 | 12.00-15.00 | s19 (= cut30 #9) | END_card | score bloom | Black 12.00-12.25, icon and "Muse" 12.25-12.87, badges and Meta 12.57-12.97, hold 2.03 s |

**Arc.** Hook: the wide intro, then the promise said over the agent's live status pill, which shows it working. One proof: the tap opens the status sheet as he says "what it's doing, what it has done, what it will do". Payoff: the B close call to download. End card. Dropped from the 30: the chat screen, the B close "So it's useful…", the goals beat and the A wide thanks.

**Pace.** Average 3.75 s, median 3.43 s (cut30 3.33 / 3.17). The presenter shots keep their source lengths (3.85, 1.71). Pattern A wide → screen → B close → black → card, hard cuts only.

**Voice.** Lay `set/lines/L01.wav` at 0.00, `L02.wav` at 4.16, `L04s.wav` at 7.16 and `L07.wav` at 10.19 at native level. Never retime them. L04s is the tail of L04, cut at a 20 ms dip before "what". The audible pauses are 0.21 s after "for you." and 0.15 s after "will do,".

**Presenter takes (2 H3 clips).** Shot 1 is cut30's A take (plate_A + L01, use 0-3.85). Shot 3 is plate_B + `L07.wav` as guide_audio, `seconds` 3, use 0.10-1.81 ("You" starts 0.08 s into the clip, so the cut lands just after it, as in the source). Keyframe mode with no refs, and the prompt says "locked-off tripod, no zoom". Make plate_B's head angle and gaze match `set/char_presenter_eyelines.jpg` (right panel): head about 20° to frame right, eyes about 25° right of the lens.

**Screen.** Build it as cut30 shot 4, shifted. Lay the `ui_*` sheets into `set/ui_phone_frame.png` (screen hole at 42,42 px), on `loc_screen_backdrop`. SMALL is phone x 37.6-62.4 %, y 3.8-96.1 %. ZOOM top is 1.40x with the phone top at y 4.1 %. The sheet grows out of the pill with the boxes given in `ui.json` → `layers.sheet_grow`, and the list scrolls in its viewport (236-844 pt) per `layers`.

**Score.** `set/score_15.wav` at native level. Score 0-6.5 (Am7) is joined on the bar line at 6.5 to score 146.5 (C): Am7 → C with a 0.4 s equal-power crossfade and no level step. The Am7 bloom lands at 12.0 with the black, and the file closes to digital zero at 15.0.

**Text.** Lower third 0.00-3.85, as in cut30: {PRESENTER_NAME} in DejaVu Sans Bold 32 px at 720p (87 % wide), right edge x 91.5 %, baseline y 78.2 %. "Muse Product Design" in DejaVu Sans 23 px, baseline y 82.2 %. End card `set/ui_end_card.jpg` at the times above.
