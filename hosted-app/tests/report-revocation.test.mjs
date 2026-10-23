import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';
import {createRequire} from 'node:module';
import {account,passwordHash,reportStore} from '../lib/auth/service.mjs';

const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler/package.json'));
const {Miniflare,convertV4MiniflareOptions}=wr('miniflare');
const pass='synthetic report race passphrase 2026';
const digest=value=>createHash('sha256').update(value).digest('hex');
const headers=cookie=>({origin:'https://toolkit.test','content-type':'application/json','cf-connecting-ip':'192.0.2.91',cookie});
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};

// Only observe completion of the real first authentication query. All SQL,
// including the final mutation, executes against isolated D1, without sleeps.
function observeAuthentication(db,authorized){
 return {prepare(sql){
  const statement=db.prepare(sql);
  return {bind(...values){
   const bound=statement.bind(...values);
   return sql.startsWith('SELECT u.id')?{first:async()=>{
    const user=await bound.first();authorized.resolve(user);return user;
   }}:bound;
  }};
 }};
}
function heldRequest(method,cookie,data){
 let controller,released=false;
 const body=new ReadableStream({start(value){controller=value;}});
 return {request:new Request('https://toolkit.test/api/reports',{method,headers:headers(cookie),body,duplex:'half'}),
  release(){if(released)return;released=true;controller.enqueue(new TextEncoder().encode(JSON.stringify(data)));controller.close();}};
}
function holdMutation(db,reached,released){
 return {prepare(sql){
  const statement=db.prepare(sql);
  return {bind(...values){
   const bound=statement.bind(...values);
   return /^(?:INSERT INTO|DELETE FROM) reports /.test(sql)?{run:async()=>{
    reached.resolve();await released.promise;return bound.run();
   }}:bound;
  }};
 }};
}

test('ordinary reports revalidate session authority atomically at the D1 mutation',async t=>{
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){return new Response("isolated report fixture")}}',compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB']}));
 try{
  const db=await mf.getD1Database('DB');
  for(const sql of fs.readFileSync(new URL('../drizzle/0000_swift_wendigo.sql',import.meta.url),'utf8').split('--> statement-breakpoint').map(value=>value.trim()).filter(Boolean))await db.prepare(sql).run();
  const storedPassword=passwordHash(pass);
  for(const mutation of ['POST','DELETE'])for(const change of ['logout','expiry','password','none']){
   await t.test(`${mutation} held body ${change==='none'?'still succeeds with an active session':`cannot commit after ${change}`}`,async()=>{
    const userId=crypto.randomUUID(),reportId=crypto.randomUUID(),token=randomBytes(32).toString('hex'),sessionHash=digest(token),cookie='__Host-toolkit_session='+token;
    const created=Math.floor(Date.now()/1000);
    await db.batch([
     db.prepare('INSERT INTO users (id,username,name,password,version,created) VALUES (?,?,?,?,1,?)').bind(userId,'race-'+userId.slice(0,12),'Synthetic race fixture',storedPassword,created),
     db.prepare('INSERT INTO sessions (hash,user_id,version,created,expires) VALUES (?,?,1,?,?)').bind(sessionHash,userId,created,created+3600),
     db.prepare('INSERT INTO reports (id,user_id,content,created) VALUES (?,?,?,?)').bind(reportId,userId,JSON.stringify({kind:'audit',title:'Keep this owned synthetic report'}),created)
    ]);
    const authorized=deferred();
    const input=mutation==='POST'?{report:{kind:'audit',title:'New synthetic delayed report'}}:{id:reportId};
    const held=heldRequest(mutation,cookie,input);
    const pending=reportStore(held.request,observeAuthentication(db,authorized));
    try{
     const user=await Promise.race([authorized.promise,pending.then(()=>{throw Error('Report request finished before the held authentication boundary.');})]);
     assert.equal(user.id,userId);
     if(change==='expiry')await db.prepare('UPDATE sessions SET expires=0 WHERE hash=?').bind(sessionHash).run();
     else if(change==='logout'||change==='password'){
      const response=await account(new Request('https://toolkit.test/api/account',{method:'POST',headers:headers(cookie),body:JSON.stringify(change==='logout'?{action:'logout'}:{action:'password',currentPassword:pass,password:pass+' changed'})}),db);
      assert.equal(response.status,200);
     }
     held.release();
     const response=await pending,body=await response.json();
     const rows=(await db.prepare('SELECT id,content FROM reports WHERE user_id=? ORDER BY id').bind(userId).all()).results;
     if(change!=='none'){
      assert.equal(response.status,401);
      assert.match(body.error,/session ended/i);
      assert.deepEqual(rows.map(row=>row.id),[reportId]);
      assert.equal(JSON.parse(rows[0].content).title,'Keep this owned synthetic report');
     }else if(mutation==='POST'){
      assert.equal(response.status,201);assert.equal(rows.length,2);
      assert.ok(rows.some(row=>row.id===body.id&&JSON.parse(row.content).title==='New synthetic delayed report'));
     }else{
      assert.equal(response.status,200);assert.deepEqual(body,{ok:true});assert.equal(rows.length,0);
      const again=await reportStore(new Request('https://toolkit.test/api/reports',{method:'DELETE',headers:headers(cookie),body:JSON.stringify({id:reportId})}),db);
      assert.equal(again.status,200,'Deleting an already absent report remains idempotent for an active session.');
     }
    }finally{
     held.release();await pending.catch(()=>{});
     await db.prepare('DELETE FROM users WHERE id=?').bind(userId).run();
     for(const table of ['users','reports','sessions','recovery_codes']){
      const row=await db.prepare(`SELECT count(*) AS total FROM ${table} WHERE ${table==='users'?'id':'user_id'}=?`).bind(userId).first();
      assert.equal(row.total,0,`Fixture cleanup for ${table}`);
     }
    }
   });
  }
  for(const method of ['POST','DELETE'])await t.test(`${method} rejects a session revoked immediately before the SQL mutation executes`,async()=>{
   const userId=crypto.randomUUID(),reportId=crypto.randomUUID(),token=randomBytes(32).toString('hex'),sessionHash=digest(token),cookie='__Host-toolkit_session='+token;
   const created=Math.floor(Date.now()/1000),reached=deferred(),released=deferred();
   await db.batch([
    db.prepare('INSERT INTO users (id,username,name,password,version,created) VALUES (?,?,?,?,1,?)').bind(userId,'race-'+userId.slice(0,12),'Synthetic commit fixture',storedPassword,created),
    db.prepare('INSERT INTO sessions (hash,user_id,version,created,expires) VALUES (?,?,1,?,?)').bind(sessionHash,userId,created,created+3600),
    db.prepare('INSERT INTO reports (id,user_id,content,created) VALUES (?,?,?,?)').bind(reportId,userId,JSON.stringify({kind:'audit',title:'Preserve the commit fixture'}),created)
   ]);
   const input=method==='POST'?{report:{kind:'audit',title:'Must not be inserted'}}:{id:reportId};
   const pending=reportStore(new Request('https://toolkit.test/api/reports',{method,headers:headers(cookie),body:JSON.stringify(input)}),holdMutation(db,reached,released));
   try{
    await Promise.race([reached.promise,pending.then(()=>{throw Error('Report request finished before the SQL mutation boundary.');})]);
    await db.prepare('DELETE FROM sessions WHERE hash=?').bind(sessionHash).run();
    released.resolve();
    assert.equal((await pending).status,401);
    const rows=(await db.prepare('SELECT id,content FROM reports WHERE user_id=?').bind(userId).all()).results;
    assert.deepEqual(rows.map(row=>row.id),[reportId]);
    assert.equal(JSON.parse(rows[0].content).title,'Preserve the commit fixture');
   }finally{
    released.resolve();await pending.catch(()=>{});
    await db.prepare('DELETE FROM users WHERE id=?').bind(userId).run();
    for(const table of ['users','reports','sessions','recovery_codes'])assert.equal((await db.prepare(`SELECT count(*) AS total FROM ${table} WHERE ${table==='users'?'id':'user_id'}=?`).bind(userId).first()).total,0,`Commit fixture cleanup for ${table}`);
   }
  });
 }finally{await mf.dispose();}
});

