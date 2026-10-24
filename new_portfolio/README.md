# Shaunak Chorge - portfolio and freelance site

The source of <https://shaunakchorge.github.io/Portfolio/new_portfolio/>: a home page plus dedicated pages for services, projects (with case studies), about, FAQ, contact and a resume view. The pages are generated from one content file, so changing a sentence or a project is a one-file edit followed by one command.

## Rebuild

```bash
npm i                    # once: installs esbuild (needed only for the minified build)
node build.mjs --min     # the build you deploy
```

`node build.mjs` (without `--min`) does the same but links the readable `assets/css` and `assets/js` files, so it needs no install at all.

One run does, in order:

1. **Generators** write the partials and script data from `content/content.json`: the hand-off files in `src/generated/` (hero, home sections, home page data), the data block inside `assets/js/sections/fx.js`, and the owner's project selector, `tools/project-selector.html`.
2. **Assemble** `index.html` (the home page) from `src/shell.html` and the partials.
3. **Pages** (`tools/pages/build-pages.mjs`): `services/`, `projects/`, `about/`, `faq/`, `contact/`, `resume/`, one case study per entry in `projects.config.json`, then `llms.txt` and `llms-full.txt` here and, once, `sitemap.xml` and `robots.txt` in the repo root (next to the redirect `index.html`).
4. **Guard** scans the output for strings that must never ship, checks that the spoken-language list appears exactly once (home page About card) and that every internal link and anchor resolves. The run exits non-zero if anything is wrong.

It prints a summary (pages, services, case studies, sitemap URLs). Other flags: `--skip-gen` reuses the existing files in `src/generated/`; `--only=hero,home-faq --out=preview-x.html` assembles one throwaway preview page (delete it afterwards).

## Structure

```
content/content.json     THE source of copy and facts: profile, services, projects, experience, FAQ, page titles, SEO
projects.config.json     which projects are selected, which get a case study (see below)
build.mjs                the build (one command) and the shared page renderer
package.json             esbuild (minifier) is the only dependency; package-lock.json pins its version
src/
  shell.html             head, header, drawer, footer slot, scripts        (hand-edited)
  footer.html            footer                                            (hand-edited)
  site.config.json       name, e-mail, profile links, Person schema        (hand-edited)
  generated/             hero, home sections, home page data               (written by every build, git-ignored)
tools/
  hero/ home/ fx/        generators for the home page
  pages/                 page generators and SEO files (sitemap, robots, llms)
  selector/              generator + template for tools/project-selector.html (owner tool, open it in a browser)
  photo/                 one-off: turns a portrait photo into the neon portrait images
assets/
  css/  js/              styles and scripts (hand-edited); dist/ is the minified output (generated)
  fonts/                 self-hosted fonts
  img/                   icons, social image, portrait/ (the neon portrait)
  Shaunak-Chorge-Resume.pdf
index.html  services/  projects/  about/  faq/  contact/  resume/        generated pages
llms.txt  llms-full.txt  site.webmanifest  .built-pages.json              generated / static site files
```

Never edit a generated file by hand; the next build overwrites it. Change the content file or the generator that wrote it.

## Edit content

Open `content/content.json`, change the text, run `node build.mjs --min`. The main blocks:

| block | feeds |
|---|---|
| `seo` | home title and description, keywords, and `site_url` (the one base-URL value) |
| `pages` | title, description, H1 and intro of every page |
| `profile`, `hero`, `stats` | home hero, contact details, status line |
| `services[]` | the six service pages and the home service cards |
| `projects[]` | cards, case studies, the project lists, the resume view |
| `experience`, `education`, `certifications`, `achievements` | about page, resume view, home roles |
| `faq`, `faq_all` | home FAQ (top five), FAQ page and its schema |
| `skills` | the two stack tiers: Core stack, Also work with |
| `about.whoami` | the terminal card on the home page, the only place the spoken languages appear |

Rules the guard enforces: no project years, no list of spoken languages outside the home About card, co-builders credited by plain-text name only (no links to other people's profiles), extensions I can offer on case studies listed only under "Extensions I can build for you".

To add a project, add an object to `projects[]` (copy an existing one: `id`, `slug`, `title`, `card_blurb`, `stack`, `service_tags`, ...). A project gets a case-study page only if it has a `case_study` block and its id is in `casestudy` below.

## Choose which projects show

`projects.config.json` has up to four lists of project ids:

```json
{ "show": ["..."], "casestudy": ["..."], "more": ["..."], "omit": ["..."] }
```

- `show`: the selected projects (cards on the projects page, counted in the home stat).
- `casestudy`: the ones that get their own page. Must have a `case_study` block in the content file.
- `more`: the compact "More projects" list (early and small projects).
- `omit`: hidden everywhere.

Lists you leave out fall back to `selection_default` in the content file. The build also writes `tools/project-selector.html` (tracked, harmless, opens straight from disk): open it in a browser, tick projects, copy the generated JSON into `projects.config.json` and rebuild.

## Deploy

GitHub Pages serves the repository as-is, so commit the generated pages (`index.html`, the page folders, `assets/dist/`, `llms*.txt`, `.built-pages.json`, and the repo-root `sitemap.xml` and `robots.txt`) together with the sources and push. Settings -> Pages -> Deploy from a branch -> `main` / root. Every URL in the pages is relative, so the site works under a sub-path and from `file://`.

## Add a custom domain

1. Change `seo.site_url` in `content/content.json` to the new address (keep the trailing slash).
2. Run `node build.mjs --min`. Canonical links, Open Graph URLs, JSON-LD, `sitemap.xml`, `robots.txt` and `llms.txt` all derive from that one value. The build writes `sitemap.xml` and `robots.txt` once, in the repo root.
3. If `new_portfolio/` becomes the site root of the new domain, add a `CNAME` file there, copy the repo-root `sitemap.xml` and `robots.txt` into it, and point DNS at Pages. The repo-root `index.html` redirect and `404.html` contain the old address; they are not needed once the domain serves this folder directly.
4. Submit the new `sitemap.xml` in Search Console.

## Portrait photo

`tools/photo/process-photo.mjs` turns the finished portrait artwork into the images in `assets/img/portrait/`. The artwork keeps its own colours and tone exactly: the tool does no grading, only adds a clean transparent background (so it blends into the page) and a separate glow-only rim layer. The neon frame, rim pulse and scan sweep are page layers in `assets/css/sections/portrait.css`. The original stays private (the owner keeps it in the git-ignored `_private/` folder of the repo):

```bash
npm i --no-save sharp
node tools/photo/process-photo.mjs path/to/artwork.png
```

Master size is 3:4 (800 x 1067); outputs are `portrait-480/800.webp|avif` and `rim-480/800.webp`, each under 120 KB. A flat background (black or white studio) is keyed out by a border flood fill that never touches anything inside the figure; any other background uses `rembg` through Python when available (`pip install rembg onnxruntime`). The social image and icons are static files in `assets/img/` and are not part of the build.

## Single sources (so pages cannot drift)

- Entity sentence: `seo.entity` in `content/content.json` is the Person description in the JSON-LD of the home page and /about/, the /about/ lead and the first line of `llms.txt` / `llms-full.txt`.
- Footer service and work lists are generated from `services[].page_slug` / `nav_label` and `selection_default.footer_work` (`footerParts` in `build.mjs`), so a footer link always points at a page that exists. The build guard also resolves every internal link.
- Project visuals: `visual_hint` (type) and optional `visual_variant` per project. `assets/js/sections/visuals.js` draws a variant only when it belongs to that project and otherwise falls back to the neutral generic visual.

## Notes

- `sitemap.xml` `lastmod` comes from `meta.generated` in the content file (override with `PF_LASTMOD=2026-12-31`), so rebuilding without content changes gives identical files.
- The contact form posts to Formspree (`profile.links.formspree`); nothing else leaves the page.
- Font and icon licences: Orbitron, Space Grotesk and Space Mono (SIL OFL 1.1, self-hosted); Lucide icons (ISC).
