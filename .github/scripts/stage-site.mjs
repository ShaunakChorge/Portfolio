// stage-site.mjs - used only by .github/workflows/pages.yml. Builds the folder "_site" that GitHub Pages publishes when the new site is served as the
// ROOT of https://shaunakchorge.github.io/Portfolio/ (README: "Serve the site at the root of /Portfolio/").
//   1. the public files of new_portfolio/ (pages, assets, llms files, sitemap.xml, robots.txt, manifest), without sources and tools
//   2. 404.html from the repository root, with its addresses moved to the root
//   3. old_portfolio/ unchanged, so https://shaunakchorge.github.io/Portfolio/old_portfolio/ keeps working
//   4. a small redirect page at every OLD address (/Portfolio/new_portfolio/...) pointing to the new address, so links and search results made before
//      the move still land on the right page (GitHub Pages cannot send a real 301; this is a canonical link plus an instant refresh)
//   5. a check that every published page carries the one tab title exactly once (the deploy fails rather than publish a stray one); a file that is not a page, such as the
//      one-line google....html file of Google Search Console, is left alone
// Run from the repository root after:  cd new_portfolio && PF_DEPLOY_ROOT=1 node build.mjs
import fs from 'node:fs';
import path from 'node:path';

const OUT = '_site';
const SITE = 'new_portfolio';
const content = JSON.parse(fs.readFileSync(path.join(SITE, 'content/content.json'), 'utf8'));
const rootUrl = String(content.seo.site_root_url).replace(/\/*$/, '/');
const oldPath = '/' + new URL(content.seo.site_url).pathname.replace(/^\/|\/$/g, '') + '/';   // /Portfolio/new_portfolio/
// the browser-tab title is ONE constant string on every page (content.json seo.tab_title), the redirect pages below included
const tabTitle = String(content.seo.tab_title).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

fs.rmSync(OUT, { recursive: true, force: true });
const SKIP = /^(node_modules|\.git|src|tools|content|package\.json|package-lock\.json|projects\.config\.json|build\.mjs|\.built-pages\.json|README\.md)$/;
// (on Windows Node hands the filter a \? path; path.resolve + a prefix strip makes the relative path right on every system)
const srcRoot = path.resolve(SITE);
fs.cpSync(SITE, OUT, { recursive: true, filter: s => { const parts = path.relative(srcRoot, path.resolve(s.startsWith('\\\\?\\') ? s.slice(4) : s)).split(path.sep); return !SKIP.test(parts[0]) && !parts.includes('node_modules'); } });
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

// 404: the root file points at /Portfolio/new_portfolio/; in the new layout the site is /Portfolio/
let nf = fs.readFileSync('404.html', 'utf8');
nf = nf.split('/Portfolio/new_portfolio/').join('/Portfolio/').split('url("new_portfolio/').join('url("');
fs.writeFileSync(path.join(OUT, '404.html'), nf);

if (fs.existsSync('old_portfolio')) fs.cpSync('old_portfolio', path.join(OUT, 'old_portfolio'), { recursive: true });

const pages = ['', ...JSON.parse(fs.readFileSync(path.join(SITE, '.built-pages.json'), 'utf8'))];
for (const p of pages) {
  const target = rootUrl + p;
  const dir = path.join(OUT, oldPath.split('/').filter(Boolean).slice(1).join('/'), p);   // _site/new_portfolio/<page>/
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${tabTitle}</title>
<link rel="canonical" href="${target}">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)} + location.hash);</script>
</head>
<body><p>This page has moved to <a href="${target}">${target}</a>.</p></body>
</html>
`);
}
// every page that is published (the archived old_portfolio at the top of _site keeps its own title) must carry the constant tab title, exactly once in the head:
// fail the deploy rather than publish a stray one
const stray = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!(dir === OUT && e.name === 'old_portfolio')) walk(p); continue; }
    if (!e.name.endsWith('.html')) continue;
    const html = fs.readFileSync(p, 'utf8');
    if (!/<!doctype\s+html|<html[\s>]|<head[\s>]|<title[\s>]/i.test(html)) continue;   // not a page (e.g. the Search Console verification file): nothing to check
    const head = (html.match(/<head[\s>][\s\S]*?<\/head>/i) || [html])[0];
    const titles = [...head.matchAll(/<title>([\s\S]*?)<\/title>/g)].map(m => m[1]);
    if (titles.length !== 1 || titles[0] !== tabTitle) stray.push(`${path.relative(OUT, p)}: ${titles.length ? titles.map(t => `"${t}"`).join(' + ') : 'no <title>'}`);
  }
})(OUT);
if (stray.length) { console.error(`these published pages do not carry the tab title "${tabTitle}":\n  ${stray.join('\n  ')}`); process.exit(1); }
console.log(`staged ${OUT}: ${pages.length} pages at the root, ${pages.length} redirect pages under ${oldPath}; every published page has the tab title`);
