import {env} from 'cloudflare:workers';
import {reviewCapture} from '../../../../lib/capture/service.mjs';
export function POST(request:Request){
  const config=env as unknown as {DB:D1Database;AI?:{run:Function};TOOLKIT_AI_MODEL?:string};
  return reviewCapture(request,config.DB,config.AI,config.TOOLKIT_AI_MODEL);
}
