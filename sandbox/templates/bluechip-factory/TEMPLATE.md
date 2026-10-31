# Template: BlueChip factory film → 30-second founder ad

Source: Anduril, "BlueChip – Rebuilding American Computer Manufacturing" (117.3 s, 52 shots).
Dissected 2026-10-30 from measurements, not impressions: cuts by scene detection, camera motion by
optical-flow tracking (`../tools/motion.py`), words per shot by per-shot transcription. The full
shot table is `master_shots.md`; reference frames for every setup are in `frames/`.

This file is the director's decisions. The filler (an LLM, a person) supplies the product, the
presenter, the lines and the plates, and keeps everything else. Slots are marked `{LIKE_THIS}`;
`template.json` is the machine-readable twin used by the checker.

---

## 1. What makes this film work (keep all of it)

1. **One continuous monologue, cut across.** The founder talks without stopping; the picture cuts
   away to archive, product and hands *while he keeps talking*. 33 of the 52 shots (63%, 65 s) are
   voice-over. Cuts land on phrase breaks, often mid-sentence. In this template every spoken line
   is rendered once with the presenter on camera, and the edit decides how much of it we *see* him
   say (L-cuts and J-cuts). Audio and picture of a take always keep their original relative
   timing: a take is placed on the timeline at one offset, never stretched.
2. **A fixed interview rig.** The presenter is covered by fixed camera setups that never change
   position, light or lens. Cutting between them is what makes it feel like a documentary
   interview instead of a sequence of generated clips. Every presenter take must start from that
   setup's plate (first-frame conditioning), so the set, light and wardrobe are identical at every
   cut.
3. **Hero object, handled with reverence.** The product appears late (43% in, at 50.8 s), lit like jewellery:
   black void, rim light, gloved hands, slow moves. Before that it is only implied.
4. **Proof through hands.** "Made here" is never said without being shown: gloved hands, profiles of
   workers, macro of parts going together.
5. **A physical payoff instead of a slogan card.** The claim ("Designed in California / Built in
   America") is laser-etched into the product itself, letter by letter, then a silent black end card.

## 2. Arc (master timings, then the 30-second mapping)

| Act | Master | Share | Job | 30 s slot |
|---|---|---|---|---|
| Cold open | 0.0-6.1 | 5% | establishing aisle, founder states the heritage claim | B1 |
| Heritage | 6.1-18.6 | 11% | archive proves the claim (B/W 4:3, pillarboxed) | B2 (optional) |
| The loss | 18.6-35.7 | 15% | "then we gave it away", dependence | B3 |
| The stakes | 35.7-49.9 | 12% | conditional thesis: no control → no future | B4 |
| Turn + name | 49.9-58.2 | 7% | "now we're bringing it home. This is X." + product reveal | B5 |
| Proof: made here | 58.2-72.2 | 12% | assembly hands, workers, founder at the bench | B6 |
| Proof: works anywhere | 72.2-92.6 | 17% | field use, founder demo | B7 |
| Mission | 92.6-104.1 | 10% | "X is America's comeback" over assembly macros | (folded into B6/B7 VO) |
| Payoff | 104.1-114.3 | 9% | laser etch of the claim on the product | B8 |
| End card | 114.3-117.3 | 3% | black, maker logo | B9 |

Average shot: 2.26 s. Interview shots average 2.5 s, B-roll 1.6-2.0 s, payoff 5 s. Hard cuts only.

## 3. Camera setups (fixed rig + B-roll units)

Every presenter shot uses one of these setups. Make **one plate per setup** (presenter + set, from
the reference frame) before rendering anything, and reuse it as the `first_frame` of every take on
that setup. Vertical (9:16) framings are given for the portrait edition.

| Setup | Reference frame | Framing (16:9) | Lens / height | Measured motion | 9:16 framing |
|---|---|---|---|---|---|
| **EST** establishing | `frames/establish_wide.jpg` | symmetrical one-point perspective down the centre aisle, benches converge, workers' backs, signage both sides, vanishing point centred | 24-28 mm, eye level, deep focus | static, faint push (3%) | same axis, vanishing point at upper third, benches fill the lower half |
| **CAM-A** interview wide | `frames/camA_interview_wide.jpg` | presenter waist-up at left third, facing lens (~10° off), bench runs diagonally into right background, station pillar behind | 35 mm, eye level, f/2.8 | static, slow push 2-4% over the shot | knees-up, presenter centred, bench diagonal behind his shoulder |
| **CAM-B** off-axis MCU | `frames/camB_offaxis_mcu.jpg` | presenter chest-up from his left, 3/4 profile, eyeline **screen-right** to an off-camera interviewer, dark racks + blurred strip lights behind | 85 mm, eye level, f/1.8 | light handheld float (jitter ≈0.005), no travel | chest-up, face upper third, eyeline still screen-right |
| **CAM-C** frontal MCU | `frames/camC_frontal_mcu.jpg` | presenter chest-up, slightly left of centre, looking just off lens; station pillars and a hanging subassembly sign behind | 50 mm, eye level | static | chest-up, centred |
| **CAM-D** tight CU | `frames/camD_tight_cu.jpg` | face and collar, 3/4, background almost black | 85-100 mm | handheld, slight roll | face fills the upper half |
| **CAM-E** demo wide | `frames/camE_demo_wide.jpg` | presenter at a bench, wide, holding/presenting the product with gloved hands | 35 mm | static | knees-up |

Continuity rules for the rig:
- The interviewer sits camera-right of CAM-A; CAM-B's eyeline is always screen-right (180° rule).
- CAM-A ↔ CAM-B ↔ CAM-C alternate; never cut CAM-A to CAM-A (jump cut).
- Same wardrobe, hair, light and set dressing in every setup; the plates guarantee it.
- He wears gloves **only** when touching the product (both hands, white ESD gloves), never one glove.

B-roll units (no presenter on camera, no lip movement, no speech in the clip's own sound):

| Unit | Reference frame | Shot | Motion |
|---|---|---|---|
| **HERITAGE** | `frames/archive_newsreel.jpg`, `frames/archive_still.jpg` | black-and-white 4:3 newsreel or still, pillarboxed in black, grain and scratches; subject = the product category's origin | stills static; newsreel light handheld |
| **PRODUCT-HERO** | `frames/product_hero_handheld.jpg` | gloved hands tilt the product up toward the lens over the blue bench, low angle | handheld rotate, push-in 15-20% |
| **PRODUCT-RIM** | `frames/product_rimlight.jpg` | low glancing angle along the product's edge, black void, rim light only | slow slide |
| **PRODUCT-BENCH** | `frames/product_on_bench.jpg` | product resting on the blue bench, low 3/4, black background | slow pull-out 4% |
| **ASSY-PROFILE** | `frames/assembly_worker_profile.jpg` | worker in profile, safety glasses, gloved hands assembling | handheld push-in |
| **ASSY-MACRO** | `frames/assembly_macro_hands.jpg` | macro of gloved fingertips seating a part, very shallow focus | handheld drift |
| **ASSY-MEDIUM** | `frames/assembly_worker_medium.jpg` | worker medium frontal at the bench, factory depth behind | static |
| **ASSY-LOW** | `frames/assembly_bench_lowangle.jpg` | bench-level, finished product foreground, factory lights behind | slow push 4% |
| **FIELD** | `frames/field_use.jpg`, `frames/field_carry.jpg` | daylight exterior, rugged case, hands open/carry the product | handheld, pans |
| **ETCH** | `frames/etch_macro.jpg` | macro of a laser spark tracing on the product's dark surface | slow push 5% |

## 4. The 30-second timeline (16:9 and 9:16)

Times are targets (±0.3 s per shot, total 28-32 s). "VO" = the presenter's take continues under a
B-roll picture. `Lx` = spoken line slots (section 5).

| # | t | dur | Picture | Sound |
|---|---|---|---|---|
| 1 | 0.0-2.0 | 2.0 | EST | score starts; **L1 pre-laps from 0.5** (J-cut) |
| 2 | 2.0-4.6 | 2.6 | CAM-A, L1 on camera | L1 ends |
| 3 | 4.6-6.2 | 1.6 | HERITAGE a (optional; else ASSY-MEDIUM) | VO: L2 starts |
| 4 | 6.2-7.8 | 1.6 | HERITAGE b (optional; else ASSY-MACRO) | VO: L2 |
| 5 | 7.8-10.2 | 2.4 | CAM-B, L2 lands on camera | L2 ends |
| 6 | 10.2-13.0 | 2.8 | CAM-C, L3 (the stakes), push-in | L3 |
| 7 | 13.0-15.2 | 2.2 | CAM-A, L4: turn + name, open-arm gesture toward the bench | L4 |
| 8 | 15.2-17.2 | 2.0 | PRODUCT-HERO | score lifts; L4's tail (product name) may ring out |
| 9 | 17.2-18.6 | 1.4 | PRODUCT-RIM or PRODUCT-BENCH | score |
| 10 | 18.6-20.4 | 1.8 | ASSY-PROFILE | VO: L5 starts (J-cut from shot 12's take) |
| 11 | 20.4-21.8 | 1.4 | ASSY-MACRO | VO: L5 |
| 12 | 21.8-24.2 | 2.4 | CAM-D (or CAM-E with product), L5 lands on camera | L5 ends |
| 13 | 24.2-26.0 | 1.8 | FIELD | VO: L6 (mission line, never seen on camera) |
| 14 | 26.0-28.2 | 2.2 | ETCH + post-composited claim text | score peaks; L6 ends by 27.5 |
| 15 | 28.2-30.0 | 1.8 | END CARD (post) | score hard-cuts to silence at 28.2 |

Render units needed: 6 presenter takes (L1-L6; the L6 take is used for sound only) and 9 B-roll
clips (EST, HERITAGE ×2 or 2 assembly alternates, PRODUCT-HERO, PRODUCT-RIM/BENCH, ASSY-PROFILE,
ASSY-MACRO, FIELD, ETCH). One B-roll clip may supply two shots only if they show different moments
and framings (e.g. the start and end of a push-in).

## 5. Line slots

Speech rate in the master is ~4.5-5 syllables/s, emphatic, with breath pauses at phrase breaks. Each
take is one line, **≤ 14 syllables, ≤ 3.6 s of speech**, rendered as a 5 s clip (or an 8 s clip when
two lines share a take). Keep the rhetoric; replace the content.

| Slot | Function | Master line | Pattern | Budget |
|---|---|---|---|---|
| L1 | HOOK: a heritage claim, past tense, national/communal pride | "America built the first electronic computer to win a war." | "[We/place] [built/invented] the first [category] to [purpose]." | ≤ 14 syl |
| L2 | LOSS: the fall, short and blunt | "Then we gave it away." | "Then we [gave it away / stopped making it]." | ≤ 8 syl |
| L3 | STAKES: conditional parallelism | "If you don't control your technology, you can't control your future." | "If you can't [verb] your [X], you can't [verb] your [Y]." | ≤ 16 syl |
| L4 | TURN + NAME | "Now, we're bringing it home. This is BlueChip." | "Now we're [bringing it home]. This is {PRODUCT_NAME}." | ≤ 14 syl |
| L5 | PROOF: made here, by hand | "American designed, American built." | "[Designed] here. [Built] here, by hand." | ≤ 12 syl |
| L6 | MISSION | "Blue Chip is America's comeback." / "It's time to bring silicon back to the valley." | "{PRODUCT_NAME} is [our comeback / built to last]." | ≤ 12 syl |

## 6. Sound

- **Voice:** dry, close-miked, always on top. One voice for all takes (same timbre reference).
- **Score:** one continuous electronic bed under the whole film: low pulsing minor-key synth, muted
  percussion, ~110 BPM, builds after the name (shot 8), drives the etch, **hard cut to silence** on
  the end card. Never let each clip bring its own music: render every clip with
  `non_diegetic_music: none` and lay one score in post (`{SCORE}`), ducked under speech.
- **No SFX** except a faint laser sizzle under the etch. No factory clatter, no handling sounds.
- Archive and B-roll carry no sound of their own; the voice and score continue over them.

## 7. Look

- Low-key, contrasty. Desaturated cool blacks and steel greys; saturated **cyan-blue benches** and
  the **warm accent of the product and the presenter's shirt** are the only colour.
- Practical overhead strip lights as key; light falls to near-black between stations.
- Fast primes, shallow focus on faces, hands and product edges. Field exterior: natural daylight.
- Heritage: high-contrast B/W, grain, 4:3 pillarboxed.

## 8. Product rules (the place where generated ads fail)

- `{PRODUCT_SHEET}` is the only truth for the product's shape **and finish**. Before any plate, write
  a `product lock` line from the sheet, view by view (e.g. "black curved shield; brushed-silver front
  band with the Meta mark centred; black temples with a small round camera; braided black cable;
  small flat rounded-square black puck"), and paste it unchanged into every product prompt. Never
  build your own sheet from other footage; the supplied sheet wins over any film frame.
- **One finish in every light.** Factory low-key light tends to turn every product all-black and
  daylight tends to turn it white. The lock line's colours must be readable in every shot: in dark
  shots add a rim/practical light that catches the light parts; in daylight keep the dark parts dark.
- `{PRODUCT_SHEET}` remains the only truth for the product's shape. Every shot that shows the product
  starts from a plate whose product was checked against the sheet (`first_frame`), and the prompt
  repeats the product's **must** list and **never** list.
- `{PRODUCT_NEVER}`: write 3-6 things the product must never turn into (e.g. "no fabric head strap,
  no side dial, never ordinary sunglasses").
- Prefer the product **on a surface or in gloved hands at chest height** over close to the face; the
  master never shows the product worn or near a face.
- Benches show only parts that belong to the product, or stay clear. No labelled bottles, cans or
  signs with readable words except the template's station signage, rewritten for the new product.
- Text that must be legible (etch claim, end card, product name) is composited in post, never asked
  of the video model.

## 9. Restraint (the template's look is documentary, not "AI")

Generated video drifts toward exaggeration: big grins, theatrical hands, eyebrow acting, hype delivery,
sparkle, glow, sweeping camera. The master has none of it. Keep every performance and move at the
measured size:
- **Performance:** natural documentary interview. Hands mostly still, below the chest, occasional small
  open-palm gestures on stressed words; relaxed face; normal blinks; mouth moves naturally but compactly.
  No grins, smirks, winks, raised eyebrows, nodding along, pointing at the lens, or "presenter" poses.
  Write it in the prompt as behaviour ("speaks calmly and seriously, small hand movements"), never as
  an emotion to perform ("passionate", "excited", "proud").
- **Voice:** conversational conviction, the pace of someone explaining, not selling. No shouting,
  no announcer cadence, no rising hype at the end of lines.
- **Camera:** stay inside the measured moves (interview push ≤ 4%, product push ≤ 20%, handheld only
  where the template says). No orbits, whips, crash zooms, drone moves or speed ramps.
- **Light and image:** practical light only. No lens flares, bloom halos, sparkles, light leaks,
  floating particles, holograms or glowing UI. The etch spark is the only glow in the film.
- **Words in prompts:** describe the camera, lens, light and action plainly. Avoid "cinematic, epic,
  stunning, dramatic, breathtaking, ultra-detailed, 8K"; they pull the model toward the AI look.
- **Score:** a pulse, not a trailer: no braams, whooshes, hits or risers except the single build into
  the etch.
- **Effects skill:** at most one effect in the film, and only if it reads as an edit choice the master
  could have made (a punch-in, a cut-on-word). No overlays that float over the presenter.

## 10. Post graphics

- **ETCH text** (`{CLAIM_LINE_1}` / `{CLAIM_LINE_2}`, e.g. "DESIGNED BY META" / "BUILT IN AMERICA"):
  monospaced, light grey, letter-by-letter reveal following the laser spark, slight glow, over the
  ETCH clip.
- **End card:** pure black, `{BRAND_MARK}` small at lower-left, nothing else. 1.8 s.
- No lower-thirds, captions or supers anywhere else (the master has none). If an effects skill is
  available, at most two subtle effects, only on CAM-A/CAM-C on-camera lines, never on product shots.

## 11. Production method: hybrid H3 modes (continuity)

H3 has two paths and they do different jobs. Use them in combination, by shot type:

| Path | Inputs | Holds | Use it for |
|---|---|---|---|
| **Ref2V** (reference) | `refs` (images as `<Picture N>`), `ref_audios` (voice timbre) | identity, voice timbre; composition only loosely | the presenter's **voice take** (speech with the right timbre), shots that need a new composition of a known face/product |
| **FL2V** (keyframes) | `first_frame` + `last_frame` (+ `guide_audio`) | exact opening and closing picture, so set, light, wardrobe and product cannot drift in between | **every picture that reaches the cut**: presenter on-camera, product, B-roll |

`first_frame` is ignored on the reference path, and **first-frame-only drifts** (measured: a subject
turned into a different object by ~7 s). Anchor both ends.

| Shot type | Recipe |
|---|---|
| Presenter on camera (CAM-A..E) | 1) Ref2V take: setup plate as `<Picture 1>`, presenter photo, voice reference, the line. Keep only its **audio** if the picture drifts. 2) FL2V picture: `first_frame` = setup plate, `last_frame` = the same setup's **end-pose plate**, `guide_audio` = the take. **A speaking shot's end plate is neutral:** same expression as the start (relaxed, lips slightly parted as if mid-sentence), hands low, at most a 4% push. Never a smile, grin, closed lips or a held pose; the model pulls the mouth toward the end plate and stops articulating (measured in v2: a grin end plate killed the lip sync of the line). If no neutral end plate holds, render with `first_frame` + `guide_audio` only. |
| Product shots (PRODUCT-*, ETCH, ASSY-LOW) | FL2V: start plate + **end plate made by editing the start plate to the end of the measured move** (e.g. "same shot, 18% closer, glasses rotated 20° toward the lens"). Check the product against `{PRODUCT_SHEET}` part by part on **both** plates before rendering. |
| B-roll with people (ASSY-*, FIELD) | FL2V with start + end plates; the end plate shows the action completed (part seated, case opened). |
| Action that continues across a cut (match on action) | Chain: the outgoing clip's **last frame** becomes the incoming clip's `first_frame` (different setup, same moment). |
| Heritage stills | No render: the plate itself, held as a still (the master's archive stills are static). |

Product-size rule: a small product (glasses, a puck) must fill at least a third of the frame
whenever it is shown; otherwise H3 redraws it as a generic object. CAM-E (product in hand, wide) is
allowed only if the product is ≥ 1/3 of the frame height in both plates; prefer PRODUCT-HERO.

Then, before assembly, run `../tools/continuity.py` (plate adherence at both ends, held/morph heads,
jump cuts, grade jumps, camera move vs slot, speech windows) and repair: re-render from corrected
plates, trim held heads, grade-match. Assemble with `../tools/assemble.py`: each take placed once,
picture and sound windows from that placement, never retimed.
