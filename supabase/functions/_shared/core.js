export const LANGUAGES = ['en','es','zh-Hans','vi','ar','ht','ko','ru','fil'];
export function validatePreference(p) {
  if (!p || !/^\d{5}$/.test(p.zip) || !LANGUAGES.includes(p.language)) throw new Error('Choose a valid ZIP code and language.');
  return p;
}
export function eligibleAlert(feature, now = Date.now()) {
  const p = feature?.properties;
  return !!(p && typeof feature.id === 'string' && p.status === 'Actual' && p.messageType !== 'Cancel' &&
    ['Severe','Extreme'].includes(p.severity) && Number.isFinite(Date.parse(p.expires)) && Date.parse(p.expires) > now);
}
export function sourceText(p) {
  // Preserve official wording; do not infer shelters or rewrite instructions.
  return [p.event, p.headline, p.description, p.instruction].filter(Boolean).join('\n\n');
}
export function smsText(message, id, language) {
  // Never silently truncate potentially life-saving instructions. Send a short notice with the full alert on Ark.
  const url = new URL('https://pekruse.github.io/Ark/account.html');
  url.searchParams.set('alert', id);
  return language === 'en'
    ? `Ark: An official severe weather alert is active for your saved area. Read the full alert: ${url}. Reply STOP to unsubscribe. Msg/data rates may apply.`
    : `Ark: ${message.split('\n')[0].slice(0,160)}\n${url}\nSTOP = unsubscribe. Msg/data rates may apply.`;
}
