# Instructions for AI agents

This repo turns a JSON script into an explainer video: voice, word-synced captions, one animated scene per idea and
a talking presenter. When someone asks you for a video about a topic, follow these steps. The full script reference
(every key and scene type) is in `SKILL.md`; read it before writing a script.

## 1. Set up (once per machine)

```bash
bash setup.sh
```

It needs Python 3.10-3.13, Node 18+, ffmpeg and internet for the first run (voice model ~340 MB, GSAP, icons,
headless Chrome). If it stops asking for Python, install it (`brew install python@3.12` on macOS, or the distro's
python3.12 + venv package on Linux) and run it again. If ffmpeg is missing, install it the same way. Always run
beatreel through `./beatreel`, which uses the Python that setup installed.

## 2. Settle the brief

Use what the user gave you. For anything they did not say, use the defaults below rather than asking, and say in
one line which ones you used:

| | default | other options |
|---|---|---|
| format | 9:16 (Reels, Shorts, TikTok) | 16:9 (YouTube) |
| length | 20-40 s (about 60-110 spoken words) | |
| presenter | Kai, male voice | Maya (`"character": "maya"`, female voice) when they ask for a woman / female presenter; their own character (SKILL.md, "Make your own presenter"); `"none"` |
| look | white with a faint grid | `"bg": "plain"`, `"colors": {"accent": ...}`, `"theme": "night"` |
| sound | sound effects on, no music | `"music": {"style": "soft"}`, `"sfx": false` |

## 3. Research, then write the script

- Check every fact, number and name you put in the video against a current source. If you cannot check
  something, leave it out.
- Write short, spoken sentences. A beat is one idea: 1-2 lines. Open with a hook line, end with a call to action
  (follow, send to a friend, comment a word).
- Every beat gets `"shots"`: 2 or more scenes that cut on the words (`"at": "word:xyz"`), each up to ~2.5 s. The
  scene must show what the line says. Mix scene types; don't repeat one scene type for the whole video.
- When a brand or product is named, show its logo (`"type": "logo"`, `"icon": "simple-icons:<brand>"`; find names
  with `./beatreel icons <word>`). Never use emoji characters as icons.
- Mark 1-2 key words per line with `_word_` for the highlight.
- Write for the ear: short sentences (8-14 words), contractions, numbers the way people say them ("about half",
  "thirty-one thousand"), a comma where a speaker breathes, no parentheses or slashes. Keep the default
  `speed` 1.1 unless the user asks for slower or faster (range 1.0-1.2).
- Put the script in its own folder outside `examples/`, for example `videos/<name>/<name>.json`, with any images
  it uses next to it. Don't change files in `engine/` or `core/` unless the user asks for an engine change.

## 4. Check before rendering the full video

```bash
./beatreel board videos/<name>/<name>.json
```

- Read `videos/<name>/build/<name>/pronounce.txt`. Every word marked `?` was guessed by the voice: check how it
  is read with `./beatreel say "the line"` (it prints the phonemes) and fix wrong ones in `"voice": {"say": {"Word": "respelling"}}`.
- Open `videos/<name>/<name>-frames.jpg` (the middle of every beat). Check that every scene is readable, nothing
  is cut off at the edges, and nothing covers the presenter's face.

## 5. Render and check

```bash
./beatreel make videos/<name>/<name>.json
```

The video is `videos/<name>/<name>.mp4`. Before handing it over, look at more than the board: for example
`ffmpeg -i videos/<name>/build/<name>/silent.mp4 -vf "fps=1.5,scale=216:-2,tile=9x4" -frames:v 1 sheet.jpg`,
then open `sheet.jpg`. Fix empty frames, overlaps and anything cropped, then render again.

Hand over the mp4 with a one-line summary (length, format, presenter) and the sources you used for the facts.

## If something fails

- `GSAP not found`: run `npm install` in the repo.
- `Kokoro model not found`: run `bash setup.sh` again (it resumes).
- `render failed` mentioning a browser: run `npx playwright install chromium-headless-shell`, or set
  `HYPERFRAMES_BROWSER_PATH` to a Chrome / headless-shell binary.
- A word not found (`word "x" not in its lines`): the `at` word must appear in that beat's lines, spelled the same.
- No internet in your sandbox: setup can't download the voice model or Chrome. Tell the user to run it on their own
  machine (Claude Code or Codex CLI) instead.
