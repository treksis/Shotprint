# Tools

Everything below runs from the workspace root.
ffmpeg, ffprobe, python3 and node are installed. You can look at images and video frames
yourself with your file-reading tool (extract frames with ffmpeg first).

## Measuring a video: `bin/dissect` (about 30 s, no model calls except the transcript)

```bash
bin/dissect inputs/film.mp4                          # dissection/film.md, film.json, film_shots_NN.jpg, film_contact_NN.jpg
bin/dissect inputs/film.mp4 --template film-style    # also a templates/film-style/template.json skeleton
```

`film.md` is the shot table (times, transition in, loudness, speech turns) plus soft-cut candidates,
black, silences and the transcript. The shot boards show every shot's start, middle and end. With
`--template`, `template.json` already holds every measured field; the `null` ones are yours (see
`docs/template_spec.md` and the `make-template` skill). `--threshold` (default 0.3) and `--min-shot`
(default 0.4 s) tune cut detection.

## Template cuts: `bin/template` (seconds, no model calls)

```bash
bin/template beats templates/x/set/score.wav               # tempo and bar starts: cut the score on these
bin/template score templates/x 30                          # set/score_30.wav from cut30.score.segments
bin/template reference templates/x 30 inputs/film.mp4 notes/ref30.mp4   # the real film cut to cut30
bin/template check templates/x                             # everything the spec requires; fix every FAIL
```

The reference is how you check a cut: extract frames from it and listen to its joins. It is for
checking only and never goes into the template.

## Stills: `bin/img` (Muse Image, $0.01 per image, 1280x720 PNG)

```bash
bin/img --out plates/s01.png --prompt "..."                                         # generate
bin/img --out plates/s01b.png --prompt "..." --image plates/s01.png --image inputs/face.jpg   # edit / composite
bin/img --out plates/v01.png --prompt "... vertical 9:16 ..." --portrait            # 720x1280
```

Refer to input images in the prompt as "image 1", "image 2"... in `--image` order.
`--fit pad` keeps the whole picture (for sheets) instead of cropping to fill the frame.

## Video: `bin/h3` (MiniMax-H3 on a shared GPU)

MiniMax-H3 generates **picture and sound together in one pass**: voice, lip movement, room tone,
effects and music all come out of the model, already in sync. A 5 s clip takes about 80-100 s
of GPU time (5 s requests come back as ~5.17 s), and the GPU is shared, so batches may queue.
The docstring at the top of `bin/h3` lists the job keys.

```bash
bin/h3 jobs/shots.jsonl   # render, wait, download to renders/<id>.mp4
bin/h3 wait               # keep waiting for a batch that is still running on the host (exit code 75)
bin/h3 status             # clips used / cap
```

If `bin/h3` says the renderer is offline, the GPU is switched off: keep going with plans and
stills, write the jobs file, and tell the person the shots are ready to render.

Two modes, picked by the job:
- **Keyframe mode**: no `refs`. Optional `first_frame` / `last_frame` image the clip starts or
  ends on. Prompt format: `docs/h3_prompt_guide/base-en.txt`.
- **Reference mode**: `refs` (images), `ref_audios` (voice timbre), `ref_videos`. Address them in
  the prompt as `<Picture 1>`, `<Audio 1>`, `<Video 1>` in list order; a reference the prompt
  never mentions is ignored. `first_frame` / `last_frame` are ignored in this mode.
  Prompt format: `docs/h3_prompt_guide/ref-en.txt`.
- `guide_audio` (a wav/mp3 take) makes the clip lip-sync to that exact recording. Use it with
  `first_frame` to re-render a take on its plate when picture and voice drift apart.

Spoken lines go inside `<d>...</d>` with the language tag, e.g.
`<d>[English] We build every pair by hand.</d>`.

A minimal keyframe job (one line of JSONL):

```json
{"id":"s01","seconds":5,"first_frame":"plates/s01.png","last_frame":"plates/s02.png","prompt":"summary:\n...\n\ndetailed_description:\n[Shot 1] ...\n\noverall_soundscape: ...\n\nnon_diegetic_music: ..."}
```

## Assembly

ffmpeg, or `tools/assemble.py` (reads a cut list). H3's audio and lips are generated together, so
changing a clip's speed or tempo breaks lip sync: trimming, fades and loudness are safe; retiming
is not. `tools/continuity.py` and `tools/grade_match.py` check cuts and match grades.
