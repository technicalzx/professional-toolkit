import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const appRoot=fileURLToPath(new URL('../',import.meta.url));
const placeholderDatabase=/^00000000-0000-[0-9a-f]{4}-[0-9a-f]{4}-000000000000$/i;
const databaseIdentifier=/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function validDatabaseId(value){return typeof value==='string'&&databaseIdentifier.test(value)&&!placeholderDatabase.test(value);}

function verifyPreviewDatabase(manifest,env){
 if(env.TOOLKIT_PREVIEW_DATABASE_ID===undefined)return;
 if(!validDatabaseId(env.TOOLKIT_PREVIEW_DATABASE_ID))throw Error('TOOLKIT_PREVIEW_DATABASE_ID must identify an existing, separate D1 database; placeholder IDs cannot be published.');
 const previewId=env.TOOLKIT_PREVIEW_DATABASE_ID.toLowerCase();
 if([manifest.database_id,env.TOOLKIT_DATABASE_ID].some(id=>typeof id==='string'&&id.toLowerCase()===previewId))throw Error('The Preview database must be separate from the recorded and selected production databases.');
}

export function cloudflareBuildEnvironment(manifest,environment=process.env){
 const env={...environment,TOOLKIT_DEPLOY_TARGET:'cloudflare',
  TOOLKIT_DATABASE_ID:environment.TOOLKIT_DATABASE_ID??manifest.database_id,
  TOOLKIT_AI_MODEL:environment.TOOLKIT_AI_MODEL??manifest.ai_model,
  CLOUDFLARE_ACCOUNT_ID:environment.CLOUDFLARE_ACCOUNT_ID??manifest.account_id};
 if(typeof manifest.worker!=='string'||!/^professional-toolkit$/.test(manifest.worker))throw Error('deployment/live.json must name the professional-toolkit Worker.');
 if(typeof manifest.database_name!=='string'||manifest.database_name!=='professional-toolkit')throw Error('deployment/live.json must name the professional-toolkit database.');
 if(!validDatabaseId(env.TOOLKIT_DATABASE_ID))throw Error('TOOLKIT_DATABASE_ID must identify an existing D1 database; placeholder IDs cannot be published.');
 if(typeof env.TOOLKIT_AI_MODEL!=='string'||!/^@cf\/[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._/-]*$/i.test(env.TOOLKIT_AI_MODEL)||/placeholder|example|replace-me|your-model/i.test(env.TOOLKIT_AI_MODEL))throw Error('TOOLKIT_AI_MODEL must name the configured Cloudflare AI model.');
 if(typeof env.CLOUDFLARE_ACCOUNT_ID!=='string'||!/^[0-9a-f]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID)||/^0{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID))throw Error('CLOUDFLARE_ACCOUNT_ID must identify the deployment account.');
 verifyPreviewDatabase(manifest,env);
 return env;
}

export function cloudflarePreviewConfig(config,manifest,env){
 verifyCloudflareBuild(config,manifest,env);
 verifyPreviewDatabase(manifest,env);
 if(env.TOOLKIT_PREVIEW_DATABASE_ID===undefined)return config;
 // Assets and compatibility settings belong at the top level. Preview bindings
 // are explicit: no production database, routes, triggers or service calls leak
 // into a branch deployment. Preserve the production configuration unchanged.
 return {...config,previews:{
  d1_databases:[{binding:'DB',database_name:'professional-toolkit-preview',database_id:env.TOOLKIT_PREVIEW_DATABASE_ID}],
  vars:structuredClone(config.vars),
  ai:structuredClone(config.ai),
  observability:{...structuredClone(config.observability??{}),enabled:true,logs:{...structuredClone(config.observability?.logs??{}),enabled:true,invocation_logs:false}},
 }};
}

export function verifyCloudflareBuild(config,manifest,env){
 if(config?.name!==manifest.worker)throw Error('Generated configuration does not target the expected Worker.');
 const database=config.d1_databases?.find(binding=>binding.binding==='DB');
 if(database?.database_id!==env.TOOLKIT_DATABASE_ID||database.database_name!==manifest.database_name)throw Error('Generated configuration does not preserve the selected D1 database binding.');
 if(config.vars?.TOOLKIT_AI_MODEL!==env.TOOLKIT_AI_MODEL||config.ai?.binding!=='AI')throw Error('Generated configuration must preserve the AI binding and configured model.');
 if(config.account_id!==undefined&&config.account_id!==env.CLOUDFLARE_ACCOUNT_ID)throw Error('Generated configuration targets a different Cloudflare account.');
}

function main(){
 const manifest=JSON.parse(readFileSync(new URL('../deployment/live.json',import.meta.url),'utf8'));
 const env=cloudflareBuildEnvironment(manifest);
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('./run-framework.mjs',import.meta.url)),'build'],{cwd:appRoot,env,stdio:'inherit'});
 if(result.error)throw result.error;
 if(result.status!==0){process.exitCode=result.status??1;return;}
 const configUrl=new URL('../dist/server/wrangler.json',import.meta.url);
 const config=JSON.parse(readFileSync(configUrl,'utf8'));
 verifyCloudflareBuild(config,manifest,env);
 const deploymentConfig=cloudflarePreviewConfig(config,manifest,env);
 if(deploymentConfig!==config)writeFileSync(configUrl,JSON.stringify(deploymentConfig,null,2)+'\n');
 console.log('Cloudflare build verified: expected Worker, existing D1 database and AI configuration preserved.');
 if(deploymentConfig.previews)console.log('Worker Previews configured with a separate D1 database and explicit AI, variables and private operational logs.');
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main();}catch(error){console.error('Cloudflare build failed: '+error.message);process.exitCode=1;}
}
