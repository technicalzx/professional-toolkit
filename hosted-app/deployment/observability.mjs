const routes = new Set(['/', '/capture', '/account', '/workflows', '/tools', '/api/account', '/api/projects', '/api/reports', '/api/import', '/api/capture/review']);
/** Log bounded operational metadata only; never request bodies, queries, cookies or exception messages. */
export async function observedFetch(request, env, ctx, handler) {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  let response;
  try { response = await handler.fetch(request, env, ctx); }
  catch { response = Response.json({error:'Request failed. Please retry and include the request ID when reporting the issue.',requestId},{status:500}); }
  const durationMs = Math.round((performance.now()-started)*100)/100;
  const path = new URL(request.url).pathname;
  const event = {event:'toolkit.request',requestId,route:routes.has(path)?path:'other',method:['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].includes(request.method)?request.method:'other',status:response.status,durationMs};
  (response.status >= 500 ? console.error : console.log)(JSON.stringify(event));
  const headers = new Headers(response.headers);
  headers.set('X-Request-ID',requestId);
  headers.append('Server-Timing',`app;dur=${durationMs}`);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
