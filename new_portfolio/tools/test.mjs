// test.mjs - `npm test`. Builds a COPY of the site in a temp folder and checks the result. Nothing in the repo is changed.
//   1. the build passes (banned words, languages once, every link and every #anchor resolves, no readable-asset links)
//   2. building again gives byte-identical files (the build is deterministic)
//   3. the files the build wrote equal the files in the repo (run `npm run build` if they do not: the deployed pages are stale)
//   4. the link guard really catches a broken "Hire me" anchor (contact/?topic=...#hire)
//   5. the owner's rules (round 7 adds: header order, footer order, languages on About only, education and certificate tiles with their documents, contact tabs and booking picker, long-form pages): the 11 selected projects in priority order (never printed as a count), no tallies, no shortcut hints, no Home tab, nothing collapsed,
//      no retired wording, Personal builds on /projects/ only, one Traceable AI Backend, the three "How I work" sentences, the resume PDF unchanged
//   node tools/test.mjs --keep     leave the temp copy in place and print its path
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { SITE } from './lib.mjs';

const keep = process.argv.includes('--keep');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-test-'));
const copy = path.join(root, 'new_portfolio');
const failures = [];
const check = (ok, label, detail = '') => { console.log(`  ${ok ? 'ok' : 'x '} ${label}${!ok && detail ? '\n      ' + detail.split('\n').join('\n      ') : ''}`); if (!ok) failures.push(label); };

/* a copy of the site, next to a stub root index.html (the real repo keeps sitemap.xml and robots.txt there) */
fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html>\n');
fs.cpSync(SITE, copy, { recursive: true, filter: s => !/[\\/](node_modules|\.git)([\\/]|$)/.test(s) });
fs.symlinkSync(path.join(SITE, 'node_modules'), path.join(copy, 'node_modules'), 'junction');   // esbuild

const build = () => spawnSync(process.execPath, [path.join(copy, 'build.mjs')], { cwd: copy, encoding: 'utf8', env: { ...process.env, PF_SITE: copy } });
const walk = (dir, out = []) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === '.git') continue; const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else out.push(p); } return out; };
const BINARY = /\.(woff2|png|webp|avif|ico|pdf|jpg)$/;
const digest = f => crypto.createHash('sha1').update(BINARY.test(f) ? fs.readFileSync(f) : fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
/* the files a build writes: pages, llms, sitemap, robots, minified assets, generated partials and script data */
const OUTPUT = /^(index\.html|llms(-full)?\.txt|\.built-pages\.json|assets\/dist\/|assets\/js\/sections\/fx\.js|src\/generated\/|(about|contact|faq|projects|resume|services)\/)/;
const outputs = (base) => Object.fromEntries(walk(base).map(f => [path.relative(base, f).split(path.sep).join('/'), f]).filter(([r]) => OUTPUT.test(r) || r === '../sitemap.xml'));
const snapshot = (site) => { const o = outputs(site); const m = Object.fromEntries(Object.entries(o).map(([r, f]) => [r, digest(f)])); for (const n of ['sitemap.xml', 'robots.txt']) { const f = path.join(site, '..', n); if (fs.existsSync(f)) m['../' + n] = digest(f); } return m; };

try {
  console.log(`test build in ${copy}`);
  const b1 = build();
  check(b1.status === 0, 'build passes (guard, links, anchors)', (b1.stdout + b1.stderr).split('\n').filter(l => /x |!|problem|broken|no anchor|FAILED|Error/.test(l)).slice(0, 12).join('\n') || (b1.stdout + b1.stderr).slice(-600));
  if (b1.status === 0) {
    const first = snapshot(copy);
    const b2 = build();
    const second = snapshot(copy);
    const changed = Object.keys(first).filter(k => first[k] !== second[k]);
    check(b2.status === 0 && !changed.length, 'a second build writes byte-identical files', changed.slice(0, 8).join('\n'));

    const repo = snapshot(SITE);
    const stale = [...new Set([...Object.keys(first), ...Object.keys(repo)])].filter(k => first[k] !== repo[k]);
    check(!stale.length, 'the files in the repo equal a clean build (run `npm run build` if not)', stale.slice(0, 12).join('\n') + (stale.length > 12 ? `\n... and ${stale.length - 12} more` : ''));

    /* the link guard must see a broken anchor behind a query string, as in <a href="../../contact/?topic=computer-vision#hire"> */
    process.env.PF_SITE = copy;
    const { checkLinks, guard } = await import(pathToFileURL(path.join(copy, 'build.mjs')).href);
    const page = 'services/computer-vision/index.html';
    const html = fs.readFileSync(path.join(copy, page), 'utf8');
    check(/href="[^"#]*contact\/\?topic=[^"#]*#hire"/.test(html), 'a service page has a "Hire me" link with ?topic=... and #hire');
    check(checkLinks([page]).problems.length === 0, 'the link guard accepts the real pages');
    const contact = path.join(copy, 'contact/index.html'), contactBefore = fs.readFileSync(contact, 'utf8');
    fs.writeFileSync(contact, contactBefore.replace(/id="hire"/g, 'id="hire-renamed"'));
    check(checkLinks([page]).problems.some(p => p.includes('#hire')), 'the link guard reports a renamed #hire anchor behind ?topic=');
    fs.writeFileSync(contact, contactBefore);   // later checks read the real contact page
    const dev = path.join(copy, 'about/index.html');
    fs.writeFileSync(dev, fs.readFileSync(dev, 'utf8').replace('</body>', '<script defer src="../assets/js/core.js"></script></body>'));
    check(guard().problems.some(p => p.includes('readable assets')), 'the guard reports a page that links the readable assets/js files');

    /* the keyword guard (content/keywords.json, tools/pages/keywords.mjs): clean on the real pages, and it must catch each rule it states */
    const kwm = await import(pathToFileURL(path.join(copy, 'tools/pages/keywords.mjs')).href);
    const paths = JSON.parse(fs.readFileSync(path.join(copy, '.built-pages.json'), 'utf8'));
    const kwProblems = (keywords) => kwm.keywordProblems({ site: copy, paths, keywords });
    check(kwProblems(kwm.loadKeywords()).length === 0, 'the keyword guard accepts the real pages', kwProblems(kwm.loadKeywords()).join('\n'));
    const clone = () => JSON.parse(JSON.stringify(kwm.loadKeywords()));
    const edit = (rel, fn, fix = null) => { const f = path.join(copy, rel); const before = fs.readFileSync(f, 'utf8'); fs.writeFileSync(f, fn(before)); try { return fix ? fix() : kwProblems(kwm.loadKeywords()); } finally { fs.writeFileSync(f, before); } };
    let k = clone(); k.pages['contact/'].primary = k.pages['faq/'].primary;
    check(kwProblems(k).some(p => /is also the primary of/.test(p)), 'the keyword guard reports two pages that share a primary keyword');
    k = clone(); k.pages['about/'].secondary.push(k.pages['faq/'].secondary[0] || 'ai developer cost in india');
    check(kwProblems(k).some(p => /is also listed on/.test(p)), 'the keyword guard reports a keyword listed on two pages');
    check(edit('about/index.html', h => h.replace(/<title>[^<]*<\/title>/, h.match(/<title>[^<]*<\/title>/g)[0]).replace(/<title>[^<]*<\/title>/, fs.readFileSync(path.join(copy, 'contact/index.html'), 'utf8').match(/<title>[^<]*<\/title>/)[0])).some(p => /same title as/.test(p)), 'the keyword guard reports two pages with the same title');
    check(edit('about/index.html', h => h.replace(/(<meta name="description" content=")[^"]*/, '$1' + fs.readFileSync(path.join(copy, 'contact/index.html'), 'utf8').match(/<meta name="description" content="([^"]*)/)[1])).some(p => /same meta description as/.test(p)), 'the keyword guard reports two pages with the same meta description');
    check(edit('about/index.html', h => h.replace(/<title>[^<]*<\/title>/, '<title>' + 'About Shaunak Chorge, AI engineer. '.repeat(3) + '</title>')).some(p => /title is \d+ characters/.test(p)), 'the keyword guard reports a title over 60 characters');
    check(edit('about/index.html', h => h.replace(/(<meta name="description" content=")[^"]*/, '$1' + 'x'.repeat(160))).some(p => /description is 160 characters/.test(p)), 'the keyword guard reports a description over 155 characters');
    check(edit('about/index.html', h => h.replace(/(<h1[^>]*>)[^<]*/, '$1Who I am')).some(p => /not in the H1/.test(p)), 'the keyword guard reports a primary keyword missing from the H1');
    check(edit('about/index.html', h => h.replace(/<title>[^<]*<\/title>/, '<title>About me | Portfolio</title>')).some(p => /not in the title/.test(p)), 'the keyword guard reports a primary keyword missing from the title');
    check(edit('about/index.html', h => h.replace(/(<p class="pg-answer" data-answer>)[^<]*/, '$1Short and without the keyword.')).some(p => /not in the first paragraph/.test(p)), 'the keyword guard reports a primary keyword missing from the first paragraph');
    check(edit('about/index.html', h => h.replace('</main>', '<p>Shaunak Chorge AI engineer. Shaunak Chorge AI engineer. Shaunak Chorge AI engineer. Shaunak Chorge AI engineer.</p></main>')).some(p => /appears \d+ times in the page body/.test(p)), 'the keyword guard reports a primary keyword repeated more than 3 times');
    const qOf = rel => fs.readFileSync(path.join(copy, rel), 'utf8').match(/<h3 class="pg-qa__h">([^<]*)<\/h3>/)[1];
    const dupQ = qOf('faq/index.html');
    check(edit('contact/index.html', h => h.replace(/(<h3 class="pg-qa__h">)[^<]*/, '$1' + dupQ)).some(p => /is also on faq\//.test(p) || /not registered for this page/.test(p)), 'the keyword guard reports a FAQ question that appears on two pages');
    check(edit('faq/index.html', h => h.replace(/(<div class="pg-qa__a"><p>)[^<]*/, '$1Too short.')).some(p => /answer to .* is \d+ words/.test(p)), 'the keyword guard reports a FAQ answer outside 40-60 words');

    /* the owner's rules for this round: clean on the real pages, and the guard must catch each one */
    const rules = await import(pathToFileURL(path.join(copy, 'tools/rules.mjs')).href);
    const { loadSelection } = await import(pathToFileURL(path.join(copy, 'tools/selection.mjs')).href);
    const content = JSON.parse(fs.readFileSync(path.join(copy, 'content/content.json'), 'utf8'));
    const pageHtml = rel => fs.readFileSync(path.join(copy, rel), 'utf8');
    const builtPages = ['index.html', ...paths.map(p => p + 'index.html')];
    const caught = (rel, text) => rules.pageProblems(rel, text).length > 0 || !!rules.findBanned(text);

    const ruleProblems = [...builtPages, 'llms.txt', 'llms-full.txt'].flatMap(rel => rules.pageProblems(rel, pageHtml(rel)));
    check(!ruleProblems.length, 'no page or llms file has a tally, a shortcut hint, a stats counter, a closed <details> or a Home link in the navigation', ruleProblems.slice(0, 8).join('\n'));
    const retired = [...builtPages, 'llms.txt', 'llms-full.txt', 'README.md'].map(rel => [rel, rules.findBanned(pageHtml(rel))]).filter(([, w]) => w);
    check(!retired.length, 'no page, llms file or README uses retired wording (remote-work line, capacity promise, "graduated", shortcut hint, GPA)', retired.slice(0, 6).map(([r, w]) => `"${w}" in ${r}`).join('\n'));
    const scripts = walk(path.join(copy, 'assets/js')).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(f, 'utf8')).join('\n');
    check(!/\.length\s*\+\s*' (?:projects|industry roles|programmes)/.test(scripts), 'no script prints a project or role tally (the terminal included)');
    check(caught('x.html', '<button class="cmd"><kbd class="kbd" data-kbd>Ctrl K</kbd></button>') && caught('x.txt', 'Press Ctrl+K to search') && caught('x.html', '<button aria-keyshortcuts="Control+K">'), 'the rules catch a keyboard-shortcut hint');
    check(['<p>12 Selected projects</p>', '<span>3 Industry roles</span>', '<span>All (12 projects)</span>', '<p>Showing 3 of 12 projects</p>', '<p>Nine projects have case studies</p>', '<p>I offer six freelance AI development services</p>', '<p>3 Contest and hackathon podium finishes</p>'].every(t => caught('x.html', t)), 'the rules catch a tally of projects, roles, services or finishes');
    check(!['<p>27 passing tests</p>', '<small>02</small>Projects', '<p>93.87% accuracy on 1,266 records</p>'].some(t => caught('x.html', t)), 'the rules leave results (27 passing tests) and the numbered drawer alone');
    check(caught('x.html', '<details><summary>Q</summary><p>A</p></details>') && caught('x.html', '<details open name="g"><summary>Q</summary></details>') && !caught('x.html', '<details class="hm-qa" open><summary>Q</summary></details>'), 'the rules catch a closed <details> and an exclusive <details name="..."> group');
    check(caught('x.html', '<a class="nav__link" href="./">Home</a>') && caught('x.html', '<a class="drawer__link" href="./"><small>01</small>Home</a>') && !caught('x.html', '<a class="nav__link" href="projects/">Projects</a>'), 'the rules catch a Home link in the navigation');
    check(['working remotely (IST)', 'I work remotely from Mumbai', 'Straight talk', 'Honest limits', 'Select projects only, so each one gets my full attention', 'I write no code until we agree', 'a small number at a time', 'graduated May 2026', 'Show the 10 smaller projects', 'a no-code tool'].every(t => !!rules.findBanned(t)), 'the rules catch the retired wording');

    const home = pageHtml('index.html'), projectsPage = pageHtml('projects/index.html'), about = pageHtml('about/index.html');
    const navOf = html => (html.match(/<nav class="nav"[\s\S]*?<\/nav>/) || [''])[0];
    const hrefs = html => [...html.matchAll(/href="([^"]*)"/g)].map(m => m[1].replace(/^(\.\.\/)+|^\.\//, ''));
    check(JSON.stringify(hrefs(navOf(home))) === JSON.stringify(['projects/', 'services/', 'about/', 'resume/']), 'the navigation ribbon links Projects, Services, About and Resume only (no Home, FAQ or Contact)', hrefs(navOf(home)).join(' '));
    const drawer = (home.match(/<nav class="drawer"[\s\S]*?<\/ul>/) || [''])[0];
    check(JSON.stringify(hrefs(drawer)) === JSON.stringify(['projects/', 'services/', 'about/', 'resume/', 'faq/', 'contact/']), 'the mobile menu lists Projects, Services, About, Resume, FAQ and Contact', hrefs(drawer).join(' '));
    const cmd = (home.match(/<button class="cmd"[\s\S]*?<\/button>/) || [''])[0];
    check(/aria-label="Search"/.test(cmd) && /data-open-palette/.test(cmd) && !/>\s*[A-Za-z]/.test(cmd.replace(/<svg[\s\S]*?<\/svg>/, '').replace(/^<button[^>]*>/, '')), 'the search button is an icon with aria-label="Search" and no text or hint');
    check(!/class="np[ "_]|hero__photo/.test(home), 'the home page has no portrait photo');
    check(/shaunak\.py/.test(home) && /See projects/.test(home) && /Hire me/.test(home), 'the home hero keeps the shaunak.py window and the See projects and Hire me buttons');
    check(/class="np[ "_]/.test(about), 'the portrait is on the About page');

    /* the project collage: tiles 1 to 11 in the owner's order on the home page and on /projects/, the "All projects" tile on the home page, Box Selection API not in it */
    const OWNER_ORDER = ['ai-rag-healthcare-assistant', 'advanced-cctv-analytics', 'speech-emotion-recognition', 'observable-ai-backend', 'obligation-management-system', 'ams-ai-finding-engine', 'core-banking-text-to-sql', 'agentic-honeypot', 'whatsapp-ai-agent-platform', 'deepfake-video-detection', 'spam-classifier'];
    const OWNER_SIZES = ['wide', 'big', 'big', 'small', 'small', 'small', 'small', 'small', 'wide', 'small', 'small'];
    const sel = loadSelection(content);
    check(JSON.stringify(sel.show) === JSON.stringify(OWNER_ORDER) && JSON.stringify(sel.collage.tiles.map(t => t.size)) === JSON.stringify(OWNER_SIZES), "projects.config.json holds the selected projects in the owner's priority order with their tile sizes");
    check(sel.personal.includes('django-box-selection-api') && !sel.show.includes('django-box-selection-api'), 'Box Selection API is a personal build, not a selected project');
    const tiles = html => [...html.matchAll(/<li\b[^>]*\bdata-rank="(\d+)"[^>]*>/g)].map(m => ({ rank: +m[1], pid: (m[0].match(/data-pid="([^"]*)"/) || [])[1] }));
    const homeTiles = tiles(home), projTiles = tiles(projectsPage);
    const projectTiles = list => list.filter(t => t.rank <= OWNER_ORDER.length).map(t => t.pid);
    check(JSON.stringify(projectTiles(homeTiles)) === JSON.stringify(OWNER_ORDER) && JSON.stringify(projectTiles(projTiles)) === JSON.stringify(OWNER_ORDER), 'the home page and /projects/ show the collage tiles in rank order (li data-rank, data-pid)', `${homeTiles.map(t => t.rank)} | ${projTiles.map(t => t.rank)}`);
    check(homeTiles.filter(t => t.rank === sel.collage.linkRank).length === 1, 'the home collage ends with one "All projects" link tile');
    check(!homeTiles.concat(projTiles).some(t => t.pid === 'django-box-selection-api'), 'Box Selection API is not a collage tile');
    check(!/id="personal-builds"/.test(home) && /id="personal-builds"/.test(projectsPage) && !/Personal builds/.test(home), 'Personal builds appear on /projects/ only');
    const personalMissing = sel.personal.filter(id => { const p = content.projects.find(x => x.id === id); return !p.personal_line || !projectsPage.includes(`id="p-${id}"`) || !projectsPage.includes(p.personal_line); });
    check(!personalMissing.length, 'every personal build is an open row with its one-line description on /projects/', personalMissing.join(', '));

    /* Traceable AI Backend: one project, one case study, covering the AI server and LLM observability */
    const traceable = paths.filter(p => /observab|traceab/.test(p));
    check(JSON.stringify(traceable) === JSON.stringify(['projects/observable-ai-backend/']), 'Traceable AI Backend has exactly one case study page', traceable.join(' '));
    const tr = pageHtml('projects/observable-ai-backend/index.html');
    check(/AI server/.test(tr) && /LLM observability/.test(tr), 'the Traceable AI Backend case study covers the AI server and LLM observability');
    check(content.projects.filter(p => /observab|traceab/i.test(p.id + p.title)).length === 1, 'content.json has one project for the AI server, LLM observability and the traceable backend');

    /* "How I work": the three sentences on the Services and About pages, in place of the old block */
    const how = content.how_i_work;
    check(how && how.title === 'How I work' && how.lines.length === 3 && how.lines.every(l => pageHtml('services/index.html').includes(l) && about.includes(l)), 'the Services and About pages carry the three "How I work" sentences');

    /* the home About card: a few written lines, short forms, where I am and what I do now, profile links; no languages, no college, no greeting */
    const cardFile = path.join(copy, 'src/generated/home-about.html');
    const cardHtml = fs.existsSync(cardFile) ? fs.readFileSync(cardFile, 'utf8') : '';
    const card = cardHtml.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&');
    const W = content.about.whoami;
    check(card.includes(W.education.short) && card.includes(W.education.year), 'the home About card shows the degree in its short form and the year');
    check(card.includes(W.based_short) && card.includes(W.now_short) && /github\.com/.test(cardHtml) && /linkedin\.com/.test(cardHtml), 'the home About card shows Mumbai (IST), the current role and the GitHub and LinkedIn links');
    check(/<h2[^>]*>\s*About\s*<\/h2>/.test(cardHtml) && !/shaunak@/i.test(cardHtml) && !/class="hm-term__tags"/.test(cardHtml), 'the home About card has a plain "About" heading and no "shaunak@portfolio" prompt');
    check(card.length > 0 && !/college|School of|Patil|Hi,? I/i.test(card) && !rules.LANGUAGE_RE.test(card), 'the home About card names no college, lists no spoken languages and has no "Hi, I am" greeting');

    /* round 7: header, footer, credentials, contact, long-form pages */
    const headerTools = (home.match(/<div class="site-header__tools">[\s\S]*?<\/div>/) || [''])[0];
    check(headerTools.indexOf('hdr-hire') > -1 && headerTools.indexOf('hdr-hire') < headerTools.indexOf('data-open-palette'), 'the header shows Hire me first and the search button after it');
    const footerCols = [...home.matchAll(/<nav class="footer__col[^"]*" aria-labelledby="footer-([a-z]+)-h">/g)].map(m => m[1]);
    check(JSON.stringify(footerCols) === JSON.stringify(['services', 'work', 'pages']), 'the footer columns run Services, Work, Pages (Pages at the right edge)', footerCols.join(' '));
    const footerWork = (home.match(/aria-labelledby="footer-work-h">[\s\S]*?<\/nav>/) || [''])[0];
    const workHrefs = [...footerWork.matchAll(/href="(?:\.\.\/)*projects\/([^"\/]*)\/?"/g)].map(m => m[1]).filter(Boolean);
    const expectSlugs = OWNER_ORDER.map(id => content.projects.find(p => p.id === id).slug);
    check(JSON.stringify(workHrefs) === JSON.stringify(expectSlugs), 'the footer Work column lists the selected projects in the owner priority order', workHrefs.join(' '));
    const langWords = ['English', 'Hindi', 'Marathi', 'German', 'French'];
    const pagesWithLang = builtPages.filter(rel => langWords.some(w => new RegExp('\\b' + w + '\\b').test(pageHtml(rel).replace(/<script[\s\S]*?<\/script>/g, ''))));
    check(JSON.stringify(pagesWithLang) === JSON.stringify(['about/index.html']), 'the spoken languages appear on the About page only', pagesWithLang.join(' '));
    const resume = pageHtml('resume/index.html');
    for (const [label, html] of [['About', about], ['Resume', resume]]) {
      check(/class="edu"/.test(html) && /2022 - 2026/.test(html) && /class="edu__years">2022</.test(html) && /class="edu__years">2020</.test(html), label + ': the education tiles show the years in their footers');
      check(!/Machine Learning<\/li>|Software Engineering|Database Systems|Web Development|System Design/.test(html), label + ': the degree tile no longer lists subjects');
      const docs = new Set([...html.matchAll(/href="https:\/\/drive\.google\.com\/file\/d\/([\w-]+)\/view\?usp=sharing"/g)].map(m => m[1]));
      check(docs.size === 10, label + ': all ten shared certificate documents are linked (Google Drive previews)', String(docs.size));
      check((html.match(/class="cert__card"/g) || []).length >= 17 && /certs--awards/.test(html), label + ': certificates and awards are certificate-style tiles');
    }
    const contactHtml = pageHtml('contact/index.html');
    check(/id="book"[^>]*data-booking=/.test(contactHtml) && /id="hire"/.test(contactHtml) && /data-tabs/.test(contactHtml) && (contactHtml.match(/class="connect-tile"/g) || []).length === 4, 'the contact page has the four quick-connect tiles, the Send a brief and Book a call tabs, and the booking picker');
    const vcf = path.join(copy, content.connect.vcard);
    check(fs.existsSync(vcf) && /BEGIN:VCARD[\s\S]*FN:Shaunak Chorge[\s\S]*END:VCARD/.test(fs.readFileSync(vcf, 'utf8')) && contactHtml.includes(content.connect.vcard), 'the contact card (.vcf) is built and linked from the contact page');
    check(/wa\.me\/\d+\?text=/.test(home) && /data-connect-toggle/.test(home) && /id="connect-menu"/.test(home), 'every page has the floating "Let\'s talk" menu (Book a call, Send a brief, WhatsApp, Email)');
    const longForm = sel.casestudy.map(id => 'projects/' + content.projects.find(p => p.id === id).slug + '/').concat(content.services.map(sv => 'services/' + (sv.page_slug || sv.slug) + '/'));
    const thin = longForm.filter(rel => { const h = pageHtml(rel + 'index.html'); return !(/id="ask"/.test(h) && /class="pg-ask__form"/.test(h) && /id="faq"/.test(h) && /class="pg-toc"/.test(h)); });
    check(!thin.length, 'every case study and service page has the jump list, FAQs and the "Ask me" box', thin.join(' '));
    const noRelated = sel.casestudy.map(id => 'projects/' + content.projects.find(p => p.id === id).slug + '/').filter(rel => (pageHtml(rel + 'index.html').match(/class="pg-relcard"/g) || []).length !== 3 || !/class="pg-flow"/.test(pageHtml(rel + 'index.html')));
    check(!noRelated.length, 'every case study has three related case studies and a pipeline diagram', noRelated.join(' '));
    check(sel.casestudy.length === OWNER_ORDER.length && paths.includes('projects/whatsapp-ai-agent-platform/') && paths.includes('projects/spam-classifier/'), 'every selected project has its own case study page, in the sitemap');
    const dupIds = builtPages.filter(rel => { const ids = [...pageHtml(rel).replace(/<script[\s\S]*?<\/script>/g, '').matchAll(/\sid="([^"]+)"/g)].map(m => m[1]); return new Set(ids).size !== ids.length; });
    check(!dupIds.length, 'no built page repeats an id attribute', dupIds.join(' '));
    check(!/finacle/i.test(builtPages.map(pageHtml).join('\n') + fs.readFileSync(path.join(copy, 'assets/js/sections/fx.js'), 'utf8')), 'the core-banking product name appears in no page, id or script');

    /* the selection file is checked: a gap or a wrong tile shape in the desktop grid, or a project in two lists, stops the build */
    const cfgFile = path.join(copy, 'projects.config.json'), cfgText = fs.readFileSync(cfgFile, 'utf8');
    const loadWith = edit => { const c = JSON.parse(cfgText); edit(c); fs.writeFileSync(cfgFile, JSON.stringify(c)); try { loadSelection(content); return ''; } catch (e) { return e.message; } finally { fs.writeFileSync(cfgFile, cfgText); } };
    check(/desktop_grid/.test(loadWith(c => { c.desktop_grid[4][3] = 0; })), 'the selection check reports a gap in the desktop grid');
    check(/desktop_grid/.test(loadWith(c => { c.desktop_grid[0] = [1, 1, 1, 2]; })), 'the selection check reports a tile that does not fill its block');
    check(/tile_size/.test(loadWith(c => { c.tile_size['django-box-selection-api'] = 'big'; })), 'the selection check reports a tile size for a project that is not selected');
    check(/both/.test(loadWith(c => { c.personal.push('spam-classifier'); })), 'the selection check reports a project in both "show" and "personal"');

    /* the owner's resume PDF is never regenerated */
    check(crypto.createHash('md5').update(fs.readFileSync(path.join(SITE, 'assets/Shaunak-Chorge-Resume.pdf'))).digest('hex') === 'd8c97fc56dbdfff424884c8d0e27dc7b', "the resume PDF is the owner's file, unchanged");

    /* deploy_root: PF_DEPLOY_ROOT=1 (or seo.deploy_root) moves every URL to the root of /Portfolio/ and writes sitemap.xml + robots.txt inside the site folder */
    const root = spawnSync(process.execPath, [path.join(copy, 'build.mjs')], { cwd: copy, encoding: 'utf8', env: { ...process.env, PF_SITE: copy, PF_DEPLOY_ROOT: '1' } });
    check(root.status === 0, 'a build with PF_DEPLOY_ROOT=1 passes', (root.stdout + root.stderr).slice(-500));
    if (root.status === 0) {
      const idx = fs.readFileSync(path.join(copy, 'index.html'), 'utf8');
      check(idx.includes('<link rel="canonical" href="https://shaunakchorge.github.io/Portfolio/">'), 'deploy_root: the home canonical is https://shaunakchorge.github.io/Portfolio/');
      const sm = path.join(copy, 'sitemap.xml'), rb = path.join(copy, 'robots.txt');
      check(fs.existsSync(sm) && fs.existsSync(rb) && !fs.readFileSync(sm, 'utf8').includes('/new_portfolio/') && fs.readFileSync(rb, 'utf8').includes('Sitemap: https://shaunakchorge.github.io/Portfolio/sitemap.xml'), 'deploy_root: sitemap.xml and robots.txt sit inside the site folder with root URLs');
      const stale = walk(copy).filter(f => /\.(html|txt|xml)$/.test(f) && !/[\\/](src|tools)[\\/]/.test(f) && fs.readFileSync(f, 'utf8').includes('/Portfolio/new_portfolio/'));
      check(!stale.length, 'deploy_root: no generated page, llms file or sitemap still carries /Portfolio/new_portfolio/', stale.slice(0, 5).join('\n'));
    }
  }
} finally {
  if (keep) console.log(`kept ${root}`); else fs.rmSync(root, { recursive: true, force: true });
}
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
