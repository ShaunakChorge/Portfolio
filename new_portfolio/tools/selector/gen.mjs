// Re-runnable generator for the project selector (an owner tool: tick projects, copy the JSON into projects.config.json).
//   node tools/selector/gen.mjs [--write-config]
// Reads content/content.json + tools/selector/template.html, writes
//   tools/project-selector.html   (standalone, opens from disk; loads ../assets/css/base.css)
//   projects.config.json          (only with --write-config, or if missing)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
import { SITE, CONTENT_FILE } from '../paths.mjs';
const CONTENT = CONTENT_FILE;
const TEMPLATE = path.join(here, 'template.html');
const OUT = path.join(SITE, 'tools', 'project-selector.html');
const CONFIG = path.join(SITE, 'projects.config.json');

const c = JSON.parse(fs.readFileSync(CONTENT, 'utf8'));
const sd = c.selection_default;

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
    lowKey: p.tier === 'more' || p.early_work === true,
    hasCaseStudy: !!p.case_study,
    evidence: ev.level,
    evidenceWhy: ev.why,
    search: [p.title, p.category, p.card_blurb, status].join(' ').toLowerCase(),
  };
});

const known = new Set(projects.map((p) => p.id));
const filt = (a) => a.filter((i) => known.has(i));
const groups = c.project_filters.filter((f) => f.id !== 'all').map((f) => ({ id: f.id, label: f.label }));

const data = {
  projects,
  groups,
  defaults: { show: filt(sd.show), casestudy: filt(sd.casestudy) },
  drafted: projects.filter((p) => p.hasCaseStudy).map((p) => p.id),
  footnote:
    'Evidence is a rough measure of how much documented proof backs a project (metrics, a public repo, sources), not a quality score. ' +
    'Projects still awaiting owner confirmation, or left out on purpose, are not listed here.',
};

const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const html = fs.readFileSync(TEMPLATE, 'utf8').replace('/*__DATA__*/null', () => json);
fs.writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${(html.length / 1024).toFixed(1)} KB, ${projects.length} projects, ${groups.length} groups)`);

if (process.argv.includes('--write-config') || !fs.existsSync(CONFIG)) {
  fs.writeFileSync(CONFIG, JSON.stringify({ show: data.defaults.show, casestudy: data.defaults.casestudy }, null, 2) + '\n');
  console.log(`wrote ${CONFIG}`);
} else {
  console.log('projects.config.json exists: left untouched (use --write-config to reset to the default)');
}
