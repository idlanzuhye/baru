---
name: beatreel
description: Make talking-avatar explainer videos (9:16 or 16:9) from a JSON script - Kokoro voice, word-synced captions, one animated scene per idea, a presenter at the bottom, rendered with HyperFrames.
---

# beatreel

You write a script of **beats**: a beat is one idea, the line(s) that say it, and the scene that shows it.
beatreel voices the lines (Kokoro, offline), times every word, builds an HTML/GSAP page and renders it with
HyperFrames, then mixes the audio to -14 LUFS.

```bash
bash setup.sh                                  # once
./beatreel board path/script.json     # voice + frames sheet <name>-frames.jpg (middle of each beat)
./beatreel make  path/script.json     # <name>.mp4 next to the script
./beatreel say   "Postgres on macOS"  # how the voice reads a line, and which words it guessed
./beatreel icons rocket               # icon names for "icon": "set:name"
```

Work happens in `build/<name>/` next to the script (voice is cached until the lines change).

`./beatreel` means the `beatreel` file in this folder (the one holding this SKILL.md). When this is installed as a
skill (for example `~/.claude/skills/beatreel`) and you are working in another project, call it by its full path,
`~/.claude/skills/beatreel/beatreel make videos/x/x.json`, and keep the scripts and videos in the user's project.
Run `bash <this folder>/setup.sh` once if `.venv` doesn't exist here yet. Step-by-step workflow: `AGENTS.md`.

## Workflow

1. Write the beats. Keep each line literal: the scene must **show** what the line **says**. If you cannot name the
   object for a line, rewrite the line.
2. `board` → read `build/<name>/pronounce.txt` and fix guessed words with `voice.say`; look at the frames sheet.
3. `make` → check the first frames and a few frames per beat before handing the video over.
4. Cut each beat into 2 shots or more; scenes stay on screen ~2 s (`"max_hold": 2.6` warns about longer holds).
   When a scene's content arrives late (a pile, a row, a list), start its first piece at the beat start so the
   frame is never empty. Between scenes the last one stays up until the next arrives.

## Script

```json
{
 "name": "coffee", "theme": "studio",
 "voice": {"name": "af_heart", "speed": 1.0, "say": {"SQL": "sequel"}},
 "beats": [
  {"pose": "point_up",
   "lines": ["Coffee doesn't give you energy.", "It _hides_ how tired you are."],
   "shots": [
    {"type": "card", "icon": "fluent-emoji-flat:hot-beverage", "title": "Energy?"},
    {"type": "sticker", "lines": ["IT HIDES", "THE TIRED"], "red": true, "at": "word:hides"}]},
  {"pose": "count", "lines": ["Half of it is still in you five hours later."],
   "hero": {"type": "num", "value": 5, "suffix": " hrs", "at": "word:five"}}
 ]
}
```

**Top level**: `name`, `format` ("9:16" default, "16:9"), `bg` ("grid" default, "plain"), `colors` {accent, hi,
bg, ink, card, bad}, `theme` (`studio` default, `night`, `paper`, or your own), `voice` {name, speed (default 1.1), say,
gap_beat (0.2 s), gap_line (0.09 s), natural}, `music` {style: "soft" | "beat" | "none" (default), level (dB, default -33), bpm, transpose, duck_db},
`sfx` (false = no sound effects; on by default, from `engine/sfx/`), `sfx_level` (default -26), `intro` {sound: "file.wav", gain, lead},
`character` ("kai" default, "maya", "none", or a folder path), `avatar_colors`, `presenter` {scale, y},
`caption_words` (words per caption block, default 7), `caption_y` (y px, or [with presenter, without]),
`hero_scale` (every scene, default 1.3; scenes are scaled down to fit the frame anyway), `fx` (false = no
auto entrances, shakes, sparks), `presenter_move` (false = Kai stays centred), `hero_x`, `max_hold`, `meta` (true = slug row on top) + `counter`
{label, start}.

**Beat**: `kai` ("left" | "center" | "right"), `lines` (`_word_` = highlighted key word), `hero` (one item or a list, whole beat) or `shots` (a list;
each shot is an item or a list of items and lasts until the next shot's `at`), `pose`, `presenter` (false = hide
the presenter for this beat), `react` (word(s): burst lines around the head), `cam: "big"` (presenter starts
large until the first scene lands), `bg` ("red" floods the accent colour, "black"), `wipe` (true = an iris wipe
into this beat), `pause_before` (seconds), `slug`, `count` (new counter value), `keep` on a hero (stay N more
beats), `flash` ["word:x", seconds] (presenter cutaway).

**Times**: `"word:five"`, `"word:five#2"` (second "five" in the beat), `"word:five+0.2"`, `"next:word:x"` (a word
in the next beat), or seconds from the beat start. Omitted = beat start.

**Every item**: `type`, `at`, `until`, `x`, `y` (centre px; default 540, 820 with a presenter / 960 without),
`scale`, `rot`, `z`, `fit` (false = no auto-fit), `in` (zoom, left, right, up, down, flip, drop, swing; varied
automatically when omitted), `out` (left, right, zoom, down,
shrink), `exit: "cut"`, `pop: false`, `float: false`, `sfx` (false), `sfx_id` (a sound in `engine/sfx/index.json`, or any
earshot id when earshot is installed), `tilt` [rx, ry], `push` (slow zoom to this scale),
`icon` + `color` wherever an icon is shown. Icons are Iconify names (`lucide:key`, `simple-icons:github`,
`logos:python`, `fluent-emoji-flat:rocket`); never use emoji characters.

Layout: 9:16 puts the caption on top, the scene in y 300-1235 and the presenter at the bottom; 16:9 puts the
caption on top, the scene on the left (centre x 700, y 200-1020) and the presenter bottom right. Scenes are scaled
to fit their zone. For Reels, keep scenes clear of the platform's buttons on the right and the name row at the
bottom.

## Scenes

| type | keys |
|---|---|
| `card` | label, icon, title (html ok), text, img, w |
| `panel` | w, h, label, children [items placed in panel px, each with its own `at`] |
| `browser` | tab, url, icon, title, text, w, h, incognito |
| `num` | value, from, prefix, suffix, decimals, label, count (seconds), size: rolls like an odometer |
| `scramble` | text, red, size, decode, label: decodes from noise |
| `sticker` | lines [..], red, redLine, or text, size |
| `stamp` | text, size |
| `shot` | src, label, w, rings [[x%, y%, w%, h%]], ringAt [times]: a screenshot with rings on what matters |
| `image` | src, w, radius, shadow |
| `video` | src, media, url, tab, w, aspect, fit, words [[time, text, red]]: a clip in a browser window |
| `clip` | src (mp4/webm, alpha ok), w, h, media: a pre-rendered shot with no frame |
| `phone` | src or title, scale |
| `term` | title, lines [..] ("$ " lines are commands; FAILED/OK words colour), typeDur, w |
| `code` | file, tag, lines, lang ("py"/"md"), rows, fs, scroll [[time, line]], marks [{line, to, at, until, tag, color}], scanAt |
| `logo` | icon, color, name |
| `wordmark` | text, typeAt, typeDur, badge, badgeIcon, sub |
| `list` | title, items, ticks [times], mark ("x" = crosses), w |
| `row` | tiles [{icon, label}], ats, crossAt: icon tiles landing one per word |
| `grid` | n, cols, shape ("doc"), hi [indexes], hiAt, dropAt |
| `dots` | n, cols, cell, hi, hi2, redAt, darkAt, legend [[time, text, "r1"/"r2"]]: a share of 100 |
| `compare` | left {title, text}, right {title, text}, rightAt, swap |
| `gauge` | title, value (0-100), verdict, at2, count |
| `spike` | title, points [0-100], peakLabel, drawAt, dur: a chart that spikes |
| `tokbars` | title, rows [{name, parts [{v, c, label}]}], ats, max, note: stacked bars |
| `limits` | items [{name, to, end}], drainAt, dur: meters that drain at different speeds |
| `burn` | label, sub, to, dur: a counter that burns up |
| `coins` | n, text, textAt: coins pouring |
| `hub` | icon, label, items [{icon, title, a (angle)}], ats, plug, fromIcon, plugAt: one thing reaching many |
| `pile` | items, hi, dropAt, each, fs: labels rain down and pile up |
| `domino` | items, fallAt, each |
| `status` | title, items [{icon, title}], ats, downAt [times], downText: a status board going down |
| `world` | redAt, spread, pin, arcs [[city, city]], arcsAt, icon, crackAt, label, labelAt: a dotted world map |
| `upgrade` | icon, title, sub, doneAt, done, bugIcon, bugAt |
| `restart` | icon, text, pressAt, dur |
| `freeze` | title, items, freezeAt, icon, snowIcon, text |
| `clock` | text, sub, spinAt, dur, turn |
| `date` | month, day |
| `flip` | pages [{m, d, y}], flipAt, dur: calendar pages flipping |
| `mail` | n, title, icon, dropAt, each, countAt, hours, releaseAt, okAt: envelopes held in a tray |
| `send` | from, fromIcon, to, toIcon, c, sendAt: a paper plane to someone |
| `chat` | title, icon, file, ext, meta, msg, dropAt, tokens, dur: a file dropped into a chat |
| `files` | items [{ext, name, c}], ats, suckAt, outAt, outName: files (optionally converted into one) |
| `morph` | before (html), lines, file, flipAt, w: a document turning into plain text |
| `page3d` | scanAt, rx, rz: a page tilted in 3D being scanned |
| `gift` | icon, openAt, tag, tagAt |
| `repo` | icon, owner, name, desc, chips, chipAt, count: a code repository card |
| `stars` | rollAt, dur, to, n, curIcon, label: stars being added |
| `starburst` | text, sub, icon, burstAt |
| `meet` | people [{n, c}], title, icon, bot, claudeAt (bot joins), speak, typing, outsiderAt, leaveAt, endAt: a video call |
| `doc` | title, by, icon, lines ["# heading", ...], ats or step: a doc writing itself |
| `speak` | who, c, text, dur: someone speaking (waveform + words) |
| `sort` | title, notes [{t, col, c}], ats, sortAt, cols: sticky notes sorted into columns |
| `answer` | who, q, docs, hit, a, link, bot, checkAt, answerAt, linkAt |
| `mpage` | title, sub, icon, items [{icon, title, sub}], ats |
| `wave` | label, strikeAt |
| `plans` | items [{t, ok}], markAt |
| `xpost` | src, iw, head, crop, w, label, marks [{r, at}]: a post screenshot with highlighted words |
| `comment` | who, keyword |
| `follow` | img (optional), handle, text, tapAt |
| `profile` | img, handle, cat, bio, covers, tapAt, gridAt |
| `html` | html (escape hatch) |

`examples/tour/` shows most of them one per beat.

## Presenter (Kai or Maya)

Kai is the default. **When someone asks for a female presenter**, set `"character": "maya"`: the same rig and
poses with long hair, lashes, lips, earrings and her own palette, and the default voice switches to a female one
(`af_heart`; other female voices: `af_bella`, `af_nicole`, `af_sarah`, `bf_emma`, `bf_isabella`). Recolour either
with `avatar_colors`. Both stay on screen the whole video and move left / centre / right (`kai` per beat).

Poses: talk, calm, smile, explain/present, both, hi/wave, point_up, point_side, one, count, count3, shrug, shocked,
gasp, oops, excited, shh, thumbs_up, think, wait, stop, facepalm, clasp, arms_crossed. Moods on the talk arms:
laugh, nervous, stressed, sad, angry, bored, skeptical, wink, cry, panic. See `docs/kai-poses.jpg`.
`avatar_colors` keys: skin, skinSh, hair, hairHi, shirt, shirtSh, shirtHi, cuff, tee, iris, shadow, mark.

## Make your own presenter

When someone asks for their own character, pick the lightest route that gets them what they described:

1. **Recolour** Kai or Maya: `"avatar_colors": {"skin": "#8d5a3b", "hair": "#c9a227", "shirt": "#1f6f8b", ...}`.
   Enough for a different skin tone, hair colour or outfit.
2. **A new look in code** (new hair, face details, accessories), drawn on the same rig so every pose, mood, blink and
   lip-sync keeps working. Maya is the worked example: in `engine/avatar.js` search for `FEM`. A look is a set of
   extra shapes in the existing groups (long hair goes in `backHair` behind the body, side locks in `body`, fringe,
   lashes and earrings in `head`) plus a palette that overrides `C`. To add one:
   - add a flag next to `FEM` (for example `const ROBOT = A.look === 'robot'`), a palette for it next to Maya's, and
     its shapes in the same places Maya's go; keep the head, eyes and mouth geometry so the face still animates;
   - register the name in `LOOKS` at the top of `beatreel.py` (`"rio": "robot"`); add the look to `FEMALE_LOOKS` if it
     should default to a female voice;
   - use it with `"character": "rio"`, run `board` on a short script and check a few poses (`hi`, `shrug`, `excited`,
     `think`) at full size before rendering.
3. **A character you already have** (drawn, 3D or filmed): put one transparent video (webm with alpha) in a folder
   with a `character.json` listing a clip per pose (see README, "Presenter"), and use `"character": "path/to/folder"`.

## Checking frames by hand

The page is one paused GSAP timeline (`window.__timelines.reel`). To screenshot a moment, seek with events on:
`tl.seek(t, false)` (Kai redraws in onUpdate), and don't return the timeline from a Playwright `evaluate`.

## Adding a scene type

Add a builder to `B` in `engine/beats.js` (`(o, el, t) => {...}`; change state with `tl.set(...)`/tweens at
absolute times, never callbacks, so any frame can render in any order), its CSS in `engine/style.css`, and any new
time keys (`somethingAt`) to `TIME_ONE` / `TIME_LISTS` in `beatreel.py` so `"word:x"` resolves.
