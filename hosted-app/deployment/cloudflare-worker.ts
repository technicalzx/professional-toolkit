import handler from 'vinext/server/fetch-handler';
import {observedFetch} from './observability.mjs';
export default {fetch(request:Request,env:Cloudflare.Env,ctx:ExecutionContext){return observedFetch(request,env,ctx,handler)}};
