# Shaunak Chorge - Portfolio

Portfolio of **Shaunak Chorge**, AI Engineer at Claptek Pvt Ltd, based in Mumbai, India. He builds AI-powered applications and solutions: computer vision, speech and machine learning, RAG chatbots that answer from your own documents, FastAPI and Django backend services, and automation. Open to select AI and backend projects.

Live: <https://shaunakchorge.github.io/Portfolio/new_portfolio/> - Code: <https://github.com/ShaunakChorge/Portfolio>

## Repository layout

- `new_portfolio/` - the current site. It builds itself from one content file; see [`new_portfolio/README.md`](new_portfolio/README.md) for the structure, how to edit content, how to rebuild and how to move to a custom domain.
- `old_portfolio/` - the previous site, kept for reference and still served at `/Portfolio/old_portfolio/`. It is not in the sitemap and its home page carries a `noindex` tag, so search engines list only the new site. Its "Download CV" button points to the current resume PDF. Delete the folder to remove it completely.
- `.github/` - `workflows/pages.yml` and `scripts/stage-site.mjs`: the prepared, NOT enabled way to serve the new site at the root of `/Portfolio/` (see below).
- Repo root - `index.html` (redirect to `new_portfolio/`), `404.html`, `robots.txt`, `sitemap.xml` (both written by the build), `.nojekyll`, this README.
- Local only, never committed (listed in `.gitignore`): `_private/` (source photo and personal notes) and `.claude/`.

## Build

```bash
cd new_portfolio
npm i                    # once
node build.mjs --min     # regenerates every page, the root sitemap.xml and robots.txt, and llms.txt
```

Then commit the result.

## Deploy on GitHub Pages

1. Repository `ShaunakChorge/Portfolio` -> **Settings -> Pages** -> *Build and deployment*: **Deploy from a branch**, branch `main`, folder `/ (root)`.
2. Commit and push. The site goes live within a minute or two.
3. `.nojekyll` makes Pages serve the files as-is, and Pages uses `404.html` for unknown URLs.
4. To use a custom domain, see the next section. Changing `seo.site_url` and rebuilding is not enough on its own.

## Serve the site at the root of /Portfolio/ (prepared, not enabled)

Today the site is at `https://shaunakchorge.github.io/Portfolio/new_portfolio/` and `/Portfolio/` is only a redirect page. Nothing is indexed yet, so this is the cheapest moment to choose the final address: `https://shaunakchorge.github.io/Portfolio/` (shorter URLs, one canonical home page, no redirect page in front). The workflow `.github/workflows/pages.yml` publishes the `new_portfolio` folder as that root. It does nothing on its own: it runs only when started by hand, and its deploy step fails until the setting below is switched.

**What you click, in this order**

1. (Recommended, so the files in the repository match what is published.) In `new_portfolio/content/content.json` set `"deploy_root": true` under `seo`, run `cd new_portfolio && node build.mjs`, commit and push. The workflow sets the same flag itself, so a deploy is correct even if you skip this step.
2. On GitHub: repository `ShaunakChorge/Portfolio` -> **Settings** -> **Pages** -> *Build and deployment* -> **Source** = **GitHub Actions**. Do this step only now: it stops the "Deploy from a branch" publishing.
3. **Actions** tab -> **Deploy site to GitHub Pages** -> **Run workflow** (branch `main`). To deploy on every push instead, delete the `#` in front of the three lines under `on:` in `pages.yml`.
4. Open `https://shaunakchorge.github.io/Portfolio/` and check it. Then in Google Search Console add a **URL-prefix** property for `https://shaunakchorge.github.io/Portfolio/` and submit `sitemap.xml`; do the same in Bing Webmaster Tools. If Search Console asks you to verify with an HTML file, put the downloaded `google....html` file inside `new_portfolio/` (the workflow publishes it at the root; the deploy check skips a file that is not a full page).

**To go back:** Settings -> Pages -> Source = *Deploy from a branch* (`main` / root), set `"deploy_root": false`, rebuild, commit.

**What changes (read before step 2)**

- **URLs change.** `/Portfolio/new_portfolio/services/` becomes `/Portfolio/services/`, and so on for every page. The workflow also publishes a small redirect page (canonical link plus instant refresh; GitHub Pages cannot send a real 301) at every old address, so links made before the move still arrive on the right page. Do not build outside links to the old addresses.
- **The old site stays** at `/Portfolio/old_portfolio/` (the workflow copies it). Delete the folder to remove it.
- **Canonical, sitemap, `site_url`.** Canonical links, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt` and both `llms` files all move to the new base URL together. That is the one flag: `seo.deploy_root` makes `seo.site_root_url` the base URL instead of `seo.site_url`, and `sitemap.xml` / `robots.txt` are written inside `new_portfolio/`. Nothing else needs editing.
- **Not published any more:** the repo-root `index.html` redirect, the repo-root `sitemap.xml` / `robots.txt` (the new ones are inside the site), and the sources inside `new_portfolio/` (`src/`, `tools/`, `content/`, `README.md`, build files). `404.html` is copied with its addresses moved to the root.
- **Still a project path.** `robots.txt` and `llms.txt` are only read at the root of a host, so crawlers still will not find them; the sitemap must be submitted by hand (step 4). A user-site repository named `shaunakchorge.github.io`, or a custom domain, removes that limit (see the next section); moving there later changes the addresses again.
- **The resume PDF** prints the address of the site. It is not rebuilt by the workflow; run `node new_portfolio/tools/resume/make-pdf.mjs` after the move if you want the new address in it.

## Move to a custom domain

The build derives every page address, the sitemap, `robots.txt` and `llms.txt` from one value, `seo.site_url`. The root files are written by hand and still carry the current address, so do these four steps:

1. `new_portfolio/content/content.json`: set `seo.site_url` to the new address of the `new_portfolio/` folder (keep the trailing slash), then run `node build.mjs --min` and commit.
2. Root `index.html`: the canonical link on line 7 holds the current address. The redirect itself (`./new_portfolio/`) is relative and needs no change while the domain serves this repository root.
3. Root `404.html`: three absolute links (lines 139, 160 and 164) hold the current address, and the second font source on each of lines 17, 19, 21 and 23 starts with `/Portfolio/`. Replace that prefix with `/` on the new domain.
4. A `CNAME` file in the repository root containing the domain name, plus the DNS records and the Custom domain field in Settings -> Pages. Then submit the new `sitemap.xml` in Google Search Console and Bing Webmaster Tools.

Smaller leftovers (not read by the build): the Live link at the top of this README, the canonical link in `old_portfolio/index.html`, the address text in the resume PDF made by `new_portfolio/tools/resume/make-pdf.mjs`, and the unused `site.url` and `links.previous_site` values in `content.json`. To find every remaining mention, search the repository for `shaunakchorge.github.io` after the rebuild. The build and the guard already regenerate the pages, `llms` files, sitemap and `robots.txt`; the old site links to two of the author's own other projects, which stay as they are.

## Credits

- [Lucide](https://lucide.dev) icons (ISC), inlined as an SVG sprite.
- [Orbitron](https://fonts.google.com/specimen/Orbitron), [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk) and [Space Mono](https://fonts.google.com/specimen/Space+Mono) from Google Fonts (SIL Open Font License 1.1), self-hosted.
- [esbuild](https://esbuild.github.io) (MIT) for the minified build. [Playwright](https://playwright.dev) and [sharp](https://sharp.pixelplumbing.com) are optional and used only by the tools that make the social image, the resume PDF and the portrait.
- The neon visual language is adapted from the NeoTech cyberpunk template. The SC monogram is an original mark.

(c) Shaunak Chorge. Site code and content are for portfolio use; third-party tools and fonts keep their own licences.
