export class ImportError extends Error {
  constructor(message, code = 'IMPORT_FAILED', status = 422) { super(message); this.code = code; this.status = status; }
}
const restrictedPlatforms = ['linkedin.com','upwork.com','fiverr.com'];
const captureAlternative = 'Use Capture & review, import a JSON snapshot, or paste content you may use instead.';

/** Deployment policy only: never populate this list from request data or a user URL. */
export function parseImportAllowedOrigins(configuration) {
  if (configuration === undefined || configuration === null || configuration === '') return new Set();
  let values = configuration;
  if (typeof values === 'string') {
    if (values.length > 8192) throw new ImportError('Website import configuration is invalid. '+captureAlternative, 'IMPORT_POLICY_INVALID', 503);
    try { values = JSON.parse(values); } catch { throw new ImportError('Website import configuration is invalid. '+captureAlternative, 'IMPORT_POLICY_INVALID', 503); }
  }
  if (!Array.isArray(values) || values.length > 16) throw new ImportError('Website import configuration is invalid. '+captureAlternative, 'IMPORT_POLICY_INVALID', 503);
  const origins = new Set();
  for (const value of values) {
    try {
      const url = validateUrl(value);
      // Configuration names origins, not wildcard domains, URLs with credentials,
      // user-supplied suffixes, paths or implicit approval of sibling subdomains.
      if (url.pathname !== '/' || url.search || new URL(value).hash || restrictedPlatforms.some(h=>url.hostname===h||url.hostname.endsWith('.'+h))) throw new Error('Not a permitted origin');
      origins.add(url.origin);
    } catch { throw new ImportError('Website import configuration is invalid. '+captureAlternative, 'IMPORT_POLICY_INVALID', 503); }
  }
  return origins;
}
function requireAllowedOrigin(url, origins) {
  if (!origins.size) throw new ImportError('Server URL importing is not configured on this deployment. '+captureAlternative, 'URL_IMPORT_DISABLED', 503);
  if (!origins.has(url.origin)) throw new ImportError('This website is not approved for server importing on this deployment. '+captureAlternative, 'IMPORT_ORIGIN_NOT_ALLOWED');
}
export function validateUrl(input) {
  if (typeof input !== 'string' || input.length > 2048) throw new ImportError('Enter a URL shorter than 2,048 characters.', 'INVALID_URL', 400);
  let url;
  try { url = new URL(input.trim()); } catch { throw new ImportError('Enter a complete https:// URL.', 'INVALID_URL', 400); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !host.includes('.') || host.endsWith('.') || /(^|\.)(localhost|local|internal|lan|home|test|invalid)$/.test(host) ||
      host.includes(':') || host.startsWith('[') || /^[\d.]+$/.test(host) || host.length > 253 || !host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))
    throw new ImportError('Use a public HTTPS domain without credentials, IP addresses or custom ports.', 'UNSAFE_URL', 400);
  url.hash = '';
  return url;
}
export function isPublicAddress(ip) {
  if (typeof ip !== 'string' || ip !== ip.trim()) return false;
  if (ip.includes(':')) {
    let normalized;
    try { normalized = new URL('https://['+ip+']/').hostname.slice(1,-1); } catch { return false; }
    // Conservatively accept global-unicast IPv6, excluding special/documentation
    // prefixes. This DNS check is defense in depth, not connection-time pinning.
    const [first,second] = normalized.split(':').map(value=>parseInt(value||'0',16));
    return first >= 0x2000 && first <= 0x3fff && first !== 0x2002 && first !== 0x3fff && !(first === 0x2001 && (second < 0x200 || second === 0xdb8));
  }
  if (!/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(ip)) return false;
  const a = ip.split('.').map(Number);
  if (a.length !== 4 || a.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [x,y,z] = a;
  return !(x === 0 || x === 10 || x === 127 || x >= 224 || (x === 100 && y >= 64 && y <= 127) ||
    (x === 169 && y === 254) || (x === 172 && y >= 16 && y <= 31) ||
    (x === 192 && (y === 168 || y === 0 || (y === 88 && z === 99))) ||
    (x === 198 && (y === 18 || y === 19 || (y === 51 && z === 100))) ||
    (x === 203 && y === 0 && z === 113));
}
export async function publicDns(host, fetcher = fetch, signal) {
  const answers = await Promise.all(['A','AAAA'].map(async type => {
    const r = await fetcher('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(host)+'&type='+type,
      {headers:{Accept:'application/dns-json'}, redirect:'error', signal});
    if (!r.ok) { await r.body?.cancel(); throw new ImportError('Could not verify the public address. Try again later.', 'DNS_FAILED'); }
    const d = JSON.parse(await readLimited(r,65536));
    if (![0,3].includes(d.Status)) throw new ImportError('Could not verify the public address.', 'DNS_FAILED');
    return (d.Answer || []).filter(x=>x.type===1 || x.type===28).map(x=>x.data);
  }));
  const ips = answers.flat();
  if (!ips.length || !ips.every(isPublicAddress)) throw new ImportError('This address cannot be imported safely.', 'UNSAFE_ADDRESS');
}
export async function readLimited(response, max = 524288) {
  if (Number(response.headers.get('content-length')) > max) { await response.body?.cancel(); throw new ImportError('The page is too large. Paste its relevant content instead.', 'TOO_LARGE'); }
  if (!response.body) return '';
  const reader=response.body.getReader(), chunks=[]; let size=0;
  try {
    while (true) {
      const {done,value}=await reader.read(); if(done) break;
      size+=value.byteLength;
      if(size>max) { await reader.cancel(); throw new ImportError('The page exceeds the import size limit.', 'TOO_LARGE'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes=new Uint8Array(size); let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  return new TextDecoder().decode(bytes);
}
export function robotsAllows(text, pathname) {
  let agents=[], rules=[], groups=[], hasRules=false;
  for(const raw of text.split(/\r?\n/)){
    const line=raw.split('#')[0].trim(), colon=line.indexOf(':'); if(colon<0)continue;
    const key=line.slice(0,colon).toLowerCase(), value=line.slice(colon+1).trim();
    if(key==='user-agent'){
      if(hasRules){groups.push({agents,rules});agents=[];rules=[];hasRules=false}
      agents.push(value.toLowerCase());
    } else if((key==='allow'||key==='disallow')&&agents.length){rules.push({allow:key==='allow',path:value});hasRules=true}
  }
  groups.push({agents,rules});
  const exact=groups.filter(g=>g.agents.includes('professionaltoolkit'));
  const selected=exact.length?exact:groups.filter(g=>g.agents.includes('*'));
  let matches=[];
  for(const g of selected)for(const rule of g.rules){
    if(!rule.path)continue;
    const ending=rule.path.endsWith('$'), raw=ending?rule.path.slice(0,-1):rule.path;
    const escaped=raw.split('*').map(s=>s.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&')).join('.*');
    if(new RegExp('^'+escaped+(ending?'$':'')).test(pathname))matches.push(rule);
  }
  matches.sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
  return !matches.length||matches[0].allow;
}
export async function extractHtml(html, Rewriter = globalThis.HTMLRewriter) {
  if(!Rewriter)throw new ImportError('The HTML parser is unavailable.', 'PARSER_UNAVAILABLE', 503);
  const cleaned = await new Rewriter().on('script,style,noscript,svg,iframe,nav,footer,header,[hidden],[aria-hidden="true"]',
    {element(e){e.remove()}}).transform(new Response(html)).text();
  let title='', body='', description='', heading='', headings=[];
  await new Rewriter()
    .on('title',{text(t){title+=t.text}})
    .on('meta',{element(e){const k=e.getAttribute('name')||e.getAttribute('property');if(k==='description'||(!description&&k==='og:description'))description=e.getAttribute('content')||''}})
    .on('h1,h2',{element(){heading=''},text(t){heading+=t.text;if(t.lastInTextNode && heading.trim())headings.push(heading.trim())}})
    .on('body',{text(t){body+=t.text+' '}})
    .transform(new Response(cleaned)).text();
  const clean=s=>s.replace(/\s+/g,' ').trim();
  return {title:clean(title).slice(0,300),description:clean(description).slice(0,1500),
    headings:[...new Set(headings.map(clean))].slice(0,20),text:clean(body).slice(0,20000)};
}
export async function importPage(input, dependencies={}) {
  const fetcher=dependencies.fetcher||fetch, dns=dependencies.dns||((h,s)=>publicDns(h,fetcher,s)),
    extract=dependencies.extract||extractHtml;
  let url=validateUrl(input);
  if(restrictedPlatforms.some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))
    throw new ImportError('This platform needs an authorized integration or pasted content. Paste your profile or gig text below to analyze it.', 'PLATFORM_CONNECTION_REQUIRED');
  // A separate DoH lookup cannot pin Workers fetch's TLS connection. Only an
  // operator-reviewed exact-origin policy may authorize this limited importer.
  // No policy means no DNS, robots or page request at all. General URL fetching
  // requires a separately verified connection-enforcing egress implementation.
  const allowedOrigins = parseImportAllowedOrigins(dependencies.allowedOrigins);
  requireAllowedOrigin(url, allowedOrigins);
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),12000);
  try {
    for(let redirects=0;redirects<=3;redirects++){
      url=validateUrl(url.href);
      if(restrictedPlatforms.some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))throw new ImportError('The link redirects to a platform requiring pasted content or an authorized connection.', 'PLATFORM_CONNECTION_REQUIRED');
      requireAllowedOrigin(url, allowedOrigins);
      await dns(url.hostname,controller.signal);
      {
        const robots=await fetcher(url.origin+'/robots.txt',{redirect:'manual',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal,headers:{'User-Agent':'ProfessionalToolkit/0.2 (single-page user-requested import)'}});
        if(robots.status!==404 && robots.status!==410){
          if(!robots.ok){await robots.body?.cancel();throw new ImportError('Unable to confirm the site permits importing. Paste the content instead.', 'ROBOTS_UNAVAILABLE');}
          const policy=await readLimited(robots,65536);
          if(!robotsAllows(policy,url.pathname+url.search))throw new ImportError('This site disallows automated access to this page. Paste content you may use instead.', 'ROBOTS_BLOCKED');
        } else await robots.body?.cancel();
      }
      // Check again at each fetch boundary. The allowlist is immutable for this
      // request; DNS is still not a promise that fetch uses the checked answer.
      requireAllowedOrigin(url, allowedOrigins);
      const r=await fetcher(url.href,{redirect:'manual',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal,headers:{Accept:'text/html,application/xhtml+xml','User-Agent':'ProfessionalToolkit/0.2 (single-page user-requested import)'}});
      if([301,302,303,307,308].includes(r.status)){
        await r.body?.cancel();
        const location=r.headers.get('location');if(!location)throw new ImportError('The page redirected without a destination.', 'BAD_REDIRECT');
        url=validateUrl(new URL(location,url).href);continue;
      }
      if(!r.ok){await r.body?.cancel();throw new ImportError('The page could not be retrieved (HTTP '+r.status+'). Paste the content instead.', 'REMOTE_BLOCKED');}
      if(!/^(text\/html|application\/xhtml\+xml)(;|$)/i.test(r.headers.get('content-type')||'')){await r.body?.cancel();throw new ImportError('Only public HTML pages are supported. Paste text from this file instead.', 'UNSUPPORTED_TYPE');}
      const html=await readLimited(r);
      if(/captcha|verify you are human|cf-chl-|checking your browser/i.test(html))throw new ImportError('This page requires human verification. Paste its content instead.', 'CHALLENGE');
      const content=await extract(html);
      if(content.text.length<80)throw new ImportError('Too little readable content was available. The page may require sign-in or JavaScript. Paste its content instead.', 'INSUFFICIENT_CONTENT');
      return {...content,sourceUrl:url.href,requestedUrl:input,importedAt:new Date().toISOString(),provenance:'Imported public HTML',
        limitations:['Single page only; no sign-in, linked pages or JavaScript rendering.','Review the extracted text before using it. Hidden content and navigation may not be fully excluded.']};
    }
    throw new ImportError('The page has too many redirects. Use its final public URL.', 'TOO_MANY_REDIRECTS');
  } catch(e) {
    if(e instanceof ImportError)throw e;
    throw new ImportError(controller.signal.aborted?'Import timed out. Paste the content or try again.':'The site could not be reached. Paste the content instead.', 'FETCH_FAILED');
  } finally {clearTimeout(timer)}
}
