// make-pdf.mjs - builds assets/Shaunak-Chorge-Resume.pdf from content/content.json, so the download can never drift from the site.
//   node tools/resume/make-pdf.mjs            (needs Playwright with Chromium: npm i --no-save playwright, see tools/optional.mjs)
//   node tools/resume/make-pdf.mjs --html     write tools/resume/resume.print.html only (to look at the layout in a browser)
// Rules it follows (same as the site): no project years, no spoken-language list, no grades, "and" instead of "&", plain words. Job dates are resume facts.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SITE, esc } from '../lib.mjs';
import { withPage } from '../optional.mjs';
import { cfg, experience, education, certifications, achievements, skills, profile, resumeProjects, EMAIL, GITHUB, LINKEDIN, RESUME_PDF } from '../pages/data.mjs';

/** plain-words pass for the short forms that exist in the content strings */
const plain = s => String(s)
  .replace(/\s*&\s*/g, ' and ')
  .replace(/\bTF-IDF\b/g, 'word-frequency scoring')
  .replace(/\bNLP\b/g, 'Natural language processing')
  .replace(/\bRAG \(answers from documents\)/g, 'AI that answers from your own documents');
const E = s => esc(plain(s));

const work = experience.filter(e => e.group === 'work');
const prog = experience.filter(e => e.group !== 'work');
const edu = education.filter(e => !e.minor)[0];
const feat = resumeProjects;   // the featured case studies of projects.config.json (same list as the resume page)
const fonts = f => pathToFileURL(path.join(SITE, 'assets/fonts', f)).href;

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Shaunak Chorge - AI Engineer resume</title>
<style>
@font-face { font-family: "SG"; src: url("${fonts('space-grotesk-var-latin.woff2')}") format("woff2"); font-weight: 300 700; }
@page { size: A4; margin: 14mm 15mm 14mm 15mm; }
* { box-sizing: border-box; }
html { color: #14161f; font: 400 9.6pt/1.42 "SG", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; }
h1 { margin: 0; font: 700 23pt/1.1 "SG", Arial, sans-serif; letter-spacing: -.01em; }
h2 { margin: 13pt 0 5pt; padding-bottom: 2.5pt; border-bottom: 1.2pt solid #0a8f9c; font: 700 10.5pt/1.2 "SG", Arial, sans-serif; letter-spacing: .09em; text-transform: uppercase; color: #0b5f69; break-after: avoid; }
h3 { margin: 0; font: 700 10.4pt/1.3 "SG", Arial, sans-serif; }
p { margin: 0; }
.role { margin-top: 3pt; font: 600 11.5pt/1.3 "SG", Arial, sans-serif; color: #0b5f69; }
.contact { margin-top: 5pt; font-size: 9.2pt; color: #3a3f4d; }
.contact span + span::before { content: "  |  "; color: #8b90a0; }
.sum { margin-top: 2pt; }
.job { margin-top: 7pt; break-inside: avoid; }
.job:first-of-type { margin-top: 0; }
.head { display: flex; justify-content: space-between; gap: 10pt; align-items: baseline; }
.org { color: #3a3f4d; font-weight: 600; }
.when { white-space: nowrap; color: #4a4f5e; font-size: 9pt; }
ul { margin: 2.5pt 0 0; padding-left: 12pt; }
li { margin: 1.2pt 0; padding-left: 1pt; }
.tools { margin-top: 2.5pt; color: #4a4f5e; font-size: 8.8pt; }
.tools b { color: #14161f; }
.small li { margin: 1pt 0; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18pt; }
.pj { margin: 2.5pt 0; break-inside: avoid; }
.pj b { font-weight: 700; }
.muted { color: #4a4f5e; }
</style></head><body>
<header>
  <h1>${esc(cfg.name)}</h1>
  <p class="role">AI Engineer at ${esc(cfg.person.employer)}, Mumbai | Freelance AI and Python developer</p>
  <p class="contact"><span>${esc(EMAIL)}</span><span>${esc(LINKEDIN.replace(/^https:\/\/(www\.)?/, ''))}</span><span>${esc(GITHUB.replace(/^https:\/\//, ''))}</span><span>Mumbai, India (IST)</span></p>
</header>

<h2>Summary</h2>
<p class="sum">${E(profile.summary_short)}</p>

<h2>Experience</h2>
${work.map(e => `<section class="job">
  <div class="head"><h3>${E(e.role)} <span class="org">| ${E(e.org)}</span></h3><span class="when">${esc(e.period)}${e.location ? ' | ' + esc(e.location) : ''}</span></div>
  <ul>${e.bullets.map(b => `<li>${E(b)}</li>`).join('')}</ul>
  <p class="tools"><b>Tools:</b> ${E(e.tags.join(', '))}</p>
</section>`).join('\n')}

<h2>Earlier internships and programmes</h2>
<ul class="small">${prog.map(e => `<li><b>${E(e.role)}</b>, ${E(e.org)} <span class="muted">(${esc(e.period)})</span>${e.bullets.length ? ': ' + E(e.bullets.join(' ')) : ''}</li>`).join('')}</ul>

<h2>Selected projects</h2>
${feat.map(p => `<p class="pj"><b>${E(p.title)}.</b> ${E(p.card_blurb)}</p>`).join('\n')}
<p class="pj muted">Full case studies with measured results: ${esc(cfg.url.replace(/^https?:\/\//, ''))}projects/</p>

<h2>Skills</h2>
<p><b>Core tools:</b> ${E(skills.core.join(', '))}.</p>
<p style="margin-top:3pt"><b>Also work with:</b> ${E(skills.also.join(', '))}.</p>

<div class="two">
  <div>
    <h2>Education</h2>
    <p><b>${E(edu.degree)}, ${E(edu.year)}</b></p>
    <p>${E(edu.institution)}</p>
    ${edu.activities && edu.activities.length ? `<p class="muted">${E(edu.activities.join(', '))}</p>` : ''}
  </div>
  <div>
    <h2>Awards</h2>
    <ul class="small">${achievements.map(a => `<li>${E(a.title)}</li>`).join('')}</ul>
  </div>
</div>

<h2>Certifications</h2>
<ul class="small">${certifications.map(c => `<li>${E(c.name)} <span class="muted">(${E(c.issuer)})</span></li>`).join('')}</ul>
</body></html>`;

const htmlFile = path.join(SITE, 'tools/resume/resume.print.html');
fs.writeFileSync(htmlFile, html);
if (process.argv.includes('--html')) { console.log('wrote', htmlFile); process.exit(0); }

try {
  await withPage(async page => {
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(SITE, RESUME_PDF);
    await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
    console.log('wrote', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
  });
} finally { fs.rmSync(htmlFile, { force: true }); }
