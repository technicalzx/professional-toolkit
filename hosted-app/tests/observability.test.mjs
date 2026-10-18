import test from 'node:test';
import assert from 'node:assert/strict';
import {observedFetch} from '../deployment/observability.mjs';
test('deployment metadata preserves streaming responses and excludes private request fields',async()=>{
 const messages=[],original=console.log;console.log=value=>messages.push(JSON.parse(value));
 try{
  const response=await observedFetch(new Request('https://toolkit.test/api/reports?secret=PRIVATE_QUERY',{method:'POST',headers:{cookie:'PRIVATE_COOKIE'},body:'PRIVATE_BODY'}),{}, {},{fetch:async()=>new Response('unchanged',{headers:{'Set-Cookie':'retained; HttpOnly','Cache-Control':'no-store'}})});
  assert.equal(await response.text(),'unchanged');assert.equal(response.headers.get('set-cookie'),'retained; HttpOnly');assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('x-request-id'),/^[a-f0-9-]{36}$/);assert.match(response.headers.get('server-timing'),/^app;dur=/);
  assert.equal(messages[0].route,'/api/reports');assert.equal(messages[0].status,200);assert.ok(!JSON.stringify(messages).includes('PRIVATE'));
 }finally{console.log=original;}
});
test('failed requests expose a correlation ID without logging exception text or arbitrary paths',async()=>{
 const messages=[],original=console.error;console.error=value=>messages.push(JSON.parse(value));
 try{
  const response=await observedFetch(new Request('https://toolkit.test/PRIVATE_PATH'),{}, {},{fetch:async()=>{throw Error('PRIVATE_EXCEPTION')}});
  assert.equal(response.status,500);assert.equal((await response.json()).requestId,response.headers.get('x-request-id'));assert.equal(messages[0].route,'other');assert.ok(!JSON.stringify(messages).includes('PRIVATE'));
 }finally{console.error=original;}
});
