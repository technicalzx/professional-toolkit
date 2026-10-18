export const SNAPSHOT_VERSION = 1;
export const CAPTURE_CHANNEL = 'professional-toolkit.capture.v1';
function bounded(value, name, min, max) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw Error(`${name} must contain ${min}–${max} characters.`);
  return value.trim();
}
export function sourceUrl(value) {
  const url = new URL(bounded(value, 'Source URL', 1, 2048));
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !/^[a-z0-9.-]+$/i.test(url.hostname) || !url.hostname.includes('.') || /^[\d.]+$/.test(url.hostname) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) throw Error('Use a public HTTPS source URL.');
  url.search = ''; url.hash = '';
  return url.href;
}
export function platformFor(url) {
  const host = new URL(url).hostname;
  return ['linkedin','upwork','fiverr'].find(p => host === `${p}.com` || host.endsWith(`.${p}.com`)) || 'website';
}
export function validateSnapshot(value) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== SNAPSHOT_VERSION) throw Error('Unsupported snapshot. Choose a Toolkit version 1 JSON snapshot.');
  const url = sourceUrl(value.sourceUrl);
  if (!['browser-capture','manual-snapshot'].includes(value.captureMethod)) throw Error('Unknown capture method.');
  if (typeof value.capturedAt !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(value.capturedAt) || !Number.isFinite(Date.parse(value.capturedAt))) throw Error('A valid capture timestamp is required.');
  if (!Array.isArray(value.headings) || value.headings.length > 30 || value.headings.some(h => typeof h !== 'string' || h.length > 200)) throw Error('Use at most 30 headings of 200 characters.');
  return {schemaVersion:1,sourceUrl:url,platform:platformFor(url),title:bounded(value.title,'Page title',1,200),text:bounded(value.text,'Captured text',80,20000),headings:value.headings.map(h=>h.trim()).filter(Boolean),capturedAt:value.capturedAt,captureMethod:value.captureMethod,userEdited:value.userEdited===true,
    limitations:['User-selected page snapshot; content and profile ownership are unverified.','Only loaded readable content is captured; hidden, unloaded and inaccessible sections may be missing.']};
}
export function validateHandoff(value, nonce) {
  if (!/^[a-f0-9]{32}$/.test(nonce || '') || value?.channel !== CAPTURE_CHANNEL || value?.type !== 'capture' || value?.nonce !== nonce) throw Error('Invalid capture handoff.');
  return {snapshot:validateSnapshot(value.snapshot),prompt:bounded(value.prompt || 'Review this profile and recommend evidence-based improvements.','Review request',1,1500)};
}
export function localReview(value, prompt = '') {
  const snapshot = validateSnapshot(value);
  if (typeof prompt !== 'string' || prompt.length > 1500) throw Error('Review request is too long.');
  const text = snapshot.text;
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(Boolean);
  const terms = [...new Set(prompt.toLowerCase().match(/[\p{L}\p{N}+#.-]{3,}/gu)||[])].filter(t=>!['this','that','with','from','profile','review','recommend','improvements','and','the','for'].includes(t));
  const checks = [
    {id:'offer',label:'Service or expertise statement',pattern:/\b(help|build|design|develop|manage|engineer|consult|deliver|speciali[sz]e|research)\w*\b/i,action:'State what you deliver, for whom, and the problem it solves.'},
    {id:'evidence',label:'Measurable experience statement',pattern:/\b\d+(?:[.,]\d+)?\s*(?:%|years?|projects?|clients?|users?|hours?)\b/i,action:'Add a truthful project outcome and a supporting artifact. A number alone is not verification.'},
    {id:'next-step',label:'Contact or next step',pattern:/\b(contact|message|hire|book|order|portfolio|case study)\b/i,action:'Provide a clear next step or a relevant portfolio example.'},
  ].map(c=>{const quote=sentences.find(s=>c.pattern.test(s))||'';return {id:c.id,label:c.label,status:quote?'Observed wording':'Not observed in captured text',quote,action:c.action};});
  const excerpts = sentences.map(s=>({quote:s,relevance:terms.filter(t=>s.toLowerCase().includes(t)).length})).filter(x=>x.relevance).sort((a,b)=>b.relevance-a.relevance).slice(0,5);
  return {kind:'captured-review',title:`${snapshot.platform} · ${snapshot.title}`.slice(0,200),mode:'local',request:prompt,source:snapshot,checks,excerpts,
    explanation:'Transparent text checks and literal evidence lookup. Custom requests select relevant excerpts; open-ended answers require the optional AI review. Missing wording may reflect an incomplete capture. No platform rank, earnings, ownership or skill verification is inferred.',createdAt:new Date().toISOString()};
}
export function restoreCapturedReview(value) {
  if(value?.kind!=='captured-review'||!['local','ai'].includes(value.mode))throw Error('Invalid saved capture review.');
  const source=validateSnapshot(value.source),request=bounded(value.request||'Review this profile.','Review request',1,1500);
  if(value.mode==='local')return localReview(source,request);
  const summary=bounded(value.summary,'Review summary',1,2500);
  if(!Array.isArray(value.findings)||value.findings.length>6||!Array.isArray(value.missingInformation)||value.missingInformation.length>10)throw Error('Invalid saved findings.');
  const findings=value.findings.map(f=>{const quote=bounded(f?.quote,'Source quote',1,600);if(!source.text.includes(quote))throw Error('A review quote is absent from its source.');return {quote,observation:bounded(f.observation,'Observation',1,1000),recommendation:bounded(f.recommendation,'Recommendation',1,1000)};});
  const improvedDraft=value.improvedDraft===undefined?undefined:bounded(value.improvedDraft,'Improved draft',1,2200);
  if(value.nextSteps!==undefined&&(!Array.isArray(value.nextSteps)||value.nextSteps.length>5))throw Error('Invalid next steps.');
  const nextSteps=value.nextSteps?.map(s=>bounded(s,'Next step',1,350));
  return {kind:'captured-review',title:`${source.platform} · ${source.title}`.slice(0,200),mode:'ai',source,request,summary,findings,...(typeof value.model==='string'?{model:bounded(value.model,'Model',1,200)}:{}),...(improvedDraft?{improvedDraft,draftEdited:value.draftEdited===true}:{}),...(nextSteps?{nextSteps}:{}),missingInformation:value.missingInformation.map(s=>bounded(s,'Missing information',1,500)),createdAt:typeof value.createdAt==='string'?value.createdAt:'',explanation:'Saved AI-generated suggestions. Source quotes are checked; observations and claims still require your review.'};
}
