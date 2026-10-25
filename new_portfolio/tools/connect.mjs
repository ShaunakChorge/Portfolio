// connect.mjs - the ways to connect (content.connect): book a call, send a brief, WhatsApp, email.
// ONE module read by the page generators (the contact page strip) and by build.mjs (the floating "Let's talk" menu in the footer of every page).
// It imports only lib.mjs, so build.mjs can use it without a circular import.
import { readContent, esc, icon } from './lib.mjs';

let cache = null;
const C = () => cache || (cache = readContent());

/** the WhatsApp chat link: the number is profile.phone_tel (the one phone value), the opening line is content.connect.whatsapp_text */
export const whatsappHref = () => `https://wa.me/${String(C().profile.phone_tel).replace(/\D/g, '')}?text=${encodeURIComponent(C().connect.whatsapp_text)}`;

/** an optional live calendar (Cal.com, Calendly or similar): profile.links.booking. When it is set, "Book a call" opens it; otherwise the request picker on /contact/ */
export const liveCalendarUrl = () => String((C().profile.links || {}).booking || '');

/** [{ id, label, hint, icon, href, external }] with the links resolved for a page whose root is `b` ('' home, '../' one folder deep) */
export function connectActions(b) {
  const live = liveCalendarUrl();
  const href = { book: live || `${b}contact/#book`, brief: `${b}contact/#hire`, whatsapp: whatsappHref(), email: `mailto:${C().profile.email}` };
  return C().connect.actions.map(a => ({ ...a, href: href[a.id], external: a.id === 'whatsapp' || (a.id === 'book' && !!live) }));
}

/** the list items of the floating menu (footer.html {{footer_connect}}) */
export function connectMenuItems(b) {
  return connectActions(b).map(a => `<li><a class="connect__item" href="${esc(a.href)}"${a.external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${icon(a.icon)}<span><strong>${esc(a.label)}</strong><small>${esc(a.hint)}</small></span>${a.external ? '<span class="sr-only"> (opens in a new tab)</span>' : ''}</a></li>`).join('\n            ');
}
