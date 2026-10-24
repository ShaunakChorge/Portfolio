// Generator for the project selector (an owner tool: tick projects, copy the JSON into projects.config.json).
//   node tools/selector/gen.mjs        (build.mjs runs it)
// Reads content/content.json + projects.config.json + tools/selector/template.html and writes
//   tools/project-selector.html   (standalone, opens from disk; loads ../assets/css/base.css)
// It never writes projects.config.json: the selector page offers the new file as a download.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, readContent } from '../lib.mjs';
import { loadSelection } from '../selection.mjs';

const TEMPLATE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'template.html');
const OUT = path.join(SITE, 'tools', 'project-selector.html');

const c = readContent();
const sel = loadSelection(c);

function evidence(p) {
  const metrics = (p.metrics || []).length;
  const repo = p.repo ? 1 : 0;
  const src = (p.source_count ?? (p.sources || []).length) >= 4 ? 1 : 0;
  const pts = Math.min(metrics, 3) + repo + src;
  const level = pts >= 4 ? 'strong' : pts >= 2 ? 'good' : 'light';
  const srcN = p.source_count ?? (p.sources || []).length;
  const why = `${metrics} documented metric${metrics === 1 ? '' : 's'}, ${repo ? 'public repo' : 'no public repo'}, ${srcN} source${srcN === 1 ? '' : 's'}`;
  return { level, why };
}

const projects = c.projects.map((p) => {
  const status = String(p.status || '');
  const isPrivate = /private/i.test(status);
  const isEnterprise = /enterprise/i.test(status);
  const ev = evidence(p);
  return {
    id: p.id,
    title: p.title,
    category: p.category,
    group: p.category_group,
    tone: p.tone || 'cyan',
    blurb: p.card_blurb,
    isPrivate,
    isEnterprise,
    lowKey: sel.more.includes(p.id),
    hasCaseStudy: !!p.case_study,
    evidence: ev.level,
    evidenceWhy: ev.why,
    search: [p.title, p.category, p.card_blurb, status].join(' ').toLowerCase(),
  };
});

const groups = c.project_filters.filter((f) => f.id !== 'all').map((f) => ({ id: f.id, label: f.label }));

const data = {
  projects,
  groups,
  defaults: { show: sel.show, casestudy: sel.casestudy },
  keep: Object.fromEntries(Object.entries(sel.config).filter(([k]) => k !== 'show' && k !== 'casestudy')),   // the other lists of projects.config.json travel with the download
  drafted: projects.filter((p) => p.hasCaseStudy).map((p) => p.id),
  footnote:
    'Evidence is a rough measure of how much documented proof backs a project (metrics, a public repo, sources), not a quality score. ' +
    'Projects still awaiting owner confirmation, or left out on purpose, are not listed here.',
};

const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const html = fs.readFileSync(TEMPLATE, 'utf8').replace('/*__DATA__*/null', () => json);
fs.writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(1)} KB, ${projects.length} projects, ${groups.length} groups)`);

