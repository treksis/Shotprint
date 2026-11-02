# New Home (template `new-home`)

**The film.** A 60 s big-game spot for an AI assistant, told almost entirely on the assistant's screen. A parent types "pull up photos of our new house in {TOWN}"; the assistant finds the listing photos; the child, off screen, says "Uh, that's my room." The parent attaches a photo of the child's old bedroom and asks the assistant to "fill this empty room with {CHILD}'s stuff." The empty room comes back furnished, then repainted blue on the child's request. They look at the yard; the child asks about the parent's garden. The assistant pulls up old garden photos, and the film breaks into a burst of warm home video from the old house: planting, a baby on the sofa, a toddler in the hallway, a tomato, a birthday, a hug. "So it'll be like our old house?" "It'll be whatever we want it to be." The assistant visualizes a new garden, the picture dissolves into the real yard, now planted, with the child and dog running across it. Tagline, end card.

**Arc.** The ask (0-12 s) -> make it theirs (12-30 s) -> the yard and the garden question (29-46 s) -> memory montage (46-51 s) -> the garden becomes real + tagline (51-58 s) -> end card (58-60 s).

## Rules that make it this film
- **Nobody on screen speaks.** All dialogue is off-screen voice-over between a child (about 6) and a parent, natural and overlapping, sitting in the score track. Faces appear only in the home videos and, small, in the final yard.
- **Two picture worlds.** The assistant UI is pure black (brightness 0-55) with white type and bright photo cards (80-157); the memories are soft, warm handheld phone footage (85-142); the ending is clean cinematic daylight (78-112). No device, hands or room around the screen: the UI fills the frame.
- **Type is performance.** Every request is typed on screen at 6-20 characters per second with a blinking blue caret, often in a huge zoomed-in line. Status screens ("Searching your photos…", "Generating image…", "Visualizing your new garden…") are black beats of about 1 s that work as breaths.
- **One room, one yard.** The empty room, the furnished room and the blue room are the same photograph changed step by step (ui_photo_empty_room -> ui_room_filled -> ui_room_blue). The plain yard, the visualized yard and the live yard are the same framing (ui_photo_yard -> ui_garden_gen -> loc_backyard).
- **The turn is a dissolve.** The generated garden image scales up to fill the frame and dissolves into the real yard (0.6 s): the only soft transition in the film. Everything else is a hard cut or a fade up from black.
- **Pace.** 29 shots, average 2.07 s; the montage runs at 0.6-1.0 s a shot.

## Render
UI shots: motion graphics in code from the flat `set/ui_*.png` sheets with `set/ui.json` timings (type-on, spinners, fades, slides, pushes); no video model. Home-video and yard shots: H3 keyframe mode, first + last frame from plates built from the char_ sheets and loc_ images; no on-set sound. The score (`set/score_30.wav`, `set/score_15.wav`) carries music and every voice line.

## cut30 (30.0 s, 21 shots, average 1.43 s)
Score: source 3.697-21.697 + 45.697-57.697, one join at 18.0 s on a bar (the blue room covers it).
| # | t | from | what |
|---|---|---|---|
| 1 | 0.00-0.93 | s1 | prompt box, "pull up photos…" typing |
| 2 | 0.93-3.89 | s2 | huge type "…new house in {TOWN}" |
| 3 | 3.89-5.06 | s3 | Searching your photos… |
| 4 | 5.06-6.85 | s4 | answer + photo card, push to the empty room; L01 "Uh, that's my room." 6.25 |
| 5 | 6.85-8.77 | s5 | empty room fills frame |
| 6 | 8.77-11.48 | s6 | thumbnail + old room slides in; L02 "Yeah, it's next to mine." |
| 7 | 11.48-14.07 | s7 | types "fill this empty room with {CHILD}'s stuff."; "And watch." |
| 8 | 14.07-15.11 | s8 | Generating image… |
| 9 | 15.11-16.90 | s9 | furnished room; L03 "Wow, can it be blue?" |
| 10 | 16.90-18.00 | s10 | types "make the walls blue" |
| 11 | 18.00-19.00 | s11 | blue room; L13 "So it'll be like our old house?" 18.38 |
| 12-17 | 19.00-23.43 | s19-s24 | home-video montage: planting, sofa, hallway, tomato, birthday, hug; L14 "It'll be whatever we want it to be." 22.22 |
| 18 | 23.43-24.35 | s25 | Visualizing your new garden… |
| 19 | 24.35-25.35 | s26 | visualized yard card |
| 20 | 25.35-28.50 | s27 | card dissolves into the real yard, child and dog; tagline 26.70 |
| 21 | 28.50-30.00 | s29 | end card |

## cut15 (15.0 s, 9 shots, average 1.67 s)
Score: source 9.697-17.697 + 49.697-56.697, one join at 8.0 s on a bar.
Hook: house photos -> empty room, "Uh, that's my room." (s4, s5). Proof: old room attached, "fill this empty room with {CHILD}'s stuff.", "And watch." (s6, s7) -> furnished room (s9) -> blue room (s11). Payoff: "It'll be whatever we want it to be." over the hug (s24) and the real yard with the tagline (s27, 12.9 s). End card 14.0-15.0 (s29).

## Slots
{BRAND} "Lumen", {PRODUCT} "Aria" (placeholder "Ask Lumen Aria", wordmark "Lumen Aria", "Get Lumen's AI app", tagline "A new kind of help from Lumen"), {TOWN} "Maplewood", {CHILD} "Milo", the mark (`set/ui_mark.png`), the family (char_ sheets + voices), the lines (`set/lines.json`).
