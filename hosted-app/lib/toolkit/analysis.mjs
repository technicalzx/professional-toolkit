export function analyzeContent({title='',text='',goal='',keywords='',sourceUrl='',provenance='User-provided',importedAt=null}) {
  text=text.trim();title=title.trim();
  if(text.length<80)throw Error('Add at least 80 characters of profile, service or page content.');
  const excerpt=pattern=>text.match(pattern)?.[0]||'';
  const proof=excerpt(/[^.!?\n]*\b\d+(?:[.,]\d+)?\s*(?:%|years?|clients?|projects?|customers?|hours?|days?|users?)\b[^.!?\n]*/i);
  const service=excerpt(/[^.!?\n]*\b(?:help|build|design|manage|develop|deliver|consult|support|service|speciali[sz]e|engineer|audit|deploy|automate|create)\w*\b[^.!?\n]*/i);
  const action=excerpt(/[^.!?\n]*\b(?:contact|book|schedule|message|email|request|hire|call|reach out|get in touch|order)\b[^.!?\n]*/i);
  const criteria=[
    {name:'Clear heading',weight:20,pass:title.length>=10&&title.length<=180,evidence:title,advice:'Write a specific heading that states your role or offer and who it helps.'},
    {name:'Enough detail to assess',weight:20,pass:text.split(/\s+/).length>=80,evidence:text.split(/\s+/).length+' words supplied',advice:'Explain your services, process and relevant experience in at least 80 useful words.'},
    {name:'Service or expertise wording',weight:20,pass:!!service,evidence:service,advice:'State the service you provide and the outcome clients can expect.'},
    {name:'Quantified evidence',weight:25,pass:!!proof,evidence:proof,advice:'Add a truthful, verifiable result or experience measure. Do not invent numbers.'},
    {name:'Contact or next step',weight:15,pass:!!action,evidence:action,advice:'Add a direct next step, such as requesting a consultation or viewing a relevant case study.'}
  ];
  const terms=[...new Set(keywords.split(/[,\n]/).map(x=>x.trim()).filter(Boolean))].slice(0,20);
  const keywordResults=terms.map(term=>({term,found:(title+' '+text).toLowerCase().includes(term.toLowerCase())}));
  return {kind:'audit',title:title||'Content assessment',score:criteria.filter(c=>c.pass).reduce((n,c)=>n+c.weight,0),criteria,
    methodology:'Five transparent English-language heuristics. A passing check means a text pattern was detected, not that a claim is true or the content is high quality. This is not an SEO, ranking or ATS prediction.',
    keywordResults,goal,wordCount:text.split(/\s+/).length,sourceUrl,provenance,importedAt,createdAt:new Date().toISOString(),
    recommendations:criteria.filter(c=>!c.pass).sort((a,b)=>b.weight-a.weight).map(c=>({title:c.name,action:c.advice,priority:c.weight>=20?'High':'Medium',effort:'Low'}))};
}
export function matchBrief(profile,brief) {
  if(profile.trim().length<40||brief.trim().length<40)throw Error('Add at least 40 characters in both your experience and the job brief.');
  const stop=new Set('about after again also and are been being both can could for from have into just more most must need not our should some than that the their them then there these they this those through use using want was were what when where which will with work would you your years experience required requirements looking role team company'.split(' '));
  const words=[...new Set((brief.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g)||[]).filter(x=>!stop.has(x)))].slice(0,30);
  const tokens=new Set(profile.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g)||[]);
  return {kind:'match',title:'Job / brief comparison',matched:words.filter(x=>tokens.has(x)),missing:words.filter(x=>!tokens.has(x)),
    methodology:'Literal English keyword comparison, capped at 30 terms. Review each term; this does not assess eligibility, synonyms or semantic job fit.',createdAt:new Date().toISOString()};
}
export function draftProposal({name='',service='',brief='',evidence='',question=''}) {
  if(!service.trim()||brief.trim().length<40)throw Error('Add your service and a client brief of at least 40 characters.');
  return {kind:'proposal',title:'Proposal outline',text:'Hello'+(name?' '+name:'')+',\n\nI understand your brief as follows: '+brief.trim()+'\n\nMy proposed contribution: '+service.trim()+'.\n\n'+(evidence?'Relevant experience: '+evidence.trim()+'\n\n':'[Add a truthful, relevant example of your work.]\n\n')+
    'Before confirming scope, timeline and pricing, I would like to clarify: '+(question.trim()||'[What are the deliverables, success criteria and deadline?]')+'\n\n[Add your name and a relevant portfolio link.]',
    methodology:'Template assembled from your inputs. No AI provider is connected. Review the wording and all claims before sending.',createdAt:new Date().toISOString()};
}
export function projectPrice(rate,hours,expenses,buffer) {
  const nums=[rate,hours,expenses,buffer].map(v=>{if(String(v).trim()==='')throw Error('Complete every pricing field.');const n=Number(v);if(!Number.isFinite(n)||n<0)throw Error('Use finite, non-negative values.');return n});
  if(nums[1]<=0||nums[3]>100)throw Error('Hours must be positive; contingency must be 0–100%.');
  const labor=nums[0]*nums[1], total=(labor+nums[2])*(1+nums[3]/100);
  if(!Number.isFinite(total))throw Error('Result exceeds the numeric range.');
  return {kind:'price',title:'Project estimate',labor,total:Number(total.toFixed(2)),expenses:nums[2],buffer:nums[3],methodology:'(Hourly rate × estimated hours + expenses) × (1 + contingency / 100). Same currency throughout; taxes excluded.',createdAt:new Date().toISOString()};
}
