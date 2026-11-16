# Insight360 website redesign

Static site for Insight360 (an IONEC brand). Live preview: https://insight360-redesign.netlify.app

## What is here

- Root: the built site, ready to serve. `netlify.toml` publishes this folder as is; there is no build step on Netlify.
- `img/film` and `img/film-sm`: the 200-frame hero film (1920 and 960 wide), scrubbed by scroll in `assets/site.js`.
- `media/insight360-hero-film.mp4`: the same film as a video file.
- `source/`: what the site is built from.
  - `pages/`: page bodies with a small header block (title, description, CTA text).
  - `assets/`: `site.css` and `site.js`.
  - `build2.py`: wraps each page in the shared head, header, CTA and footer and writes the HTML to the repo root. Run `python3 source/build2.py`.
  - `outline.py`: turns outline type (section numbers, step numbers, footer wordmark) into clean SVG paths. Needs `fonttools`, `skia-pathops`, `uharfbuzz` and Inter Display Light (path set in the file).
  - `film-boxes.json`: where the 3D unit sits in each film frame, used to centre it on phones.
  - `tools/`: the Three.js scene (`scene2.html`) and the scripts that render the frames, compute the boxes, encode the film and process the photographs.

## Forms

Netlify Forms handles three forms: `growth-audit` (contact page), `growth-scan` (brief sent from the home page scan) and `newsletter`. Form detection must be on in the Netlify project.

## Photography

Photographs are generated stock-style images, labelled illustrative on the site. Six slots still use stand-ins from the new set: glasswall, understand, screen, ops, report and roadmap.
