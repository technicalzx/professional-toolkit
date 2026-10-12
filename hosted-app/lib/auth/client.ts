import {z} from 'zod';
const user=z.object({id:z.string(),username:z.string(),name:z.string(),created:z.number()});
const response=z.object({
 user:user.nullable().optional(),error:z.string().optional(),message:z.string().optional(),
 recoveryCodes:z.array(z.string()).optional(),activeSessions:z.number().default(0),recoveryCodesRemaining:z.number().default(0),
 reports:z.array(z.record(z.unknown())).default([]),id:z.string().optional(),ok:z.boolean().optional()
});
export async function readAccountResponse(r:Response){return response.parse(await r.json())}
