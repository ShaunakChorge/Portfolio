# Shaunak Chorge - Portfolio

Portfolio and freelance site of **Shaunak Chorge**, AI Engineer at Claptek Pvt Ltd, based in Mumbai, India. He takes select freelance AI and backend projects: LLM apps and RAG, computer vision, speech and ML, FastAPI and Django services, automation.

Live: <https://shaunakchorge.github.io/Portfolio/new_portfolio/> - Code: <https://github.com/ShaunakChorge/Portfolio>

## Repository layout

- `new_portfolio/` - the current site. It builds itself from one content file; see [`new_portfolio/README.md`](new_portfolio/README.md) for the structure, how to edit content, how to choose which projects show, how to rebuild and how to move to a custom domain.
- `old_portfolio/` - the previous site, kept unchanged and still served at `/Portfolio/old_portfolio/`.
- Repo root - `index.html` (redirect to `new_portfolio/`), `404.html`, `robots.txt`, `sitemap.xml` (both written by the build), `.nojekyll`, this README.
- Local only, never committed (listed in `.gitignore`): `_private/` (source photo and personal notes) and `.claude/`.

## Build

```bash
cd new_portfolio
npm i                    # once
node build.mjs --min     # regenerates every page, the root sitemap.xml and robots.txt, and llms.txt
```

Then commit the result. `tools/project-selector.html` (a small owner tool for picking which projects show) is rebuilt by the same command.

## Deploy on GitHub Pages

1. Repository `ShaunakChorge/Portfolio` -> **Settings -> Pages** -> *Build and deployment*: **Deploy from a branch**, branch `main`, folder `/ (root)`.
2. Commit and push. The site goes live within a minute or two.
3. `.nojekyll` makes Pages serve the files as-is, and Pages uses `404.html` for unknown URLs.
4. A custom domain only needs `seo.site_url` changed in `new_portfolio/content/content.json` and a rebuild (details in `new_portfolio/README.md`).

## Credits

- [Lucide](https://lucide.dev) icons (ISC), inlined as an SVG sprite.
- [Orbitron](https://fonts.google.com/specimen/Orbitron), [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) and [Space Mono](https://fonts.google.com/specimen/Space+Mono) from Google Fonts (SIL Open Font License 1.1), self-hosted.
- [esbuild](https://esbuild.github.io) (MIT) for the minified build, [Playwright](https://playwright.dev) and [axe-core](https://github.com/dequelabs/axe-core) for testing, [sharp](https://sharp.pixelplumbing.com) for image conversion.
- The neon visual language is adapted from the NeoTech cyberpunk template. The SC monogram is an original mark.

(c) Shaunak Chorge. Site code and content are for portfolio use; third-party tools and fonts keep their own licences.
