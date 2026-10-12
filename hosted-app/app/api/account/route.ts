import {env} from 'cloudflare:workers';
import {account} from '../../../lib/auth/service.mjs';
export function GET(request:Request){return account(request,env.DB)}
export function POST(request:Request){return account(request,env.DB)}
