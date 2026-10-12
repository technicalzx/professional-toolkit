import {env} from 'cloudflare:workers';
import {reportStore} from '../../../lib/auth/service.mjs';
export function GET(request:Request){return reportStore(request,env.DB)}
export function POST(request:Request){return reportStore(request,env.DB)}
export function DELETE(request:Request){return reportStore(request,env.DB)}
