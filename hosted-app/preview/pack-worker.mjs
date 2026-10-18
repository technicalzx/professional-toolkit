import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,extname,relative,sep} from 'node:path';
const root='preview-dist',assets=Object.create(null);
const contentTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.zip':'application/zip','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};
const binaryTypes=new Set(['.zip','.png','.ico','.woff2']);
function visit(dir){
 for(const file of readdirSync(dir,{withFileTypes:true})){
  const path=join(dir,file.name);
  if(file.isDirectory()){visit(path);continue;}
  const url='/'+relative(root,path).split(sep).join('/');
  // Repacking must not recursively embed a previously generated Worker.
  if(url==='/_worker.js')continue;
  const bytes=readFileSync(path),ext=extname(path),binary=binaryTypes.has(ext);
  assets[url]={body:bytes.toString(binary?'base64':'utf8'),binary,type:contentTypes[ext]||'application/octet-stream',etag:'"'+createHash('sha256').update(bytes).digest('hex')+'"'};
 }
}
visit(root);
const code=`const assets=${JSON.stringify(assets)};
const routes=new Set(['/','/tools','/capture','/extension','/workflows','/account']);
export default {fetch(request){
const path=new URL(request.url).pathname;
const headers={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"};
if(path==='/api/health')return Response.json({status:'ok',mode:'temporary-preview',accounts:false,urlImport:false,localProjects:true,localCapture:true,ai:false},{headers:{...headers,'Cache-Control':'no-store'}});
if(path==='/api/account'&&request.method==='GET')return Response.json({user:null},{headers:{...headers,'Cache-Control':'no-store'}});
if(path.startsWith('/api/'))return Response.json({error:'This backend feature is not enabled in the preview. Device saves and exports remain available.'},{status:503,headers:{...headers,'Cache-Control':'no-store'}});
if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{...headers,Allow:'GET, HEAD'}});
const route=path.replace(/\\/$/,'')||'/';
const key=routes.has(route)?'/index.html':path;
const asset=Object.hasOwn(assets,key)?assets[key]:null;
if(!asset)return new Response('Not found',{status:404,headers});
const h={...headers,'Content-Type':asset.type,ETag:asset.etag,'Cache-Control':path.startsWith('/assets/')?'public,max-age=31536000,immutable':'no-cache',...(asset.type==='application/zip'?{'Content-Disposition':'attachment; filename="toolkit-capture-extension.zip"'}:{})};
if(request.headers.get('if-none-match')===asset.etag)return new Response(null,{status:304,headers:h});
const body=asset.binary?Uint8Array.from(atob(asset.body),character=>character.charCodeAt(0)):asset.body;
return new Response(request.method==='HEAD'?null:body,{headers:h});
}};`;
writeFileSync('preview-dist/_worker.js',code);
console.log(JSON.stringify({files:Object.keys(assets).length,workerBytes:Buffer.byteLength(code)}));
