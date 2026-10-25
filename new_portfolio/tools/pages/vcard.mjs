// vcard.mjs - the contact card (assets/Shaunak-Chorge.vcf) that "Save my contact" on /contact/ downloads.
// Every value comes from content.json (profile, seo.site_url), so the card cannot drift from the site. Lines end with CRLF, as the vCard format requires.
import { cfg, content, profile, EMAIL } from './data.mjs';

const esc = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);

export function vcard() {
  const [first, ...rest] = cfg.name.split(' ');
  const last = rest.join(' ');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${esc(last)};${esc(first)};;;`,
    `FN:${esc(cfg.name)}`,
    `ORG:${esc(cfg.person.employer)}`,
    `TITLE:${esc(cfg.person.jobTitle)}`,
    `TEL;TYPE=CELL:${profile.phone}`,
    `EMAIL;TYPE=INTERNET:${EMAIL}`,
    `URL:${cfg.url}`,
    `ADR;TYPE=WORK:;;;${esc(cfg.person.city)};;;${esc(cfg.person.country || 'India')}`,
    `NOTE:${esc(`${cfg.person.jobTitle} at ${cfg.person.employer}. ${profile.freelance.line_short}.`)}`,
    'END:VCARD',
  ];
  return lines.join('\r\n') + '\r\n';
}
export const VCARD_PATH = content.connect.vcard;   // assets/Shaunak-Chorge.vcf, relative to the site folder
