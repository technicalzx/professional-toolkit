import { importPage, ImportError } from "../../../lib/toolkit/importer.mjs";
const headers = {"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
export async function POST(request: Request) {
  if(request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({error:"Use this importer from the toolkit.",code:"ORIGIN_REQUIRED"},{status:403,headers});
  if(!(request.headers.get("content-type")||"").startsWith("application/json"))
    return Response.json({error:"Use JSON input."},{status:415,headers});
  try {
    const reader=request.body?.getReader();if(!reader)throw new Error("Missing input");
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return Response.json({error:"Request too large."},{status:413,headers})}chunks.push(value)}
    const raw=new Uint8Array(size);let pos=0;for(const part of chunks){raw.set(part,pos);pos+=part.length}
    const data=JSON.parse(new TextDecoder().decode(raw));
    return Response.json(await importPage(data.url),{headers});
  } catch(e) {
    if(e instanceof ImportError)return Response.json({error:e.message,code:e.code},{status:e.status,headers});
    return Response.json({error:"Enter a valid page URL.",code:"INVALID_INPUT"},{status:400,headers});
  }
}
