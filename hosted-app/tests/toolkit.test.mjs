import './capture-api.test.mjs';
import './capture.test.mjs';
// Include planning coverage in the existing contributor CI entry point.
import './planner.test.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateUrl,isPublicAddress,robotsAllows,importPage,readLimited} from '../lib/toolkit/importer.mjs';
import {analyzeContent,matchBrief,draftProposal,projectPrice} from '../lib/toolkit/analysis.mjs';
import calculators from '../lib/toolkit/calculators.cjs';
test('URL validation rejects internal, credentials, ports and encoded IP formats',()=>{
 for(const url of ['http://example.com','https://localhost','https://127.1','https://2130706433','https://0x7f000001','https://[::1]','https://user:pass@example.com','https://example.com:8443','https://box.internal','file:///etc/passwd'])
  assert.throws(()=>validateUrl(url),url);
 assert.equal(validateUrl('https://example.com/page#section').href,'https://example.com/page');
});
test('DNS guard rejects reserved ranges',()=>{
 for(const ip of ['127.0.0.1','10.1.1.1','172.16.1.1','192.168.0.1','169.254.169.254','100.64.0.1','::1','fc00::1','2001:db8::1','203.0.113.1'])assert.equal(isPublicAddress(ip),false,ip);
 assert.equal(isPublicAddress('93.184.216.34'),true);
 assert.equal(isPublicAddress('2606:4700:4700::1111'),true);
});
test('robots longest-match, wildcard and specific group rules',()=>{
 const rules='User-agent: *\nDisallow: /private\nAllow: /private/public\nDisallow: /*?token=*\n';
 assert.equal(robotsAllows(rules,'/private/a'),false);
 assert.equal(robotsAllows(rules,'/private/public/a'),true);
 assert.equal(robotsAllows(rules,'/a?token=x'),false);
 assert.equal(robotsAllows('User-agent: ProfessionalToolkit\nDisallow: /\nUser-agent: *\nAllow: /','/a'),false);
});
const html='<html><body>Public portfolio '+('real useful content '.repeat(20))+'</body></html>';
const extract=async()=>({title:'Portfolio',text:'Useful public experience '.repeat(20),description:'Services',headings:[]});
test('successful import has provenance and retrieval timestamp',async()=>{
 const r=await importPage('https://example.com/services',{dns:async()=>{},extract,fetcher:async url=>url.endsWith('/robots.txt')?new Response('',{status:404}):new Response(html,{headers:{'Content-Type':'text/html'}})});
 assert.equal(r.provenance,'Imported public HTML');assert.equal(r.sourceUrl,'https://example.com/services');assert.ok(r.importedAt);
});
test('redirect to internal URL is rejected before second request',async()=>{
 let pages=0;
 await assert.rejects(importPage('https://example.com',{dns:async()=>{},extract,fetcher:async url=>{if(url.endsWith('/robots.txt'))return new Response('',{status:404});pages++;return new Response(null,{status:302,headers:{location:'https://127.0.0.1/secret'}})}}),/public HTTPS/);
 assert.equal(pages,1);
});
test('platform imports require authorized access or pasted text',async()=>{
 await assert.rejects(importPage('https://www.linkedin.com/in/person',{fetcher:()=>{throw Error('Must not fetch')}}),/authorized integration/);
});
test('robots disallow prevents page request',async()=>{
 let count=0;await assert.rejects(importPage('https://example.com/private',{dns:async()=>{},extract,fetcher:async()=>{count++;return new Response('User-agent: *\nDisallow: /private')}}),/disallows/);assert.equal(count,1);
});
test('oversized content is bounded even without content-length',async()=>{await assert.rejects(readLimited(new Response('x'.repeat(200)),100),/size limit/)});
test('non-HTML and human verification return actionable errors',async()=>{
 for(const [response,pattern] of [[()=>new Response('{}',{headers:{'Content-Type':'application/json'}}),/Only public HTML/],[()=>new Response('<html>verify you are human</html>',{headers:{'Content-Type':'text/html'}}),/human verification/]]){
  await assert.rejects(importPage('https://example.com',{dns:async()=>{},extract,fetcher:async url=>url.endsWith('/robots.txt')?new Response('',{status:404}):response()}),pattern);
 }
});
test('audit exposes weights, evidence and limitations',()=>{
 const r=analyzeContent({title:'Cloud infrastructure engineering',text:'I help clients deploy cloud systems. Delivered 20 projects. Contact me to discuss your requirements. '+('We document infrastructure and monitoring changes clearly. '.repeat(12)),keywords:'cloud, Kubernetes'});
 assert.equal(r.score,100);assert.equal(r.criteria.reduce((n,c)=>n+c.weight,0),100);assert.match(r.criteria[3].evidence,/20 projects/);assert.equal(r.keywordResults[1].found,false);
});
test('empty audit cannot produce a score',()=>assert.throws(()=>analyzeContent({text:'short'}),/80 characters/));
test('job match is literal and never invents qualifications',()=>{
 const r=matchBrief('I deploy Ansible and Linux systems with documented monitoring practices.','We require Ansible Linux Kubernetes monitoring deployment for infrastructure.');
 assert.ok(r.matched.includes('ansible'));assert.ok(r.missing.includes('kubernetes'));assert.match(r.methodology,/Literal/);
});
test('proposal placeholders do not invent evidence',()=>{
 const r=draftProposal({service:'Set up monitoring',brief:'We need a documented Prometheus monitoring deployment for our Linux servers.'});
 assert.match(r.text,/truthful/);assert.match(r.methodology,/No AI provider/);
});
test('project estimate and existing calculators handle boundaries',()=>{
 assert.equal(projectPrice('40','10','100','10').total,550);
 assert.throws(()=>projectPrice('','10','0','0'));
 assert.equal(calculators.calculate('pricing',{income:900,costs:100,hours:100,fee:20})['Hourly rate'],12.5);
 assert.throws(()=>calculators.calculate('percentage',{earned:20,total:0}));
});
