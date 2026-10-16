// Self-contained: Chrome serializes this function for activeTab injection.
export function capturePage() {
  const url=new URL(location.href),host=url.hostname;
  if(url.protocol!=='https:')throw Error('Open a public HTTPS profile or website page.');
  const is=domain=>host===domain||host.endsWith('.'+domain);
  if((is('linkedin.com')&&!url.pathname.startsWith('/in/'))||(is('upwork.com')&&!/^\/(freelancers|jobs)\//.test(url.pathname))||(is('fiverr.com')&&/^\/(inbox|users|settings|dashboard|orders|login|join|billing|payments)(\/|$)/i.test(url.pathname))||/\/(messages|inbox|billing|payments|settings|login|signin)(\/|$)/i.test(url.pathname))throw Error('Open a profile, gig, job or public content page, not messages, account settings or payments.');
  const platform=is('linkedin.com')?'linkedin':is('upwork.com')?'upwork':is('fiverr.com')?'fiverr':'website';
  const root=document.querySelector('main,[role="main"]')||document.body;
  if(!root)throw Error('The page has not loaded.');
  const ignored='script,style,noscript,nav,header,footer,aside,form,input,textarea,select,button,[contenteditable],iframe,[hidden],[aria-hidden="true"],[role="dialog"],[role="navigation"],[role="alert"]';
  const visible=node=>{
    if(node.closest(ignored))return false;
    for(let p=node;p&&p!==document.documentElement;p=p.parentElement){const s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||s.opacity==='0')return false;}
    return node.getClientRects().length>0;
  };
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node,count=0,text='',truncated=false;
  while((node=walker.nextNode())&&count++<12000){
    if(!node.parentElement||!visible(node.parentElement))continue;
    const part=node.textContent.replace(/\s+/g,' ').trim();if(!part)continue;
    if(text.length+part.length+1>20000){truncated=true;break;}text+=(text?'\n':'')+part;
  }
  if(count>=12000)truncated=true;
  if(text.length<80)throw Error('Not enough readable content. Let the profile load and expand the sections you want reviewed.');
  const headings=[...root.querySelectorAll('h1,h2,h3')].filter(visible).map(h=>h.innerText.trim().slice(0,200)).filter(Boolean).slice(0,30);
  url.search='';url.hash='';
  return {schemaVersion:1,sourceUrl:url.href,platform,title:(document.querySelector('h1')?.innerText||document.title||'Selected page').trim().slice(0,200),text,headings,capturedAt:new Date().toISOString(),captureMethod:'browser-capture',truncated};
}
