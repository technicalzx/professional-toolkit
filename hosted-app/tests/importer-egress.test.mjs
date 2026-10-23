import test from 'node:test';
import assert from 'node:assert/strict';
import {ImportError,importPage,isPublicAddress,parseImportAllowedOrigins,publicDns,readLimited,validateUrl} from '../lib/toolkit/importer.mjs';

const origin='https://reviewed.example.org';
const content='Synthetic reviewed public portfolio content with enough detail to import. '.repeat(3);
const extract=async()=>({title:'Synthetic approved portfolio',text:content,description:'Synthetic fixture',headings:[]});
const page=()=>new Response('<html><body>'+content+'</body></html>',{headers:{'Content-Type':'text/html'}});
const errorCode=code=>error=>error instanceof ImportError && error.code===code;
const unavailable=()=>{throw Error('An unapproved destination must never cause I/O.');};

test('missing or empty policy disables URL import before DNS or fetch',async()=>{
  for(const allowedOrigins of[undefined,null,'',[], '[]']){
    await assert.rejects(importPage(origin+'/profile',{allowedOrigins,dns:unavailable,fetcher:unavailable}),error=>errorCode('URL_IMPORT_DISABLED')(error)&&error.status===503&&/Capture & review/.test(error.message));
  }
});
test('deployment policy accepts only a bounded array of exact HTTPS origins',()=>{
  assert.deepEqual([...parseImportAllowedOrigins(JSON.stringify(['HTTPS://REVIEWED.EXAMPLE.ORG/',origin]))],[origin]);
  assert.deepEqual([...parseImportAllowedOrigins([origin,'https://other.example.org'])],[origin,'https://other.example.org']);
  for(const value of['*',true,{},[origin,{}],['https://*.example.org'],['http://example.org'],['https://127.0.0.1'],['https://example.org:8443'],['https://user:password@example.org'],['https://example.org/path'],['https://example.org/?key=value'],['https://example.org/#fragment'],['https://www.linkedin.com'],Array(17).fill(origin),' '.repeat(8193)])assert.throws(()=>parseImportAllowedOrigins(value),errorCode('IMPORT_POLICY_INVALID'));
});
test('malformed configuration fails closed before any DNS or fetch',async()=>{
  await assert.rejects(importPage(origin,{allowedOrigins:'[invalid-json',dns:unavailable,fetcher:unavailable}),error=>errorCode('IMPORT_POLICY_INVALID')(error)&&error.status===503);
});
test('arbitrary domains and suffix or sibling matches cannot use a trusted origin',async()=>{
  for(const input of['https://attacker.example.org/rebind','https://reviewed.example.org.attacker.com','https://sub.reviewed.example.org','https://other.example.org'])await assert.rejects(importPage(input,{allowedOrigins:[origin],dns:unavailable,fetcher:unavailable}),errorCode('IMPORT_ORIGIN_NOT_ALLOWED'));
});
test('an attacker-controlled rebinding hostname is denied even with a forged public preflight',async()=>{
  let dnsCalls=0,fetchCalls=0;
  await assert.rejects(importPage('https://attacker.example.net/changes-dns',{allowedOrigins:[origin],dns:async()=>{dnsCalls++;return ['93.184.216.34'];},fetcher:async()=>{fetchCalls++;throw Error('Never fetch attacker target');}}),errorCode('IMPORT_ORIGIN_NOT_ALLOWED'));
  assert.equal(dnsCalls,0);assert.equal(fetchCalls,0);
});
test('approved origin still supplies truthful provenance and bounded credential-free requests',async()=>{
  const requests=[];
  const result=await importPage(origin+'/portfolio#summary',{allowedOrigins:[origin],dns:async host=>assert.equal(host,'reviewed.example.org'),extract,fetcher:async(url,options)=>{requests.push({url,options});return url.endsWith('/robots.txt')?new Response(null,{status:404}):page();}});
  assert.equal(result.provenance,'Imported public HTML');assert.equal(result.sourceUrl,origin+'/portfolio');assert.equal(result.text,content);assert.ok(result.importedAt);
  assert.equal(requests.length,2);
  for(const {url,options}of requests){assert.equal(new URL(url).origin,origin);assert.equal(options.redirect,'manual');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.referrerPolicy,'no-referrer');assert.equal(new Headers(options.headers).has('Cookie'),false);assert.equal(new Headers(options.headers).has('Authorization'),false);assert.ok(options.signal instanceof AbortSignal);}
});
test('relative redirects stay on an approved origin and recheck DNS and robots',async()=>{
  const requests=[],hosts=[];
  const result=await importPage(origin+'/old',{allowedOrigins:[origin],dns:async host=>hosts.push(host),extract,fetcher:async url=>{requests.push(url);return url.endsWith('/robots.txt')?new Response(null,{status:404}):url.endsWith('/old')?new Response(null,{status:302,headers:{location:'/current'}}):page();}});
  assert.equal(result.sourceUrl,origin+'/current');assert.equal(hosts.length,2);assert.deepEqual(requests,[origin+'/robots.txt',origin+'/old',origin+'/robots.txt',origin+'/current']);
});
test('redirects cannot cause DNS or robots fetches at a nonapproved origin',async()=>{
  const requests=[],hosts=[];
  await assert.rejects(importPage(origin+'/old',{allowedOrigins:[origin],dns:async host=>hosts.push(host),extract,fetcher:async url=>{requests.push(url);return url.endsWith('/robots.txt')?new Response(null,{status:404}):new Response(null,{status:302,headers:{location:'https://unapproved.example.net/profile'}});}}),errorCode('IMPORT_ORIGIN_NOT_ALLOWED'));
  assert.deepEqual(hosts,['reviewed.example.org']);assert.deepEqual(requests,[origin+'/robots.txt',origin+'/old']);
});
test('mutating the caller configuration during DNS cannot expand this request policy',async()=>{
  const allowedOrigins=[origin],other='https://other.example.net';
  let requests=0;
  await assert.rejects(importPage(origin+'/old',{allowedOrigins,dns:async()=>allowedOrigins.push(other),extract,fetcher:async url=>{requests++;return url.endsWith('/robots.txt')?new Response(null,{status:404}):new Response(null,{status:302,headers:{location:other+'/profile'}});}}),errorCode('IMPORT_ORIGIN_NOT_ALLOWED'));
  assert.equal(requests,2);
});
test('every redirected origin must be explicitly reviewed, not inherited from the first',async()=>{
  const second='https://second.example.org';
  const result=await importPage(origin+'/old',{allowedOrigins:[origin,second],dns:async()=>{},extract,fetcher:async url=>url.endsWith('/robots.txt')?new Response(null,{status:404}):url===origin+'/old'?new Response(null,{status:302,headers:{location:second+'/current'}}):page()});
  assert.equal(result.sourceUrl,second+'/current');
});
test('robots redirects fail closed without following their location',async()=>{
  let calls=0;
  await assert.rejects(importPage(origin,{allowedOrigins:[origin],dns:async()=>{},extract,fetcher:async()=>{calls++;return new Response(null,{status:302,headers:{location:'https://unapproved.example.net/robots.txt'}});}}),errorCode('ROBOTS_UNAVAILABLE'));
  assert.equal(calls,1);
});
test('restricted platforms retain the supported capture alternative with no network call',async()=>{
  for(const host of['www.linkedin.com','www.upwork.com','www.fiverr.com'])await assert.rejects(importPage('https://'+host+'/synthetic-profile',{allowedOrigins:[origin],dns:unavailable,fetcher:unavailable}),errorCode('PLATFORM_CONNECTION_REQUIRED'));
});
test('URL and DNS literal parsers reject malformed or special addresses conservatively',()=>{
  for(const value of['https://a..example.org','https://-bad.example.org','https://bad-.example.org','https://'+'a'.repeat(64)+'.example.org'])assert.throws(()=>validateUrl(value),errorCode('UNSAFE_URL'));
  for(const ip of['1..1.1','08.8.8.8','93.184.216.34 ','256.1.1.1','2001:4860::not-ip','2001:4860::1%eth0','2001:30::1','2001:db8::1','3fff::1','2002:7f00:1::','::ffff:127.0.0.1'])assert.equal(isPublicAddress(ip),false,ip);
  for(const ip of['93.184.216.34','8.8.8.8','2606:4700:4700::1111','2001:4860:4860::8888'])assert.equal(isPublicAddress(ip),true,ip);
});
test('mixed public/private A or AAAA answers reject before robots and page fetch',async()=>{
  for(const [type,privateIp]of[[1,'127.0.0.1'],[28,'::ffff:127.0.0.1']]){
    let pages=0;
    await assert.rejects(importPage(origin,{allowedOrigins:[origin],extract,fetcher:async url=>{if(!url.startsWith('https://cloudflare-dns.com/')){pages++;return page();}const selected=new URL(url).searchParams.get('type');return Response.json({Status:0,Answer:selected===(type===1?'A':'AAAA')?[{type,data:privateIp},{type:1,data:'93.184.216.34'}]:[]});}}),errorCode('UNSAFE_ADDRESS'));
    assert.equal(pages,0);
  }
});
test('DNS denial after an approved redirect stops the next page request',async()=>{
  let dnsCalls=0,pages=0;
  await assert.rejects(importPage(origin+'/old',{allowedOrigins:[origin],extract,dns:async()=>{if(++dnsCalls===2)throw new ImportError('Synthetic DNS policy denial','UNSAFE_ADDRESS');},fetcher:async url=>url.endsWith('/robots.txt')?new Response(null,{status:404}):(pages++,new Response(null,{status:302,headers:{location:'/current'}}))}),errorCode('UNSAFE_ADDRESS'));
  assert.equal(pages,1);
});
test('oversized DNS replies are bounded and response streams are cancelled',async()=>{
  let cancelled=false;
  const response=()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(65537));},cancel(){cancelled=true;}}));
  await assert.rejects(publicDns('reviewed.example.org',async()=>response()),errorCode('TOO_LARGE'));assert.equal(cancelled,true);
});
test('content-length overflow cancels without buffering the page',async()=>{
  let cancelled=false;
  const r=new Response(new ReadableStream({cancel(){cancelled=true;}}),{headers:{'Content-Length':'524289'}});
  await assert.rejects(readLimited(r),errorCode('TOO_LARGE'));assert.equal(cancelled,true);
});
