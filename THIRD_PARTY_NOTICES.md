# Third-party notices

beatreel's own code (everything in this repository except the files listed under "Bundled") is MIT, see
`LICENSE`. It works with other projects that keep their own licences.

## Bundled in this repository

| What | Files | Licence |
|---|---|---|
| Space Grotesk, Instrument Serif, Inter, JetBrains Mono, Archivo, Obel Mono | `engine/fonts/*.woff2` | SIL Open Font License 1.1, see `engine/fonts/OFL.txt` |
| Sound effects (12 short code-made sounds rendered from earshot's bank, Copyright (c) 2026 Leon Lin) | `engine/sfx/*.wav` | MIT |
| World map points, generated with [dotted-map](https://github.com/NTag/dotted-map) | `engine/worldmap.js` | MIT (dotted-map) |

## Installed by `setup.sh` (not bundled)

| What | Used for | Licence |
|---|---|---|
| [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) via [kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx) | the voice | Apache 2.0 (model), MIT (kokoro-onnx) |
| [misaki](https://github.com/hexgrad/misaki) | text to phonemes | Apache 2.0 |
| phonemizer, espeak-ng (pulled in by kokoro-onnx) | fallback phonemes | GPL-3.0 |
| spaCy, num2words, NumPy, SciPy, soundfile, pyloudnorm, Pillow | text and audio processing | MIT / BSD / LGPL, see each project |
| [GSAP](https://gsap.com) (npm `gsap`) | animation | GSAP Standard "no charge" licence, https://gsap.com/standard-license |
| [HyperFrames](https://www.npmjs.com/package/hyperframes) (run with `npx`) | rendering HTML to video | Apache 2.0 |
| [Iconify](https://iconify.design) icon sets: logos, simple-icons, devicon, lucide, tabler, fluent-emoji-flat | icons | CC0 / MIT / ISC per set. Brand logos stay their owners' trademarks. |
| [earshot](https://github.com/Leonxlnx/earshot) (optional, `setup.sh --sfx`) | sound effects | MIT |

Videos you make with beatreel are yours. If you put brand logos, screenshots or other people's material in a
video, you are responsible for having the right to use them.
