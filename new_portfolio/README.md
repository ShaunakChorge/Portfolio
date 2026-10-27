# Shaunak Chorge - portfolio site

The source of <https://shaunakchorge.github.io/Portfolio/new_portfolio/>: a home page plus dedicated pages for services, projects (with case studies), about, FAQ, contact and a resume view. The pages are generated from one content file and one project list, so changing a sentence or a project is a one-file edit followed by one command.

## Rebuild

```bash
npm i                    # once: installs esbuild (the minifier)
npm run build            # = node build.mjs, the build you deploy
npm test                 # builds a copy in a temp folder and checks it; changes nothing in the repo
```

`node build.mjs` minifies the styles and scripts into `assets/dist/` and links those files with a `?v=` hash. It checks that esbuild is installed before it touches anything. `node build.mjs --dev` (or `npm run build:dev`) links the readable `assets/css` and `assets/js` files instead and needs no install, but the pages it writes are the deployed pages, so run the default build again before you commit. The guard fails a default build that finds a readable-asset link.

One run does, in order:

1. **Generators** write the partials and script data from `content/content.json` and `projects.config.json`: the hand-off files in `src/generated/` (hero, home sections, home page data), and the data block inside `assets/js/sections/fx.js`.
2. **Assemble** `index.html` (the home page) from `src/shell.html` and the partials.
3. **Pages** (`tools/pages/build-pages.mjs`, run in the same process): `services/`, `projects/`, `about/`, `faq/`, `contact/`, `resume/`, one case study per entry in `casestudy`, then `llms.txt` and `llms-full.txt` here and, once, `sitemap.xml` and `robots.txt` in the repo root (next to the redirect `index.html`).
4. **Guard** scans the output for the words in `tools/rules.mjs`, checks every built page and llms file for tallies, keyboard-shortcut hints, closed `<details>` and a Home link in the navigation, checks that the spoken-language list appears exactly once (the quick-facts card of the About page) and that every internal link and every `#anchor` resolves, including the `contact/?topic=...#hire` links behind the "Hire me" buttons. The run exits non-zero if anything is wrong.

It prints a summary (pages, services, case studies, sitemap URLs). Other flags: `--skip-gen` reuses the existing files in `src/generated/`; `--only=hero,home-faq --out=preview-x.html` assembles one throwaway preview page with readable assets (delete it afterwards).

`npm test` copies the site to a temp folder and checks that: the build passes; a second build writes byte-identical files; the files in the repo equal a clean build (if not, the deployed pages are stale: run `npm run build`); the link guard really catches a renamed `#hire` anchor; the keyword guard catches each rule it states; and the owner's rules hold on the real pages (the selected projects in priority order, no tallies or shortcut hints, nothing collapsed, Personal builds on /projects/ only, one Traceable AI Backend, the three "How I work" sentences, the resume PDF unchanged) and are caught when broken. It also reads the CSS of the About portrait and works out its two polygons for several frame shapes (eight corners, four true 45-degree cuts, an even 2px outline). It works out where the browser puts the certificate tiles for every list of up to eight tiles (list order kept, a short last row centred) and checks the ribbon (room for a lifted chip, a hit strip as tall as the lift), the background network (its loop ends for reduced motion only), that no button anywhere pauses, stops or restarts the effects or changes the accent colour or theme (judged by what each button says: a verb with what it acts on, a toggle that is not a filter, and a short known list of the buttons the scripts build), that no script or inline script changes the tab title (the usual spellings are tried, comments are ignored), and that the deploy staging script (`.github/scripts/stage-site.mjs`) passes on a clean build, leaves a one-line Search Console verification file alone and stops on a page with another title.

## Structure

```
content/content.json     THE source of copy and facts: profile, services, projects, experience, FAQ, page titles, SEO
projects.config.json     THE project list: which projects show (in priority order), their collage tile sizes, which have a case study (see below)
build.mjs                the build (one command) and the shared page renderer
package.json             esbuild (minifier) is the only dependency; package-lock.json pins its version
src/
  shell.html             head, header, drawer, footer slot, scripts        (hand-edited)
  footer.html            footer                                            (hand-edited; its lists and profile links are filled in by the build)
  site.config.json       name, tagline, Person schema                      (hand-edited; e-mail and profile links come from content.profile)
  generated/             hero, home sections, home page data               (written by every build, git-ignored)
tools/
  lib.mjs                paths, esc, icon: the one shared helper file
  rules.mjs              the ONE list of banned words and patterns (generators and guard)
  selection.mjs          reads and checks projects.config.json: the one place that decides which projects show and how the collage is laid out
  hero/ home/ fx/        generators for the home page
  connect.mjs            the ways to connect (content.connect): book a call, send a brief, WhatsApp, email. Read by the contact page strip and by build.mjs (the floating menu)
  pages/                 page generators and SEO files (sitemap, robots, llms, the contact card .vcf); ui.mjs holds the shared UI pieces: contact form, booking picker, channel list, education collage, certificate tiles, ask box, related cards, pipeline diagram
  test.mjs               npm test
  optional.mjs           loads Playwright and sharp, which are installed on demand and are not part of the build
  photo/                 one-off: turns a portrait artwork into the neon portrait images
  resume/                make-pdf.mjs: rebuilds assets/Shaunak-Chorge-Resume.pdf from the content file
  brand/                 og-image.mjs: redraws the social share image assets/img/og-image.png
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

Open `content/content.json`, change the text, run `npm run build`. Every field in the file is read by a generator; there are no spare or legacy fields. The main blocks:

| block | feeds |
|---|---|
| `seo` | `tab_title` (the ONE browser-tab title, shown on every page: the build writes it into every `<title>`, and the repo-root `index.html` and `404.html` must carry the same text; plain text, the build escapes `&`. **To change it:** edit this value, edit the `<title>` of those two root files by hand (write `&amp;` for `&`), and update the literal in `tools/test.mjs`; the build and `npm test` name anything that was missed. No script may set `document.title`; the guard fails the build if a file in `assets/js/` or an inline script in `src/` does, in the usual spellings: `document.title =`, `doc.title =` (or a local alias such as `var d = document; d.title =`), `document['title'] =`, an appended or combined assignment (`+=`, `||=`), or any look-up of the `<title>` element; comments are ignored, and a document handed to a function under another name is not seen), `site_url` (the one base-URL value), `deploy_root` + `site_root_url` (the one-flag move to the root of `/Portfolio/`, see the root README) and `entity` (the one description sentence of Person, about lead and llms files) |
| `pages` | title, description, H1, first paragraph (`direct_answer`), section titles (`h2`) and extra questions (`faqs`) of the home, hub and single pages |
| `profile`, `hero` | home hero, contact details, status line |
| `services[]` | the service pages and the home service list (title, description, H1, `direct_answer`, `h2`, `faqs`); `tone` and `icon` set the colour and icon everywhere |
| `projects[]` | collage tiles, case studies (`case_study.seo` = title, description and H1 of the page; `case_study.h2` = its section titles; `faq`), the Personal builds rows (`personal_line`), the resume view. Tiles carry no Client / Academic / Personal tag (an `origin` field fails the build) |
| `experience`, `education`, `certifications`, `achievements` | about page, resume view, home roles |
| `faq_all` | groups of questions. A group with `page: "home"` or `page: "contact"` is shown on that page only; the others make up the FAQ page and its schema |
| `keywords.json` (own file) | the approved keyword map, see "Keywords and the SEO guard" |
| `skills` | the two stack tiers (Core stack, Also work with) on the About page, and `ribbon`, the moving tech stack strip on the home page (each name must also be in `core` or `also`; `daily` marks the core ones) |
| `how_i_work` | the three plain sentences of the "How I work" block (Services and About pages) |
| `about` | `whoami`: the About page quick-facts card (the only place the spoken languages appear; `education.year` is the degree year; `now_short`, `based_short` and `education.short` are the short forms of the home card); `home_card`: the home About card (heading, written lines, label of the profile links); `page`: About page extras |
| `education` | one object per school: the degree tile and the two school tiles (`period` or `year` is printed in the tile footer; no subject lists) |
| `certifications` | certificate tiles on About and Resume: `name`, `issuer`, `kind` (Certification, Internship certificate, Internship letter), `year` or `period`, optional `doc` (the Google Drive preview of the document), `verify` (a public badge page), `credential_id`, `note`, `featured` (the wide tile: keep it first, because the tiles fill the grid row by row in list order, and a wide tile that does not fit after the tiles before it starts a new row and leaves the row above it short). A last row that is not full is centred under the rest |
| `achievements` | award tiles: `rank`, `event`, `year`, `detail`, `kind` (`title` is the plain-text version used by the resume, llms files and palette) |
| `experience[].doc` | the document behind a role or programme (an internship certificate or letter): shown as a link on About and Resume; `doc_label` is the link text |
| `booking` | the "Book a call" picker: `weekly` hours per weekday in India Standard Time, `lengths`, `days_ahead`, `min_notice_hours`, `step_minutes` |
| `connect` | the quick ways to connect (`actions`), the opening line of the WhatsApp chat link and the path of the contact card |
| `meta.generated` | the `lastmod` date of `sitemap.xml` |

Rules the guard enforces (all in `tools/rules.mjs`): no project years, no list of spoken languages outside the About page, co-builders credited by plain-text name only (no links to other people's profiles), no banned words, and no counts of projects, roles, services or finishes anywhere (text, filter chips, JSON-LD, llms files). Every `<details>` is open by default. Extensions I can offer on case studies are listed only under "Extensions I can build for you".

To add a project, add an object to `projects[]` (copy an existing one: `id`, `slug`, `title`, `card_blurb`, `stack`, `service_tags`, `role`, ...). A project gets a case-study page only if it has a `case_study` block and its id is in `casestudy` below. The project `role` is shown twice on a case study (key facts and Results), from one field.

## Keywords and the SEO guard

`content/keywords.json` is the approved keyword map: for every page one **primary keyword** (never shared), the secondary keywords, the FAQ questions that belong to that page, and the approved link texts (`anchors`: `footer`, `related`, `hire`, `other`). The copy itself (title, description, H1, section titles, first paragraph, FAQ answers) is in `content/content.json`; the footer, the related-service links, the previous/next case-study links and the hire-band headings read their link texts from the `anchors`.

At the end of every build `tools/pages/keywords.mjs` reads the BUILT pages and **fails the build** when:

- the browser-tab title (`<title>`) of any page differs from `seo.tab_title`, or is longer than 60 characters (every page shows the same tab title), or a page has no `og:title` or more than one `<title>`;
- two pages share a primary keyword, a page title or a meta description (or one keyword is listed on two pages);
- a page title is longer than 60 characters or a description longer than 155;
- a page has no entry in `keywords.json`, or the file lists a page that does not exist;
- the primary keyword is missing from the page title, the H1 or the first paragraph (the answer under the H1; on the home page the hero intro);
- the primary keyword appears more than 3 times in the page body;
- a FAQ question is not registered for its page, appears on two pages, or its answer is not 40 to 60 words (so is the first paragraph of every inner page);
- a link text equals a primary keyword and is used more than twice (exact-match anchor stuffing).

"Page title" means the per-page title (`pages.*.title`, `case_study.seo.title`, ...): it is written to `og:title` and `twitter:title`, which is what a shared link shows, and it carries the primary keyword. The browser tab never shows it; the tab always shows `seo.tab_title`.

A phrase matches loosely: small filler words (in, for, a, an, with, to) and plurals are ignored, so "hire fastapi developers" matches "Hire a FastAPI Developer". `npm test` proves each rule by breaking it on a copy of the site. To add a page, give it an entry in `keywords.json`; to change a primary keyword, change it there and in the page copy.

The research behind the map is autocomplete data (a proxy for demand, not search volume). `dropped` in the file lists the phrases that were left out on purpose, with the reason.

## Choose which projects show

`projects.config.json` is the only place that decides it. Every generator reads it through `tools/selection.mjs`, which also checks it: an unknown id, a case study missing from `show`, a project in two lists or a desktop grid with a gap or a wrongly shaped tile stops the build with a clear message.

```json
{ "show": [], "tile_size": {}, "desktop_grid": [], "casestudy": [], "personal": [], "resume_featured": [] }
```

- `show`: the selected projects in priority order (rank 1 first). They fill the project collage on the home page and on /projects/. The collage is built for exactly the projects listed here.
- `tile_size`: `"wide"` (2 columns x 1 row) or `"big"` (2 x 2) for the ids that are larger than one cell. Every other selected project is a small 1 x 1 tile.
- `desktop_grid`: the 4-column desktop layout as rows of ranks. A rank repeats across the cells its tile covers, and the number after the last rank is the plain "All projects" link tile. The grid must be a full rectangle. Tablet and phone follow the rank order.
- `casestudy`: the selected ones that also get their own page. Each must be in `show` and have a `case_study` block in the content file.
- `personal`: "Personal builds", the small projects listed as open rows on /projects/ only, each with its one-line `personal_line`. A project in `show` is never listed here.
- `resume_featured` (up to 4): case studies shown on the resume page and in the PDF, in the order you list them. The footer "Work" column is not configured: it lists every project of `show`, in that order.

**Ordering rule for the featured list.** The ids you list come first, in your order. An id that is no longer a case study is skipped with a warning. If fewer than the maximum remain, the first case studies of `casestudy` (in that list's order) fill the rest, so a new selection never leaves a gap or a link to a page that does not exist.

## Long-form case studies and service pages

Every selected project has a case-study page and every service has its own page. Both read optional blocks from `content/content.json` and draw a section only when its data exists, so a short entry still builds.

- **Case study** (`projects[].case_study`): `summary`, `seo`, `h2` (the search-tuned part) plus `context` (why it matters), `problem`, `challenges`, `approach`, `scope` (my part and context and credits), `flow` (the pipeline diagram), `architecture`, `decisions`, `iteration` (only when a first attempt is documented), `results`, `limits`, `use_cases` (examples, never past clients), `related` (three other case studies with the business reason), `ask_prompts` (the suggested questions of the "Ask me" box). Beside it on the project: `faq`, `extensions`, `metrics`, `origin`.
- **Service page** (`services[]`): the earlier fields plus `who`, `problems`, `inputs`, `stack_roles`, `tradeoffs`, `use_cases`, `proof_reasons` (project id to the reason it is evidence), `related_services`, `ask_prompts`.
- **Overview pages**: `pages.projects.needs` and `reading`, `pages.services.guide`, `industries` and `engagement`.
- Every FAQ question must be registered for its page in `content/keywords.json` and answered in 40 to 60 words (the build fails otherwise).

## Ways to connect

- **Book a call** (`/contact/#book`): the visitor picks a day and a time from the weekly hours in `booking` (India Standard Time, shown next to the visitor's own time), a call length and a topic. The request is posted to Formspree like the brief form, and the confirmation offers a Google Calendar link and a downloadable `.ics` file marked tentative. There is no calendar server: the owner confirms by email and two visitors can ask for the same slot. To use a live calendar instead (Cal.com, Calendly), set `profile.links.booking` to its address: "Book a call" then opens it, and the request picker stays as the fallback.
- **Send a brief** (`/contact/#hire`): the guided form (project type, timeline, message).
- **Floating "Let's talk" menu** on every page: Book a call, Send a brief, WhatsApp (`wa.me` with the phone number of `profile.phone_tel` and the line in `connect.whatsapp_text`) and Email. Without JavaScript the button is a plain link to the form.
- **Ask me** box at the end of every case study and service page: a plain GET form to `/contact/?q=...&ref=...&about=...`. `pages.js` puts the question and the page name into the brief form and preselects the project type.
- **Contact card**: `assets/Shaunak-Chorge.vcf` is written by the build from the profile data (`tools/pages/vcard.mjs`).
- To change the call hours, edit `booking.weekly` (a list of start and end times per weekday, 24-hour, India Standard Time) and rebuild.

## Deploy

GitHub Pages serves the repository as-is, so run `npm run build`, then commit the generated pages (`index.html`, the page folders, `assets/dist/`, `llms*.txt`, `.built-pages.json`, and the repo-root `sitemap.xml` and `robots.txt`) together with the sources and push. Settings -> Pages -> Deploy from a branch -> `main` / root. Every URL in the pages is relative, so the site works under a sub-path and from `file://`. `npm test` tells you if the committed pages are stale.

## Serve the site at the root of /Portfolio/

`.github/workflows/pages.yml` (prepared, not enabled) can publish this folder as the site root, `https://shaunakchorge.github.io/Portfolio/`. The one-flag switch is `seo.deploy_root` in `content/content.json` (base URL becomes `seo.site_root_url`; `sitemap.xml` and `robots.txt` are then written inside this folder). The exact clicks and the consequences are in the root `README.md`, section "Serve the site at the root of /Portfolio/".

## Add a custom domain

1. Change `seo.site_url` in `content/content.json` to the new address (keep the trailing slash).
2. Run `npm run build`. Canonical links, Open Graph URLs, JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt` and the web address printed in the resume PDF all derive from that one value (the PDF only after `node tools/resume/make-pdf.mjs`). The build writes `sitemap.xml` and `robots.txt` once, in the repo root.
3. If `new_portfolio/` becomes the site root of the new domain, add a `CNAME` file there, copy the repo-root `sitemap.xml` and `robots.txt` into it, and point DNS at Pages. The repo-root `index.html` redirect and `404.html` contain the old address; they are not needed once the domain serves this folder directly.
4. Submit the new `sitemap.xml` in Search Console.

## Portrait photo

`tools/photo/process-photo.mjs` turns the finished portrait artwork into the images in `assets/img/portrait/`. The artwork keeps its own colours and tone exactly: the tool does no grading, only adds a clean transparent background (so it blends into the page) and a separate glow-only rim layer. The neon frame, rim pulse and scan sweep are page layers in `assets/css/sections/portrait.css`. The original stays private (the owner keeps it in the git-ignored `_private/` folder of the repo). To regenerate the portrait from a new source image, one command:

```bash
npm i --no-save sharp
node tools/photo/process-photo.mjs path/to/artwork.png
```

Master size is 3:4 (800 x 1067); outputs are `portrait-480/800.webp|avif` and `rim-480/800.webp|avif`, each under 120 KB. The background is handled automatically: the image's own transparency if it has any; a flat background (black or white studio) is keyed out by a border flood fill that never touches anything inside the figure; any other background uses `rembg` through Python when available (`pip install rembg onnxruntime`) and otherwise a looser flood fill. The icons are static files in `assets/img/` and are not part of the build.

## Resume PDF and social image

Both are drawn by small scripts. They need Playwright with Chromium (`npm i --no-save playwright sharp`; sharp only makes the PNG smaller):

```bash
node tools/resume/make-pdf.mjs     # assets/Shaunak-Chorge-Resume.pdf
node tools/brand/og-image.mjs      # assets/img/og-image.png (1200 x 630)
```

The **resume PDF** is drawn from the content file (profile, experience, skills, the `resume_featured` projects, and the web address from `seo.site_url`), so it cannot drift from the site. Run it after changing any of those.

The **social image** is a design: its words (name, role, employer, the four services, city) are typed in `tools/brand/og-image.mjs` and are not read from the content file. If one of them changes, edit the text in that script and run it again.

## Single sources (so pages cannot drift)

- Which projects show, in which order and tile size, which are case studies or featured: `projects.config.json` through `tools/selection.mjs`.
- Entity sentence: `seo.entity` in `content/content.json` is the Person description in the JSON-LD of the home page and /about/, the /about/ lead and the first line of `llms.txt` / `llms-full.txt`.
- Contact facts (e-mail, phone, LinkedIn, GitHub, Instagram, Formspree): `profile` in the content file. The footer links, the JSON-LD `sameAs`, the contact form and channel list (one renderer in `tools/pages/ui.mjs`, used on /contact/ only; the home page ends with a hire call to action that links there) and the terminal data all read them from there.
- Service colour and icon: `services[].tone` and `services[].icon`.
- Banned words: `tools/rules.mjs`.
- Footer service and work lists are generated from `services[].page_slug` / `nav_label` and from `show` (`footerParts` in `build.mjs`), so a footer link always points at a page that exists. The build guard also resolves every internal link.
- Project visuals: `visual_hint` (type) and optional `visual_variant` per project. `assets/js/sections/visuals.js` draws a variant only when it belongs to that project and otherwise falls back to the neutral generic visual.

## Notes

- **Page bundles.** The home page loads every style and script except `pages.css` (the inner-page styles). Every other page loads one shared stylesheet (`assets/dist/site.inner.min.css`, so a visitor keeps one cached file across pages) without the home-only hero and home code, and adds the scripts for the project art (visuals), the project collage, the portrait, or the contact form (`contact-form.js`: /contact/ only, the home page has no form) only when the page uses them. The floating contact button (`footer.css`, `contact.js`) is on every page. File addresses carry a `?v=` content hash, so a new deploy can never mix with an old cached file.
- **Search engines on GitHub Pages.** `robots.txt` and `llms.txt` are only read from the root of a domain, so on the `github.io/Portfolio/` project address crawlers will not find them. Submit `https://shaunakchorge.github.io/Portfolio/sitemap.xml` in Google Search Console and Bing Webmaster Tools. After a custom domain is set (`seo.site_url`), serve `robots.txt`, `sitemap.xml` and `llms.txt` from the domain root.
- `sitemap.xml` `lastmod` comes from `meta.generated` in the content file (override with `PF_LASTMOD=2026-12-31`), so rebuilding without content changes gives identical files.
- The contact form posts to Formspree (`profile.links.formspree`); nothing else leaves the page.
- Font and icon licences: Orbitron, Space Grotesk and Space Mono (SIL OFL 1.1, self-hosted); Lucide icons (ISC).
