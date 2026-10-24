// test.mjs - `npm test`. Builds a COPY of the site in a temp folder and checks the result. Nothing in the repo is changed.
//   1. the build passes (banned words, languages once, every link and every #anchor resolves, no readable-asset links)
//   2. building again gives byte-identical files (the build is deterministic)
//   3. the files the build wrote equal the files in the repo (run `npm run build` if they do not: the deployed pages are stale)
//   4. the link guard really catches a broken "Hire me" anchor (contact/?topic=...#hire)
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
const OUTPUT = /^(index\.html|llms(-full)?\.txt|\.built-pages\.json|assets\/dist\/|assets\/js\/sections\/fx\.js|src\/generated\/|tools\/project-selector\.html|(about|contact|faq|projects|resume|services)\/)/;
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
    const contact = path.join(copy, 'contact/index.html');
    fs.writeFileSync(contact, fs.readFileSync(contact, 'utf8').replace(/id="hire"/g, 'id="hire-renamed"'));
    check(checkLinks([page]).problems.some(p => p.includes('#hire')), 'the link guard reports a renamed #hire anchor behind ?topic=');
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
