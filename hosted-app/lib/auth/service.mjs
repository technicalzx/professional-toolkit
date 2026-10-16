import {Buffer} from 'node:buffer';
import {scryptSync,randomBytes,createHash,timingSafeEqual} from 'node:crypto';

const COOKIE='__Host-toolkit_session';
const TTL=7*24*60*60;
const KDF={N:32768,r:8,p:3,maxmem:64*1024*1024};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
class AuthError extends Error {constructor(message,status=400){super(message);this.status=status}}
const fail=(message,status=400)=>{throw new AuthError(message,status)};
const sha=value=>createHash('sha256').update(value).digest('hex');
const now=()=>Math.floor(Date.now()/1000);
const stmt=(db,sql,...values)=>db.prepare(sql).bind(...values);
export function passwordHash(password){const salt=randomBytes(16).toString('hex');return `scrypt$32768$8$3$${salt}$${scryptSync(password,salt,32,KDF).toString('hex')}`}
export function verifyPassword(password,stored){
 const parts=stored?.split('$');
 const valid=parts?.length===6&&parts.slice(0,4).join('$')==='scrypt$32768$8$3'&&/^[a-f0-9]{32}$/.test(parts[4])&&/^[a-f0-9]{64}$/.test(parts[5]);
 // Match KDF cost even when the account does not exist. No plaintext credentials are logged.
 const actual=scryptSync(password,valid?parts[4]:'00000000000000000000000000000000',32,KDF);
 return timingSafeEqual(actual,Buffer.from(valid?parts[5]:'0'.repeat(64),'hex'))&&!!valid;
}
function password(value){if(typeof value!=='string'||[...value].length<15||Buffer.byteLength(value)>256)fail('Use a passphrase of at least 15 characters and at most 256 bytes.');return value}
function username(value){if(typeof value!=='string')fail('Enter your username.');const v=value.trim().toLowerCase();if(!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(v))fail('Use 3–32 letters, numbers, underscores or hyphens for your username.');return v}
function cookie(token='',age=0){return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`}
function tokenFrom(request){const match=(request.headers.get('cookie')||'').match(/(?:^|;\s*)__Host-toolkit_session=([a-f0-9]{64})(?:;|$)/);return match?.[1]||''}
function json(value,status=200,sessionCookie){return Response.json(value,{status,headers:{...headers,...(sessionCookie?{'Set-Cookie':sessionCookie}:{})}})}
export async function readJson(request,max=8192){
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')fail('Open this form from the toolkit.',403);
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))fail('JSON input is required.',415);
 const reader=request.body?.getReader();if(!reader)fail('Missing form data.');let size=0;const chunks=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();fail('Request too large.',413)}chunks.push(value)}
 const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length}
 try{const data=JSON.parse(new TextDecoder().decode(body));if(!data||typeof data!=='object'||Array.isArray(data))fail('Invalid form data.');return data}catch{fail('Invalid JSON input.')}
}
export async function currentUser(request,db){
 const token=tokenFrom(request);if(!token)return null;
 return stmt(db,'SELECT u.id,u.username,u.name,u.version,u.created,s.hash AS session_hash FROM users u JOIN sessions s ON s.user_id=u.id AND s.version=u.version WHERE s.hash=? AND s.expires>?',sha(token),now()).first();
}
async function rate(db,key,max){
 const t=now(),bucket=Math.floor(t/900),hashed=sha(`${key}:${bucket}`);
 const row=await stmt(db,'INSERT INTO auth_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',hashed,(bucket+1)*900).first();
 if(row.count>max)fail('Too many attempts. Try again in 15 minutes.',429);
}
async function cleanup(db){await db.batch([stmt(db,'DELETE FROM auth_limits WHERE expires<?',now()),stmt(db,'DELETE FROM sessions WHERE expires<?',now())])}
function publicUser(u){return {id:u.id,username:u.username,name:u.name,created:u.created}}
async function newSession(db,user){
 const token=randomBytes(32).toString('hex'),t=now();
 const result=await stmt(db,'INSERT INTO sessions (hash,user_id,version,created,expires) SELECT ?,id,version,?,? FROM users WHERE id=? AND version=?',sha(token),t,t+TTL,user.id,user.version).run();
 if(!result.meta.changes)fail('Your account changed. Sign in again.',409);
 // Keep at most ten live sessions per account, newest first.
 await stmt(db,'DELETE FROM sessions WHERE user_id=? AND hash NOT IN (SELECT hash FROM sessions WHERE user_id=? ORDER BY created DESC,rowid DESC LIMIT 10)',user.id,user.id).run();
 return cookie(token,TTL);
}
export async function account(request,db){
 try{
  if(!db)fail('Account storage is temporarily unavailable.',503);
  if(request.method==='GET'){
   const u=await currentUser(request,db);if(!u)return json({user:null});
   const codes=await stmt(db,'SELECT count(*) AS count FROM recovery_codes WHERE user_id=?',u.id).first();
   const sessions=await stmt(db,'SELECT count(*) AS count FROM sessions WHERE user_id=? AND version=? AND expires>?',u.id,u.version,now()).first();
   return json({user:publicUser(u),recoveryCodesRemaining:codes.count,activeSessions:sessions.count});
  }
  if(request.method!=='POST')fail('Method not allowed.',405);
  const data=await readJson(request),action=data.action;
  // CF-Connecting-IP is supplied by the trusted hosting edge. Never trust X-Forwarded-For.
  await rate(db,`ip:${request.headers.get('cf-connecting-ip')||'shared-unknown'}`,40);
  await cleanup(db);
  if(action==='logout'){
   const token=tokenFrom(request);if(token)await stmt(db,'DELETE FROM sessions WHERE hash=?',sha(token)).run();return json({ok:true},200,cookie());
  }
  if(['register','login','recover'].includes(action)){
   const handle=username(data.username);await rate(db,`account:${handle}`,12);
   const existing=await stmt(db,'SELECT * FROM users WHERE username=?',handle).first();
   if(action==='register'){
    const pass=password(data.password),name=typeof data.name==='string'?data.name.trim():'';
    if(!name||name.length>80)fail('Enter a display name of 1–80 characters.');
    const hash=passwordHash(pass);if(existing)fail('That username is unavailable. Choose another or sign in.',409);
    const u={id:crypto.randomUUID(),username:handle,name,version:1,created:now()};
    const codes=Array.from({length:6},()=>randomBytes(16).toString('hex'));
    try{await db.batch([stmt(db,'INSERT INTO users (id,username,name,password,version,created) VALUES (?,?,?,?,1,?)',u.id,handle,name,hash,u.created),...codes.map(c=>stmt(db,'INSERT INTO recovery_codes (hash,user_id) VALUES (?,?)',sha(c),u.id))])}catch(e){if(String(e).includes('UNIQUE'))fail('That username is unavailable. Choose another or sign in.',409);throw e}
    return json({user:publicUser(u),recoveryCodes:codes},201,await newSession(db,u));
   }
   if(action==='login'){
    const pass=typeof data.password==='string'&&Buffer.byteLength(data.password)<=256?data.password:'';
    if(!verifyPassword(pass,existing?.password)||!existing)fail('Username or password is incorrect.',401);
    return json({user:publicUser(existing)},200,await newSession(db,existing));
   }
   const pass=password(data.password),code=typeof data.code==='string'?data.code.trim().toLowerCase().replace(/[- ]/g,''):'';
   const hashed=sha(code);
   if(!/^[a-f0-9]{32}$/.test(code)||!existing)fail('Username or recovery code is incorrect.',401);
   const found=await stmt(db,'SELECT hash FROM recovery_codes WHERE hash=? AND user_id=?',hashed,existing.id).first();
   if(!found)fail('Username or recovery code is incorrect.',401);
   const result=await db.batch([
    stmt(db,'UPDATE users SET password=?,version=version+1 WHERE id=? AND version=? AND EXISTS (SELECT 1 FROM recovery_codes WHERE hash=? AND user_id=?)',passwordHash(pass),existing.id,existing.version,hashed,existing.id),
    stmt(db,'DELETE FROM recovery_codes WHERE hash=? AND user_id=?',hashed,existing.id)
   ]);
   if(!result[0].meta.changes)fail('Account changed. Try another recovery code.',409);
   return json({ok:true,message:'Password reset. All sessions are signed out. Sign in with your new password.'},200,cookie());
  }
  const u=await currentUser(request,db);if(!u)fail('Sign in to continue.',401);
  await rate(db,`user:${u.id}`,20);
  if(action==='logout-all'){
   await stmt(db,'UPDATE users SET version=version+1 WHERE id=?',u.id).run();return json({ok:true},200,cookie());
  }
  if(action==='profile'){
   const name=typeof data.name==='string'?data.name.trim():'';if(!name||name.length>80)fail('Enter a display name of 1–80 characters.');
   await stmt(db,'UPDATE users SET name=? WHERE id=?',name,u.id).run();return json({user:publicUser({...u,name})});
  }
  if(['password','delete','recovery-codes'].includes(action)){
   const row=await stmt(db,'SELECT password FROM users WHERE id=?',u.id).first();
   const pass=typeof data.currentPassword==='string'&&Buffer.byteLength(data.currentPassword)<=256?data.currentPassword:'';
   if(!verifyPassword(pass,row?.password))fail('Current password is incorrect.',401);
   if(action==='delete'){
    const r=await stmt(db,'DELETE FROM users WHERE id=? AND version=?',u.id,u.version).run();if(!r.meta.changes)fail('Account changed. Sign in again.',409);
    return json({ok:true},200,cookie());
   }
   if(action==='password'){
    const hash=passwordHash(password(data.password));
    const r=await stmt(db,'UPDATE users SET password=?,version=version+1 WHERE id=? AND version=?',hash,u.id,u.version).run();if(!r.meta.changes)fail('Account changed. Sign in again.',409);
    return json({ok:true,message:'Password changed. Sign in again on your devices.'},200,cookie());
   }
   // Rotating recovery codes uses an atomic batch guarded by a unique mutation token.
   // A no-op version guard cannot delete or replace another request’s new codes.
   const codes=Array.from({length:6},()=>randomBytes(16).toString('hex'));
   const guard=randomBytes(32).toString('hex');
   const results=await db.batch([
    stmt(db,'INSERT INTO sessions (hash,user_id,version,created,expires) SELECT ?,id,-1,?,? FROM users WHERE id=? AND version=?',guard,now(),now()-1,u.id,u.version),
    stmt(db,'DELETE FROM recovery_codes WHERE user_id=? AND EXISTS (SELECT 1 FROM sessions WHERE hash=?)',u.id,guard),
    ...codes.map(c=>stmt(db,'INSERT INTO recovery_codes (hash,user_id) SELECT ?,? WHERE EXISTS (SELECT 1 FROM sessions WHERE hash=?)',sha(c),u.id,guard)),
    stmt(db,'DELETE FROM sessions WHERE hash=?',guard)
   ]);
   if(!results[0].meta.changes)fail('Account changed. Sign in again.',409);
   return json({recoveryCodes:codes});
  }
  fail('Unknown account action.');
 }catch(e){if(e instanceof AuthError)return json({error:e.message},e.status);console.error('account_operation_failed');return json({error:'Account service unavailable. Please try again.'},503)}
}
export async function reportStore(request,db){
 try{
  if(!db)fail('Account storage is temporarily unavailable.',503);
  const user=await currentUser(request,db);if(!user)fail('Sign in to save reports across devices.',401);
  if(request.method==='GET'){
   const rows=await stmt(db,"SELECT id,content,created FROM reports WHERE user_id=? AND COALESCE(json_extract(content,'$.kind'),'')<>? ORDER BY created DESC",user.id,'project-workspace').all();
   return json({reports:rows.results.map(r=>({...JSON.parse(r.content),cloudId:r.id,savedAt:r.created}))});
  }
  if(!['POST','DELETE'].includes(request.method))fail('Method not allowed.',405);
  const data=await readJson(request,65536);await rate(db,`reports:${user.id}`,100);
  if(request.method==='DELETE'){
   if(typeof data.id!=='string')fail('Choose a report.');
   const managed=await stmt(db,"SELECT id FROM reports WHERE id=? AND user_id=? AND json_extract(content,'$.kind')=?",data.id,user.id,'project-workspace').first();
   if(managed)fail('Delete this project from the project workspace so its current revision can be checked.',409);
   await stmt(db,"DELETE FROM reports WHERE id=? AND user_id=? AND COALESCE(json_extract(content,'$.kind'),'')<>?",data.id,user.id,'project-workspace').run();return json({ok:true});
  }
  const value=data.report;
  if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.title!=='string'||value.title.length>200||typeof value.kind!=='string')fail('Invalid report.');
  if(value.kind==='project-workspace')fail('Save projects through the project workspace so validation and revision checks are applied.');
  const id=crypto.randomUUID(),content=JSON.stringify(value);
  const r=await stmt(db,"INSERT INTO reports (id,user_id,content,created) SELECT ?,?,?,? WHERE (SELECT count(*) FROM reports WHERE user_id=? AND COALESCE(json_extract(content,'$.kind'),'')<>?)<50",id,user.id,content,now(),user.id,'project-workspace').run();
  if(!r.meta.changes)fail('Your account holds 50 reports. Export and delete an old report first.',409);
  return json({id},201);
 }catch(e){if(e instanceof AuthError)return json({error:e.message},e.status);console.error('report_operation_failed');return json({error:'Report storage unavailable. Please try again.'},503)}
}

/** Reserve import attempts before network activity. Failed imports consume their reservation. */
export async function authorizeImport(request,db){
 try{
  if(!db)fail('Account storage is temporarily unavailable.',503);
  const user=await currentUser(request,db);if(!user)fail('Sign in to import a public page.',401);
  await rate(db,`import-user:${user.id}`,5);
  await rate(db,'import-global',100);
  return null;
 }catch(e){if(e instanceof AuthError)return json({error:e.message,code:e.status===429?'IMPORT_QUOTA':'IMPORT_AUTH'},e.status);return json({error:'Import authorization unavailable.',code:'IMPORT_AUTH'},503)}
}

export async function authorizeReview(request,db){
 try{
  const user=await currentUser(request,db);if(!user)fail('Sign in to request AI review.',401);
  await rate(db,`review-user:${user.id}`,5);await rate(db,'review-global',100);
  return null;
 }catch(e){if(e instanceof AuthError)return json({error:e.message},e.status);return json({error:'Review quota storage is unavailable.'},503)}
}
