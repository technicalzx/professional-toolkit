export function toolkitOrigin(input){
  const url=new URL(input);
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))throw Error('Enter only the toolkit HTTPS origin, or a localhost development origin.');
  return url.origin;
}
export function randomNonce(){return [...crypto.getRandomValues(new Uint8Array(16))].map(x=>x.toString(16).padStart(2,'0')).join('');}
// Runs in the toolkit page, so its HttpOnly cookie stays in the browser.
export async function websiteAccount(){
  const response=await fetch('/api/account',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('Toolkit account service is unavailable.');
  const value=await response.json();
  return value.user?{username:String(value.user.username),name:String(value.user.name)}:null;
}
export async function websiteReviews(){
  const response=await fetch('/api/reports',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('Sign in on the toolkit to sync saved review titles.');
  const value=await response.json();
  return value.reports.filter(r=>r.kind==='captured-review').slice(0,5).map(r=>({id:r.cloudId,title:String(r.title).slice(0,200),mode:r.mode}));
}
// The one-time nonce routes a bounded untrusted snapshot. It grants no API authority.
export async function handoffToWebsite(message){
  return new Promise((resolve,reject)=>{
    let attempts=0;
    const finish=(error)=>{clearInterval(timer);window.removeEventListener('message',listener);error?reject(Error(error)):resolve(true);};
    const listener=e=>{if(e.source===window&&e.origin===location.origin&&e.data?.channel===message.channel&&e.data?.type==='received'&&e.data?.nonce===message.nonce)finish(e.data.error||'');};
    window.addEventListener('message',listener);
    const send=()=>{if(++attempts>40){finish('Toolkit did not accept the snapshot. Keep the toolkit page open, refresh it and retry.');return;}window.postMessage(message,location.origin);};
    const timer=setInterval(send,250);send();
  });
}
