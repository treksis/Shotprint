# Athlete Anthem

**The film.** A 30 s sportswear spot built on one long, slow reveal. A retired football star (invented here: `char_vet`, ~46, retired defensive lineman, very broad, shaved head under a charcoal knit beanie, salt-and-pepper beard, black rectangular sunglasses, rust corduroy work jacket over a cream henley) sits against a dark red brick wall and talks straight into the lens, deadpan, about a bitter taste that "the real ones" learn to love. The camera starts on his mouth in extreme close-up and pulls back without a cut for 21.5 s until he sits in a medium shot holding a red cup. On "...getting your lick back" the film slams into 3.25 s of championship footage, nine cuts on loud music with one aerial stadium firework shot at the peak. Then it drops back to the quiet room: he sips, lowers the cup, grins: "Tastes good, don't it?" A three-line white tagline on a teal glitter cloud, then the brand mark.

## Arc
| Act | Source time | Shots | Job |
|---|---|---|---|
| Monologue | 0.00-21.48 | 1 | Hook on the mouth, eight deadpan lines, the slow pull-back reveals him piece by piece (sunglasses 2 s, beanie 5 s, cup 12.5 s, picture on the wall 14.5 s) |
| The win | 21.48-24.73 | 2-10 | The revenge made literal: catch, break-away run, hug, coach, fans in silhouette, **stadium fireworks**, CHAMPIONS banner, arms wide, goalpost dunk. Avg 0.36 s per shot |
| The sip | 24.73-27.86 | 11 | Close-up: sip, grin, "Tastes good, don't it?" in near silence |
| End card | 27.86-30.03 | 12-13 | {TAGLINE} 1.5 s, then {BRAND} mark 0.67 s |

## Rules that make it this film
- **One unbroken pull-back** for the whole monologue: mouth ECU at 0 s to a seated medium at 21.5 s (framing ~6x wider), slow and steady, a slight rise, no pan. The room is very dark (brightness 31-39 of 255), one warm key from camera left, wall falling to black.
- **Deadpan to the lens.** He barely moves; small head tilts on the stressed words, a hint of a smirk on "real ones" and "lick back". He never drinks until the punchline.
- **Silence vs. slam.** No music under the monologue, just dry voice and room tone (~-22 LUFS). The montage arrives on a hard cut with loud music and crowd (~-9 LUFS); the last word of the monologue spills 0.22 s over that cut.
- **The montage is tiny and fast**: 3.25 s, nine shots of 0.16-0.5 s, cool teal-green grade (brightness 42-125), long lenses and motion blur; the single firework shot (23.48-23.86) is the visual peak.
- **The punchline is quiet**: the music dies, a sip, then four words. The end card is a hard cut on the music sting; type does not animate.
- Generic everything: kits are charcoal/copper (home, #31) and white/dark red (away, #57), no team marks; the presenter is invented; brand and tagline are slots.

## Render plan
- **Setup A (shot 1)**: one locked setup, rendered per line. Each take = first frame (plate of `char_vet` + `prop_mug` in `loc_brick_wall` at that take's start framing, see `subject_in_frame`) + `guide_audio` = its `set/lines/Lnn.wav`. Prompt the same slow pull-back continuing. Cut on the line breaks. If a take drifts, re-render on the same first frame; do not use reference mode.
- **Shot 11**: first frame (cup at the mouth, board `s11a`) + guide audio (1.80 s silence + `L09.wav`).
- **Montage**: keyframe clips (first/last-frame plates from the sheets and boards), 5 s each, keep the windows in the cut.
- **Cards**: drawn in code from `ui_endcard_*` with a slow particle drift.
- `set/score.wav` carries the original voice: in a new film use it only where it is music (cut30 21.48-25.2 and 27.8-30.0).

## Cut 30 (30.0 s, 20 shots)
The source is already 30 s, so every shot is kept, trimmed to 30.0. Shot 1 is split into its 8 line takes (0-2.2, 2.2-4.85, 4.85-7.2, 7.2-10.75, 10.75-12.9, 12.9-15.3, 15.3-17.5, 17.5-21.48), then montage shots 2-10 (21.48-24.73), the sip (24.73-27.86), tagline (27.86-29.36), logo (29.36-30.0). Lines L01-L09 at their source times. Score: one segment 0-30.0.

## Cut 15 (15.0 s, 9 shots)
Hook, one proof, payoff, end card:
1. 0-3.62: setup A close-up window (source 1.70-5.32): "Bitter really is an acquired taste." (L02 at 0.99-2.90)
2. 3.62-8.09: jump back to the wide end of the pull-back (source 17.0-21.48): "Because nothing tastes as good as getting your lick back." (L08 at 4.60-8.31)
3-6. 8.09-9.70: catch (0.5), stadium fireworks (0.38), CHAMPIONS (0.3), goalpost dunk (0.43)
7. 9.70-12.83: the sip; "Tastes good, don't it?" at 11.50-12.69
8. 12.83-14.33: tagline card
9. 14.33-15.0: logo card

Score segments 1.70-5.316 | 17.003-23.013 | 24.654-30.03 (joins at 3.62 pause-to-pause and 9.63 on the montage music's bar), 30 ms crossfades, 0.15 s fade out.
