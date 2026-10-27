// test.mjs - `npm test`. Builds a COPY of the site in a temp folder and checks the result. Nothing in the repo is changed.
//   1. the build passes (banned words, languages once, every link and every #anchor resolves, no readable-asset links)
//   2. building again gives byte-identical files (the build is deterministic)
//   3. the files the build wrote equal the files in the repo (run `npm run build` if they do not: the deployed pages are stale)
//   4. the link guard really catches a broken "Hire me" anchor (contact/?topic=...#hire)
//   5. the owner's rules (the browser-tab title is one constant string on every page, the repo-root redirect and 404 pages included, while each page keeps its own og:title; round 7 adds: header order, footer order, languages on About only, education and certificate tiles with their documents, contact tabs and booking picker, long-form pages): the 11 selected projects in priority order (never printed as a count), no tallies, no shortcut hints, no Home tab, nothing collapsed,
//      no retired wording, Personal builds on /projects/ only, one Traceable AI Backend, the three "How I work" sentences, the resume PDF unchanged
//   6. round 8: the About portrait is a cut-corner polygon frame (its two polygons are evaluated, not just looked for), the ribbon keeps room for a lifted chip and stops only over its chips,
//      no button anywhere pauses effects or recolours the site (judged by what every button says; the few buttons the scripts build are a known list), no script changes the tab title
//      (in any of its usual spellings), the removed certificates stay removed, the certificate grid keeps list order and centres a short last row (worked out for every list of up to eight
//      tiles), and the deploy staging script (.github/scripts/stage-site.mjs) passes on a clean build and stops on a stray title
//   node tools/test.mjs --keep     leave the temp copy in place and print its path
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { SITE, esc } from './lib.mjs';

const TAB_TITLE = (JSON.parse(fs.readFileSync(path.join(SITE, 'content', 'content.json'), 'utf8')).seo || {}).tab_title || '';   // the one constant browser-tab title
const keep = process.argv.includes('--keep');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-test-'));
const copy = path.join(root, 'new_portfolio');
const failures = [];
const check = (ok, label, detail = '') => { console.log(`  ${ok ? 'ok' : 'x '} ${label}${!ok && detail ? '\n      ' + detail.split('\n').join('\n      ') : ''}`); if (!ok) failures.push(label); };

/* a copy of the site, next to a stub root index.html and 404.html (the real repo keeps sitemap.xml, robots.txt and these two pages there; the build also checks their <title>) */
fs.writeFileSync(path.join(root, 'index.html'), `<!doctype html>\n<title>${esc(TAB_TITLE)}</title>\n`);
fs.writeFileSync(path.join(root, '404.html'), `<!doctype html>\n<title>${esc(TAB_TITLE)}</title>\n`);
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
    const { checkLinks, guard, writesTabTitle } = await import(pathToFileURL(path.join(copy, 'build.mjs')).href);
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
    /* the browser-tab title is ONE constant string (content.json seo.tab_title); each page's own title lives in og:title / twitter:title, where the keyword rules read it */
    const readRel = rel => fs.readFileSync(path.join(copy, rel), 'utf8');
    const metaOf = (rel, re) => (readRel(rel).match(re) || [])[1];
    const TAB = esc(TAB_TITLE), TAB_RE = /<title>([^<]*)<\/title>/, OG_RE = /<meta property="og:title" content="([^"]*)"/, TW_RE = /<meta name="twitter:title" content="([^"]*)"/;
    const allPages = ['index.html', ...paths.map(p => p + 'index.html')];
    const tabTitles = allPages.map(rel => metaOf(rel, TAB_RE)), ogTitles = allPages.map(rel => metaOf(rel, OG_RE)), twTitles = allPages.map(rel => metaOf(rel, TW_RE));
    check(tabTitles.every(t => t === TAB), 'every page has the same browser-tab title (content.json seo.tab_title)', allPages.map((rel, i) => (tabTitles[i] === TAB ? '' : `${rel}: ${tabTitles[i]}`)).filter(Boolean).slice(0, 6).join('\n'));
    check(TAB_TITLE.length <= 60 && TAB_TITLE === 'Shaunak Chorge | AI Engineer & Freelance Developer' && !tabTitles.some(t => /Freelance AI Engineer/.test(t)), 'the browser-tab title is "Shaunak Chorge | AI Engineer & Freelance Developer" (60 characters at most) and the old tab titles are gone');
    check(new Set(ogTitles).size === allPages.length && ogTitles.every((t, i) => t && t === twTitles[i] && t !== TAB), 'each page keeps its own page title in og:title and twitter:title, different from the tab title');
    check(edit('about/index.html', h => h.replace(TAB_RE, '<title>About Shaunak Chorge | AI Engineer in Mumbai</title>')).some(p => /browser-tab title is "/.test(p)), 'the keyword guard reports a page whose browser-tab title differs from the constant');
    check(edit('about/index.html', h => h.replace(TAB_RE, '<title>' + 'Shaunak Chorge | AI Engineer &amp; Freelance Developer '.repeat(2) + '</title>')).some(p => /browser-tab title is \d+ characters/.test(p)), 'the keyword guard reports a browser-tab title over 60 characters');
    check(edit('about/index.html', h => h.replace(/<meta property="og:title" content="[^"]*">\s*/, '')).some(p => /no og:title/.test(p)), 'the keyword guard reports a page without an og:title');
    const repoRoot = path.resolve(SITE, '..');
    for (const f of ['index.html', '404.html']) {
      const rf = path.join(repoRoot, f);
      if (fs.existsSync(rf)) check((fs.readFileSync(rf, 'utf8').match(TAB_RE) || [])[1] === TAB, `the repo-root ${f} has the same browser-tab title`);
    }
    const stub = path.join(path.dirname(copy), 'index.html'), stubBefore = fs.readFileSync(stub, 'utf8');
    fs.writeFileSync(stub, '<!doctype html>\n<title>Shaunak Chorge - Freelance AI Engineer in Mumbai</title>\n');
    const rootCheck = spawnSync(process.execPath, [path.join(copy, 'tools/pages/build-pages.mjs'), '--check'], { cwd: copy, encoding: 'utf8', env: { ...process.env, PF_SITE: copy } });
    fs.writeFileSync(stub, stubBefore);
    check(rootCheck.status !== 0 && /repo-root index\.html/.test(rootCheck.stdout + rootCheck.stderr), 'the build reports a repo-root redirect page whose title is not the constant browser-tab title', (rootCheck.stdout + rootCheck.stderr).slice(-400));
    const stub404 = path.join(path.dirname(copy), '404.html'), stub404Before = fs.readFileSync(stub404, 'utf8');
    fs.writeFileSync(stub404, '<!doctype html>\n<title>404 - Page not found</title>\n');
    const run404 = env => spawnSync(process.execPath, [path.join(copy, 'tools/pages/build-pages.mjs'), '--check'], { cwd: copy, encoding: 'utf8', env: { ...process.env, PF_SITE: copy, ...env } });
    const normal404 = run404({}), deploy404 = run404({ PF_DEPLOY_ROOT: '1' });
    fs.writeFileSync(stub404, stub404Before);
    check(normal404.status !== 0 && /repo-root 404\.html/.test(normal404.stdout + normal404.stderr), 'the build reports a repo-root 404 page whose title is not the constant browser-tab title', (normal404.stdout + normal404.stderr).slice(-400));
    check(deploy404.status !== 0 && /repo-root 404\.html/.test(deploy404.stdout + deploy404.stderr), 'the same check runs in deploy-root mode (the root 404.html is what the deploy publishes)', (deploy404.stdout + deploy404.stderr).slice(-400));
    const contentFile = path.join(copy, 'content/content.json'), contentBefore = fs.readFileSync(contentFile, 'utf8');
    fs.writeFileSync(contentFile, contentBefore.replace(/("tab_title": ")([^"]*)"/, '$1Shaunak Chorge | AI Engineer &amp; Freelance Developer"'));
    const badConfig = run404({});
    fs.writeFileSync(contentFile, contentBefore);
    check(badConfig.status !== 0 && /seo\.tab_title must be plain text/.test(badConfig.stdout + badConfig.stderr), 'a tab title written with an HTML entity (&amp;) is rejected: the build escapes it itself', (badConfig.stdout + badConfig.stderr).slice(-300));
    check(edit('about/index.html', h => h.replace(TAB_RE, m => '<title>Wrong</title>' + m)).some(p => /browser-tab title is "Wrong"/.test(p)), 'the keyword guard reports a page whose first <title> is wrong, even when the right one follows');
    check(edit('about/index.html', h => h.replace(TAB_RE, m => m + m)).some(p => /head has 2 <title> elements/.test(p)), 'the keyword guard reports a head with two <title> elements');
    check(edit('about/index.html', h => h.replace(TAB_RE, '<title>' + TAB + '&#128512;</title>')).some(p => /browser-tab title is/.test(p)), 'the keyword guard compares the exact markup: a character reference after the tab title is reported');
    const titleJs = path.join(copy, 'assets/js/sections/zz-title-test.js');
    const titleSpellings = ["document.title = 'x';", "var doc = document; doc.title = 'x';", "document['title'] = 'x';", "document.querySelector('title').textContent = 'x';", "document.head.getElementsByTagName('title')[0].text = 'x';",
      "document.title += ' (1)';", "var d = document; d.title = 'x';", "document.querySelector('head > title').textContent = 'x';"];
    for (const src of titleSpellings) {
      fs.writeFileSync(titleJs, src + '\n');
      const reported = guard().problems.some(p => /zz-title-test\.js sets document\.title/.test(p));
      fs.rmSync(titleJs);
      check(reported, 'the guard reports a script that changes the tab title: ' + src.slice(src.lastIndexOf(';', src.length - 2) + 1).trim().slice(0, 56));
    }
    fs.writeFileSync(titleJs, "if (a.title === b.title) { el.title = 'tooltip'; var t = document.title; }\n");   // reading the title, or setting the title attribute of an element, is fine
    const fineProblems = guard().problems.filter(p => /sets document\.title/.test(p));
    fs.rmSync(titleJs);
    check(!fineProblems.length, 'the guard leaves a script that only reads document.title or sets an element tooltip alone', fineProblems.join('\n'));
    /* the same function on more ways to change the tab title, and on text that does not change it */
    const titleWrites = ["document.title='x';", "doc.title = 'x';", "window.document.title = 'x';", "document[\"title\"] = 'x';", "document[`title`] = 'x';", "document.title ||= 'x';", "document.title ??= 'x';", "document.title = document.title + ' *';", "const dc = window.document; dc.title = 'x';", "document.querySelectorAll('title')[0].textContent = 'x';", "document.getElementsByTagName('title')[0].text = 'x';"];
    const titleFine = ["var t = document.title;", "if (document.title == 'x' || document.title != 'y' || document.title >= 'z') {}", "/* never write document.title = 'x' here */", "// doc.title = 'x' used to be here", "btn.title = 'Open'; el.setAttribute('title', 'x');"];
    const titleMissed = titleWrites.filter(s => !writesTabTitle(s)), titleFlagged = titleFine.filter(s => writesTabTitle(s));
    check(!titleMissed.length && !titleFlagged.length, 'the title check sees every usual way to change the tab title (also +=, ||=, ??=, a template-literal key, a local alias of document, querySelectorAll) and ignores comments and plain reads', titleMissed.map(s => 'missed: ' + s).concat(titleFlagged.map(s => 'flagged: ' + s)).join('\n'));
    const shellFile = path.join(copy, 'src/shell.html'), shellBefore = fs.readFileSync(shellFile, 'utf8');
    fs.writeFileSync(shellFile, shellBefore.replace('</body>', "<script>doc.title = 'x'</script></body>"));
    const inlineReported = guard().problems.some(p => /src\/shell\.html sets document\.title/.test(p));
    fs.writeFileSync(shellFile, shellBefore);
    check(shellBefore.includes('</body>') && inlineReported, 'the guard reports an inline script that changes the tab title');
    check(!guard().problems.some(p => /sets document\.title/.test(p)), 'no script and no page of the site changes the tab title');
    check(edit('about/index.html', h => h.replace(OG_RE, '<meta property="og:title" content="' + readRel('contact/index.html').match(OG_RE)[1] + '"')).some(p => /same page title/.test(p)), 'the keyword guard reports two pages with the same page title (og:title)');
    check(edit('about/index.html', h => h.replace(/(<meta name="description" content=")[^"]*/, '$1' + fs.readFileSync(path.join(copy, 'contact/index.html'), 'utf8').match(/<meta name="description" content="([^"]*)/)[1])).some(p => /same meta description as/.test(p)), 'the keyword guard reports two pages with the same meta description');
    check(edit('about/index.html', h => h.replace(OG_RE, '<meta property="og:title" content="' + 'About Shaunak Chorge, AI engineer. '.repeat(3) + '"')).some(p => /page title \(og:title\) is \d+ characters/.test(p)), 'the keyword guard reports a page title over 60 characters');
    check(edit('about/index.html', h => h.replace(/(<meta name="description" content=")[^"]*/, '$1' + 'x'.repeat(160))).some(p => /description is 160 characters/.test(p)), 'the keyword guard reports a description over 155 characters');
    check(edit('about/index.html', h => h.replace(/(<h1[^>]*>)[^<]*/, '$1Who I am')).some(p => /not in the H1/.test(p)), 'the keyword guard reports a primary keyword missing from the H1');
    check(edit('about/index.html', h => h.replace(OG_RE, '<meta property="og:title" content="About me | Portfolio"')).some(p => /not in the page title/.test(p)), 'the keyword guard reports a primary keyword missing from the page title');
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

    /* round 8: a polygon portrait frame with the whole picture, no pause or accent buttons anywhere, a ribbon that does not clip a hovered chip, no removed certificates */
    const storyHtml = (about.match(/<section id="story"[\s\S]*?<\/section>/) || [''])[0];
    check(/class="pg-split"/.test(storyHtml) && /class="np__edge"/.test(storyHtml) && /class="np__fill"/.test(storyHtml) && /class="np__tick np__tick--tl"/.test(storyHtml) && /class="np__tick np__tick--br"/.test(storyHtml), 'About: the portrait stands in a cut-corner polygon frame (outline, inside, both corner ticks) beside the whole story block');
    check(!/np__tag|np__corner|np__dot|np__float|Mumbai[^<]*IST/.test(storyHtml), 'About: the portrait carries no "Mumbai, India - IST" tag, caption or leftover tag class');
    const portraitCss = fs.readFileSync(path.join(copy, 'assets/css/sections/portrait.css'), 'utf8');
    check(/clip-path: var\(--np-poly\)/.test(portraitCss) && /clip-path: var\(--np-poly-in\)/.test(portraitCss) && /object-fit: contain/.test(portraitCss) && !/object-fit: cover/.test(portraitCss), 'the portrait frame is clipped to the polygon and the picture is fitted whole (object-fit: contain, never cover)');
    check(!/np__corner|np__tag|np__dot|np__float|np-float|np-blink/.test(portraitCss), 'the portrait stylesheet has no rule left from the earlier square frame (corner, tag, dot, float, blink)');

    /* the frame is two polygons drawn in CSS. Evaluate them exactly as a browser reads them (var(), calc(), %, cqw) for several frame shapes, so a plain rectangle, a missing
       declaration or a lopsided cut cannot pass: eight corners each, four true 45-degree cuts, and the inner polygon a constant 2px inside the outer one */
    const pcss = portraitCss.replace(/\/\*[\s\S]*?\*\//g, '');
    const declOf = (name, block) => { const m = block.match(new RegExp(name + '\\s*:\\s*([^;]+);')); return m ? m[1].trim() : null; };
    /* the text inside every `<header> { ... }` block of a stylesheet (comments removed, braces balanced), one string per block: the rules of one media query */
    const blocksOf = (css, header) => { const text = css.replace(/\/\*[\s\S]*?\*\//g, ''), out = []; let at = text.indexOf(header + ' {'); while (at >= 0) { const open = at + header.length + 1; let depth = 0, end = open; for (; end < text.length; end++) { if (text[end] === '{') depth++; else if (text[end] === '}' && --depth === 0) break; } out.push(text.slice(open + 1, end)); at = text.indexOf(header + ' {', end); } return out; };
    const stageBase = (pcss.match(/\.np__stage \{[^}]*\}/) || [''])[0];
    const stageCq = (pcss.match(/@supports \(width: 1cqw\) \{\s*\.np__stage \{[^}]*\}/) || [''])[0];
    const cssVar = {};
    for (const n of ['--np-bw', '--np-s', '--np-b', '--np-k']) cssVar[n] = declOf(n, stageCq) || declOf(n, stageBase);
    const polyText = n => ((stageBase.match(new RegExp(n + '\\s*:\\s*polygon\\(([^\\n]*)\\);')) || [])[1] || '');
    const topLevel = (s, sep) => { const out = []; let depth = 0, cur = ''; for (const ch of s) { if (ch === '(') depth++; if (ch === ')') depth--; if (depth === 0 && (sep === ',' ? ch === ',' : /\s/.test(ch))) { if (cur.trim()) out.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };
    const evalLen = (expr, axis, W, H) => {
      let js = expr;
      for (let pass = 0; pass < 8 && /var\(/.test(js); pass++) js = js.replace(/var\(\s*(--[\w-]+)\s*\)/g, (_, n) => '(' + cssVar[n] + ')');
      js = js.replace(/calc\(/g, '(').replace(/(\d*\.?\d+)cqw/g, `($1*${W / 100})`).replace(/(\d*\.?\d+)cqh/g, `($1*${H / 100})`).replace(/(\d*\.?\d+)px/g, '($1)').replace(/(\d*\.?\d+)%/g, `($1*${(axis === 'x' ? W : H) / 100})`);
      if (!/^[\d+\-*/().\s]+$/.test(js)) throw new Error('cannot evaluate ' + expr);
      return Function('return ' + js)();
    };
    const vertices = (n, W, H) => topLevel(polyText(n), ',').map(v => { const [x, y] = topLevel(v, ' '); return [evalLen(x, 'x', W, H), evalLen(y, 'y', W, H)]; });
    const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
    const shapeProblems = [];
    try {
      for (const [W, H] of [[416, 364], [352, 308], [304, 266], [288, 252], [416, 520], [416, 953]]) {
        const out = vertices('--np-poly', W, H), inn = vertices('--np-poly-in', W, H);
        if (out.length !== 8 || inn.length !== 8) { shapeProblems.push(`${W}x${H}: ${out.length} and ${inn.length} corners (want 8 and 8)`); continue; }
        const bw = evalLen(cssVar['--np-bw'], 'x', W, H);
        for (const i of [1, 3, 5, 7]) { const a = out[i], b = out[(i + 1) % 8]; if (Math.abs(Math.abs(b[0] - a[0]) - Math.abs(b[1] - a[1])) > 1e-6 || Math.abs(b[0] - a[0]) < W * 0.05) shapeProblems.push(`${W}x${H}: edge ${i} is not a 45-degree cut`); }
        for (const q of inn) { const d = Math.min(...out.map((a, i) => segDist(q, a, out[(i + 1) % 8]))); if (Math.abs(d - bw) > 0.01) shapeProblems.push(`${W}x${H}: an inner corner is ${d.toFixed(3)}px from the outline (want ${bw})`); }
        for (let i = 0; i < 8; i++) { const a = out[i], b = out[(i + 1) % 8], c = inn[i], d = inn[(i + 1) % 8]; if (Math.abs((b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0])) > 1e-6) shapeProblems.push(`${W}x${H}: inner edge ${i} is not parallel to the outline`); }
      }
    } catch (e) { shapeProblems.push(String(e.message || e)); }
    check(!shapeProblems.length, 'the portrait polygons are an eight-corner cut-corner shape with four true 45-degree cuts and an even 2px outline, for wide, tall and 4:5 frames', shapeProblems.slice(0, 6).join('\n'));
    check(/@supports \(width: 1cqw\) \{\s*\.np__stage \{[^}]*container-type: size/.test(pcss) && /@media \(min-width: 80em\) \{\s*\.np--side \{[^}]*--np-w: 26rem/.test(pcss) && /\.np \{[^}]*--np-over: \.46;[^}]*padding-top: calc\(var\(--np-w\) \* var\(--np-over\)\)/.test(pcss) && /\.np__stage \{[^}]*aspect-ratio: 8 \/ 7/.test(pcss) && /--np-fw: 100cqw/.test(pcss) && /@media \(min-width: 80em\) \{ \.pg-split \{ grid-template-columns: minmax\(0, 1fr\) 26rem/.test(fs.readFileSync(path.join(copy, 'assets/css/sections/pages.css'), 'utf8')), 'the frame is a short 8:7 box that measures itself (container units); the picture is as wide as the box, so the head rises above its top line, and the box keeps headroom for it (from 80em beside the text, 26rem wide)');
    const tiltRule = (pcss.match(/\.np__tilt \{[^}]*\}/) || [''])[0];
    check(/transform: perspective\(900px\) rotateY\(var\(--np-ry\)\) rotateX\(var\(--np-rx\)\)/.test(tiltRule) && /transform-origin: 50% 100%/.test(tiltRule), 'the portrait tilt turns about the bottom edge of the picture, X axis first, so the picture never lifts off the bottom edge of the frame');
    check(!/\.np(?:__(?:stage|hud|fig|tilt|pic))? \{[^}]*(?:overflow:\s*(?:hidden|clip)|contain:\s*(?:paint|strict|content))/.test(pcss) && !/\.np__pic img[^{]*\{[^}]*height:\s*1[1-9]\d%/.test(pcss), 'nothing in the portrait crops the picture or the frame glow (no overflow clip or paint containment on the frame, the figure or the picture, no oversized image)');
    check(/@media \(prefers-reduced-motion: reduce\) \{[^@]*\.np \*, \.np \*::before, \.np \*::after \{ animation: none !important/.test(pcss) && /@media \(forced-colors: active\) \{[^}]*\.np__edge/.test(pcss), 'the portrait stands still under reduced motion and keeps its outline in Windows high contrast');
    const npHover = blocksOf(pcss, '@media (hover: hover)');
    check(/\.np:hover \.np__ghost--c \{[^}]*animation: np-hover-c/.test(npHover.join('\n')) && /\.np:hover \.np__ghost--m \{[^}]*animation: np-hover-m/.test(npHover.join('\n')) && !/\.np:hover/.test(npHover.reduce((t, b) => t.replace(b, ''), pcss)) && /@keyframes np-hover-c/.test(pcss) && /@keyframes np-hover-m/.test(pcss), 'the portrait splits into colour ghosts while a mouse pointer is over it (never on a touch screen), as in the first version');

    const marqueeCss = fs.readFileSync(path.join(copy, 'assets/css/sections/marquee.css'), 'utf8');
    const mqMotion = blocksOf(marqueeCss, '@media (prefers-reduced-motion: no-preference)').join('\n'), mqHover = blocksOf(marqueeCss, '@media (hover: hover) and (prefers-reduced-motion: no-preference)').join('\n');
    const numIn = (css, re) => +((css.match(re) || [])[1] || 0);
    const mqRoom = numIn(mqMotion, /\.js \.mq__stage \{[^}]*padding-block: (\d+)px/), mqPull = numIn(mqMotion, /\.js \.mq__stage \{[^}]*margin-block: -(\d+)px/), mqLift = numIn(mqHover, /\.js \.mq__chip:hover \{[^}]*translate: 0 -(\d+)px/), mqGlow = numIn(mqHover, /\.js \.mq__chip:hover \{[^}]*box-shadow: 0 0 (\d+)px/), mqStrip = numIn(mqHover, /\.js \.mq__chip:hover::after \{[^}]*height: (\d+)px/);
    check(mqLift > 0 && mqGlow > 0 && mqRoom >= mqLift + mqGlow && mqPull === mqRoom && /\.js \.mq__stage \{[^}]*overflow: hidden/.test(mqMotion), 'the tools ribbon leaves room above and below its chips (at least the lift plus the glow, cancelled by a negative margin), so a hovered chip keeps its top border and glow');
    check(/\.js \.mq__track:hover \{ animation-play-state: paused; \}/.test(mqHover) && !/\.mq__stage:hover|\.mq:hover|\.mq__bar:hover/.test(marqueeCss) && /\.js \.mq__chip:hover::after \{[^}]*top: 100%/.test(mqHover) && mqStrip >= mqLift, 'the ribbon stops only over its chips (mouse only), and a pointer on the lowest pixels of a lifted chip stays on it: the strip under the chip is at least as tall as the lift');
    check(/prefers-reduced-motion: reduce\) and \(max-width: 767px\) \{[^@]*\.mq__track \{ justify-content: flex-start; \}/.test(marqueeCss), 'with reduced motion on a phone every tool in the ribbon can be reached by swiping (the row starts at the left)');
    check(/\.js \.mq__bar \{[^}]*min-height: 44px/.test(mqMotion) && !/\.mq__bar \{[^}]*min-height/.test(marqueeCss.replace(/\.js \.mq__bar \{[^}]*\}/, '')), 'the moving ribbon band keeps its old height (44px); with reduced motion the band is the chip row alone');
    const fxSrc = fs.readFileSync(path.join(copy, 'assets/js/sections/fx.js'), 'utf8');
    /* the network's frame function may end its loop in one place only: reduced motion. A timer on lastActive, an idle counter or a stop() call would be a way for the effects to go to sleep */
    const frameBody = (fxSrc.match(/function frame\(ts, dt\) \{([\s\S]*?)\r?\n    \}\r?\n/) || [])[1] || '';
    check(/^\s*if \(reduced\(\)\) \{ running = false; return false; \}/.test(frameBody) && (frameBody.match(/\breturn false\b/g) || []).length === 1 && (frameBody.match(/\brunning = false\b/g) || []).length === 1 && !/\bstop\(/.test(frameBody), 'the background network never stops by itself when the visitor is idle: its frame function ends the loop for reduced motion only (the effects run continuously)');

    /* no accent colour switch and no pause switch, in whatever words: look at what every button on every page says, and at every script, style and template */
    const stripCode = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ');
    const buttonsOf = html => { const h = stripCode(html), flat = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); return [...[...h.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(m => m[1] + ' ' + flat(m[2])), ...[...h.matchAll(/<(a|div|span|li)\b([^>]*\brole="button"[^>]*)>([\s\S]*?)<\/\1>/g)].map(m => m[2] + ' ' + flat(m[3]))].map(t => t.replace(/\s+/g, ' ').trim()); };
    /* a control that stops or restarts the effects, or recolours the site, as a button would word it: a verb together with what it acts on (so "Download resume" or "Colour palette demo" is left alone),
       the word pause or accent, a switch between themes or colours, or one of the old class names */
    const ACT = '(?:pause|stop|freeze|halt|resume|play|start|disable|enable|turn off|turn on|reduce|calm|mute)', THING = '(?:effects?|animations?|motion|movement|background|network|ticker|ribbon|marquee|typing)';
    const CONTROL_RE = new RegExp('\\b' + ACT + '\\b[^<>]{0,24}\\b' + THING + '\\b|\\bpause|\\baccent|\\b(?:change|switch|cycle|pick|choose|toggle|next)\\b[^<>]{0,20}\\b(?:theme|colou?rs?|hue)\\b|\\b(?:theme|colou?r)\\b[^<>]{0,12}\\b(?:switch|toggle|picker|selector)\\b|neon hue|fx-accent|data-accent|data-motion-toggle|mq__toggle|footer__motion|drawer__motion|fx-calm', 'i');
    const controlsLeft = builtPages.flatMap(rel => buttonsOf(pageHtml(rel)).filter(t => CONTROL_RE.test(t) || (/aria-pressed/.test(t) && !/data-filter/.test(t))).map(t => `${rel}: ${t.slice(0, 90)}`));
    check(!controlsLeft.length, 'no page has a button (or role="button" element) that pauses, stops or restarts the effects or changes the accent colour or theme, judged by what it says; a toggle button (aria-pressed) that is not a filter is flagged too', controlsLeft.slice(0, 6).join('\n'));
    const textLeft = [...builtPages, 'llms.txt', 'llms-full.txt'].filter(rel => /fx-accent|data-accent|data-motion-toggle|mq__toggle|footer__motion|drawer__motion|Pause (?:effects|animation|the)|Resume effects|accent colou?r/i.test(stripCode(pageHtml(rel))));
    check(!textLeft.length, 'no page or llms file mentions an accent colour switch or a pause switch', textLeft.join(' '));
    const codeLeft = [...walk(path.join(copy, 'assets/js')).filter(f => f.endsWith('.js')), ...walk(path.join(copy, 'assets/css')).filter(f => f.endsWith('.css')), path.join(copy, 'src/shell.html'), path.join(copy, 'src/footer.html')]
      .filter(f => /fx-paused|data-accent|fx-accent|\bPortfolio\.(?:accent|motion)\b|\bP\.(?:accent|motion)\b|pf:accent|pf:motion|data-motion-toggle|accent colou?r|setAccent|cycleAccent|toggleMotion|motionPaused/i.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(copy, f));
    check(!codeLeft.length, 'no script, style or template still drives an accent switch or a pause switch', codeLeft.join(' '));
    /* controls that scripts build while the page runs (the old accent and pause widgets were built that way): fx.js builds only the palette and terminal controls, and the scripts of the ribbon, footer, visuals and portrait build none */
    const sectionJs = f => fs.readFileSync(path.join(copy, 'assets/js/sections', f), 'utf8');
    const fxButtons = [...sectionJs('fx.js').matchAll(/\bh\(\s*'button'\s*,\s*'([\w-]+)'/g)].map(m => m[1]).sort();
    const buildsButton = ['marquee.js', 'footer.js', 'visuals.js', 'portrait.js'].filter(f => /createElement\(\s*['"]button|\bh\(\s*['"]button|<button|role=["']button|['"]role['"]\s*,\s*['"]button/.test(sectionJs(f)));
    check(JSON.stringify(fxButtons) === JSON.stringify(['fx-pal__x', 'fx-t-cmd', 'fx-term__qb', 'fx-term__x']) && !buildsButton.length, 'the only buttons the effects script builds are the palette and terminal controls, and the ribbon, footer, visuals and portrait scripts build none', `fx.js builds: ${fxButtons.join(' ')}; other scripts: ${buildsButton.join(' ') || 'none'}`);
    const REMOVED_CERTS = ['Python for Beginners', 'Introduction to SQL', 'Python Django'];
    check(!/SimpliLearn/i.test(pageHtml('llms-full.txt') + pageHtml('llms.txt') + fxSrc) && !content.certifications.some(c => REMOVED_CERTS.some(n => String(c.name).includes(n)) || /SimpliLearn/i.test(String(c.issuer))), 'the three SimpliLearn certificates are gone from the content, the llms files and the search data');

    /* a certificate grid whose last row is short keeps its tiles in the middle (no empty cells on the right) */
    const uiMod = await import(pathToFileURL(path.join(copy, 'tools/pages/ui.mjs')).href);
    const tile = (featured = false) => ({ featured });
    const rowCls = list => uiMod.lastRowClasses(list).map(c => c.trim());
    check(JSON.stringify(rowCls([tile(true), tile(), tile(), tile(), tile(), tile()])) === JSON.stringify(['', '', '', '', '', 'cert--last1of3 cert--last1of2']), 'a featured tile plus five more: the last tile stands in the middle of its row at 3 and at 2 columns');
    check(JSON.stringify(rowCls([tile(), tile(), tile(), tile(), tile()])) === JSON.stringify(['', '', '', 'cert--last2of3', 'cert--last1of2']), 'five tiles: the last two stand in the middle at 3 columns, the last one at 2');
    check(rowCls([tile(), tile(), tile(), tile(), tile(), tile()]).every(c => !c) && JSON.stringify(rowCls([tile(true), tile()])) === JSON.stringify(['', 'cert--last1of2']), 'full rows get no class (six tiles); a featured tile plus one more is a full row at 3 columns, and at 2 columns the single tile after the full-width one is centred');
    check(JSON.stringify(rowCls([tile(), tile(), tile(true)])) === JSON.stringify(['', '', 'cert--last2of3']), 'a featured tile alone on the last row is centred too');
    const pagesCss = fs.readFileSync(path.join(copy, 'assets/css/sections/pages.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const at40 = blocksOf(pagesCss, '@media (min-width: 40em)').join('\n'), at64 = blocksOf(pagesCss, '@media (min-width: 64em)').join('\n');
    const startOf = (css, cls) => { const m = css.match(new RegExp('\\.' + cls + ' \\{ grid-column-start: (\\d+|auto); \\}')); return m ? (m[1] === 'auto' ? null : +m[1]) : undefined; };
    const spanOf = (css, cls) => { const m = css.match(new RegExp('\\.' + cls + ' \\{ grid-column: ([^;]+); \\}')); return m ? m[1].trim() : ''; };
    check(!/\.certs[^{}]*\{[^}]*grid-auto-flow:\s*dense/.test(pagesCss), 'the certificate grid fills row by row, in list order (no grid-auto-flow: dense, which would put the centring on the wrong tile and make the Tab order differ from what is shown)');
    /* the long pages draw a section only near the screen (speed), but every section is drawn before a jump, so jump links and deep links land on their section */
    check(/\.pg-sec \{ content-visibility: auto;/.test(pagesCss) && /\.pg-all \.pg-sec \{ content-visibility: visible; \}/.test(pagesCss) && /html:has\(:target\) \.pg-sec \{ content-visibility: visible; \}/.test(pagesCss), 'the long pages draw a section only near the screen, but draw every section before a jump (html.pg-all) and when opened at a #section (:target)');
    const coreSrc = fs.readFileSync(path.join(copy, 'assets/js/core.js'), 'utf8');
    check(/function drawAll\(\)/.test(coreSrc) && (coreSrc.match(/\bdrawAll\(\)/g) || []).length >= 5 && /classList\.add\('pg-all'\)/.test(coreSrc), 'every jump (link click, palette, Back / Forward, reload, a #section at load) draws all sections first: drawAll() is defined and called from all four places');
    /* where the browser puts the tiles: CSS grid auto-placement (row by row) worked out for every list of up to eight tiles and every choice of featured tiles, with the spans and the start columns read from
       pages.css. The order on screen must be the order of the list (so the Tab order is what is shown), and a short last row must be centred */
    const parseCol = (v, cols) => (/^1 \/ -1$/.test(v) ? { start: 1, span: cols } : { start: null, span: +((/span (\d+)/.exec(v) || [])[1] || 0) });
    const gridLayouts = [
      { name: '2 columns', cols: 4, normal: parseCol(spanOf(at40, 'cert'), 4), wide: parseCol(spanOf(at40, 'cert--wide'), 4), starts: { 'cert--last1of2': startOf(at40, 'cert--last1of2') }, order: ['cert--last1of2'] },
      { name: '3 columns', cols: 6, normal: parseCol(spanOf(at40, 'cert'), 6), wide: parseCol(spanOf(at64, 'cert--wide'), 6), starts: { 'cert--last1of2': startOf(at64, 'cert--last1of2'), 'cert--last1of3': startOf(at64, 'cert--last1of3'), 'cert--last2of3': startOf(at64, 'cert--last2of3') }, order: ['cert--last1of2', 'cert--last1of3', 'cert--last2of3'] },
    ];
    const gridPlace = (tiles, cols) => {
      const taken = new Set(), free = (r, c, s) => { for (let k = 0; k < s; k++) if (taken.has(r + ':' + (c + k))) return false; return true; };
      let row = 0, col = 0;
      return tiles.map(t => {
        if (t.start != null) { const c = t.start - 1; if (c < col) row++; col = c; while (!free(row, col, t.span)) row++; }
        else { for (;;) { while (col + t.span <= cols && !free(row, col, t.span)) col++; if (col + t.span <= cols) break; row++; col = 0; } }
        for (let k = 0; k < t.span; k++) taken.add(row + ':' + (col + k));
        return { row, col, span: t.span };
      });
    };
    const gridProblems = []; let gridLists = 0;
    for (const L of gridLayouts) {
      if (!L.normal.span || !L.wide.span || Object.values(L.starts).some(v => v === undefined)) { gridProblems.push(`${L.name}: a span or a start-column rule is missing in pages.css`); continue; }
      for (let n = 1; n <= 8; n++) for (let mask = 0; mask < (1 << n); mask++) {
        const items = Array.from({ length: n }, (_, i) => ({ featured: !!(mask & (1 << i)) })), classes = uiMod.lastRowClasses(items);
        const tiles = items.map((it, i) => { const base = it.featured ? L.wide : L.normal; let start = base.start; for (const cls of L.order) if (classes[i].split(/\s+/).includes(cls)) start = L.starts[cls]; return { span: base.span, start }; });
        const spot = gridPlace(tiles, L.cols), lastRow = Math.max(...spot.map(p => p.row)), last = spot.filter(p => p.row === lastRow);
        const inOrder = spot.every((p, i) => !i || p.row > spot[i - 1].row || (p.row === spot[i - 1].row && p.col > spot[i - 1].col));
        const left = Math.min(...last.map(p => p.col)), right = L.cols - Math.max(...last.map(p => p.col + p.span));
        gridLists++;
        if (!inOrder || left !== right) gridProblems.push(`${L.name}: ${items.map(it => (it.featured ? 'F' : 't')).join(' ')} -> ${inOrder ? `last row not centred (${left} cells left, ${right} right)` : 'tiles out of order'}`);
      }
    }
    check(!gridProblems.length, `the certificate grid keeps the tiles in list order and centres a short last row, for every list of up to eight tiles with any featured tiles (${gridLists} lists, 2 and 3 columns)`, gridProblems.slice(0, 6).join('\n'));
    for (const [label, html] of [['About', about], ['Resume', pageHtml('resume/index.html')]]) {
      const groups = [...html.matchAll(/<ul class="certs[^"]*" role="list">([\s\S]*?)<\/ul>/g)].map(m => (m[1].match(/<li class="cert[^"]*"/g) || []));
      const wrong = groups.filter(g => JSON.stringify(g.map(li => (li.match(/cert--last\dof\d/g) || []).join(' '))) !== JSON.stringify(rowCls(g.map(li => tile(/cert--wide/.test(li))))));
      check(groups.length >= 2 && !wrong.length, label + ': every tile group (certificates, internships, awards) marks the start of its short last row', `${groups.length} groups, ${wrong.length} wrong`);
    }

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
      const driveId = u => (String(u || '').match(/\/file\/d\/([\w-]+)\//) || [])[1];
      const DOCS = [...new Set(content.certifications.map(c => driveId(c.doc)).filter(Boolean))];
      const ROUND8_DOCS = ['1DjSSoA8T4T8eKO4fFfhCbD1m9ZzV6HVU', '1K6HfqyUz_L3-IehnhPYmGURVjjBa2nRW'];   // the IgniteX and Academor certificates, as the owner sent them
      check(DOCS.length > 0 && ROUND8_DOCS.every(id => DOCS.includes(id)) && docs.size === DOCS.length && DOCS.every(id => docs.has(id)), label + ': every certificate document in content.json is linked as a Google Drive preview (the IgniteX and Academor links are the ones the owner sent), and no other Drive file is linked', [...docs].filter(id => !DOCS.includes(id)).concat(DOCS.filter(id => !docs.has(id)).map(id => 'missing ' + id)).join(' '));
      check((html.match(/class="cert__card"/g) || []).length === content.certifications.length + content.achievements.length && /certs--awards/.test(html), label + ': every certificate and award is a certificate-style tile', String((html.match(/class="cert__card"/g) || []).length));
      const certTitles = [...html.matchAll(/<h3 class="cert__title"[^>]*>([^<]*)<\/h3>/g)].map(m => m[1]);
      check(certTitles.length > 0 && !/SimpliLearn/i.test(html) && !certTitles.some(t => REMOVED_CERTS.some(n => t.includes(n))), label + ': the three SimpliLearn certificates are not shown');
    }
    const contactHtml = pageHtml('contact/index.html');
    check(/id="book"[^>]*data-booking=/.test(contactHtml) && /id="hire"/.test(contactHtml) && /data-tabs/.test(contactHtml) && (contactHtml.match(/class="connect-tile"/g) || []).length === 4, 'the contact page has the four quick-connect tiles, the Send a brief and Book a call tabs, and the booking picker');
    check(/<h2 class="contact__h contact__h--done">Request sent<\/h2>/.test(contactHtml) && /<h([23]) class="contact__h contact__h--done">Message sent<\/h\1>/.test(contactHtml), 'the "Request sent" and "Message sent" confirmations are headings, so the page outline never skips a level once a form is sent');
    check(/btn\.addEventListener\('keydown', function \(e\) \{ if \(e\.key === ' '/.test(fs.readFileSync(path.join(copy, 'assets/js/sections/contact.js'), 'utf8')), 'the floating "Let\'s talk" button answers to the Space key as well as Enter (it has role="button")');
    check(/els\.burger\.focus\(\{ preventScroll: true \}\)/.test(fs.readFileSync(path.join(copy, 'assets/js/core.js'), 'utf8')), 'closing the phone menu with Escape puts focus back on the menu button without scrolling the page');
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

    /* no project carries a Client / Academic / Personal tag: not in the data, not on a tile, not on a related card */
    check(!content.projects.some(p => 'origin' in p), 'no project has an origin field');
    check(!/tile__origin|pg-relcard__origin/.test(projectsPage + home), 'no tile shows a Client / Academic / Personal tag');
    {
      const withOrigin = JSON.parse(JSON.stringify(content)); withOrigin.projects[0].origin = 'Client';
      let msg = ''; try { loadSelection(withOrigin); } catch (e) { msg = e.message; }
      check(/origin/.test(msg), 'the selection check rejects an origin field');
    }

    /* the owner's resume PDF is never regenerated */
    check(crypto.createHash('md5').update(fs.readFileSync(path.join(SITE, 'assets/Shaunak-Chorge-Resume.pdf'))).digest('hex') === 'd8c97fc56dbdfff424884c8d0e27dc7b', "the resume PDF is the owner's file, unchanged");

    /* deploy_root: PF_DEPLOY_ROOT=1 (or seo.deploy_root) moves every URL to the root of /Portfolio/ and writes sitemap.xml + robots.txt inside the site folder */
    const deployBuild = spawnSync(process.execPath, [path.join(copy, 'build.mjs')], { cwd: copy, encoding: 'utf8', env: { ...process.env, PF_SITE: copy, PF_DEPLOY_ROOT: '1' } });
    check(deployBuild.status === 0, 'a build with PF_DEPLOY_ROOT=1 passes', (deployBuild.stdout + deployBuild.stderr).slice(-500));
    if (deployBuild.status === 0) {
      const idx = fs.readFileSync(path.join(copy, 'index.html'), 'utf8');
      check(idx.includes('<link rel="canonical" href="https://shaunakchorge.github.io/Portfolio/">'), 'deploy_root: the home canonical is https://shaunakchorge.github.io/Portfolio/');
      const sm = path.join(copy, 'sitemap.xml'), rb = path.join(copy, 'robots.txt');
      check(fs.existsSync(sm) && fs.existsSync(rb) && !fs.readFileSync(sm, 'utf8').includes('/new_portfolio/') && fs.readFileSync(rb, 'utf8').includes('Sitemap: https://shaunakchorge.github.io/Portfolio/sitemap.xml'), 'deploy_root: sitemap.xml and robots.txt sit inside the site folder with root URLs');
      const stale = walk(copy).filter(f => /\.(html|txt|xml)$/.test(f) && !/[\\/](src|tools)[\\/]/.test(f) && fs.readFileSync(f, 'utf8').includes('/Portfolio/new_portfolio/'));
      check(!stale.length, 'deploy_root: no generated page, llms file or sitemap still carries /Portfolio/new_portfolio/', stale.slice(0, 5).join('\n'));
      /* the deploy staging script (.github/scripts/stage-site.mjs, used by the root-deploy workflow): clean on this build, quiet about a file that is not a page (the one-line Google Search Console
         verification file) and loud about a page that has another title */
      const stageScript = path.join(repoRoot, '.github/scripts/stage-site.mjs');
      if (fs.existsSync(stageScript)) {
        const stage = () => spawnSync(process.execPath, [stageScript], { cwd: root, encoding: 'utf8' }), staged = f => fs.existsSync(path.join(root, '_site', f));
        const clean = stage();
        check(clean.status === 0 && staged('index.html') && staged('about/index.html') && staged('new_portfolio/about/index.html') && staged('404.html'), 'deploy staging: a clean build stages the pages at the root, a redirect page at every old address and the 404 page', (clean.stdout + clean.stderr).slice(-400));
        const verifyFile = path.join(copy, 'google0123456789abcdef.html');
        fs.writeFileSync(verifyFile, 'google-site-verification: google0123456789abcdef.html');
        const verify = stage(), verifyStaged = staged('google0123456789abcdef.html');
        fs.rmSync(verifyFile);
        check(verify.status === 0 && verifyStaged, 'deploy staging: a Search Console verification file (one line of text, not a page) is published and does not stop the deploy', (verify.stdout + verify.stderr).slice(-400));
        const strayDir = path.join(copy, 'zz-stray');
        fs.mkdirSync(strayDir);
        fs.writeFileSync(path.join(strayDir, 'index.html'), '<!doctype html><html><head><title>Another title</title></head><body></body></html>');
        const stray = stage();
        fs.rmSync(strayDir, { recursive: true });
        check(stray.status !== 0 && /zz-stray/.test(stray.stdout + stray.stderr), 'deploy staging: a page with another tab title stops the deploy and is named', (stray.stdout + stray.stderr).slice(-400));
      }
    }
  }
} finally {
  if (keep) console.log(`kept ${root}`); else fs.rmSync(root, { recursive: true, force: true });
}
console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
