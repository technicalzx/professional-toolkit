import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudflareBuildEnvironment,cloudflarePreviewConfig,verifyCloudflareBuild} from '../scripts/build-cloudflare.mjs';

const manifest={worker:'professional-toolkit',database_name:'professional-toolkit',database_id:'11111111-2222-4333-8444-555555555555',account_id:'1'.repeat(32),ai_model:'@cf/meta/llama-3.1-8b-instruct-fp8-fast'};
const config=env=>({name:'professional-toolkit',d1_databases:[{binding:'DB',database_name:'professional-toolkit',database_id:env.TOOLKIT_DATABASE_ID}],vars:{TOOLKIT_AI_MODEL:env.TOOLKIT_AI_MODEL,TOOLKIT_IMPORT_ALLOWED_ORIGINS:env.TOOLKIT_IMPORT_ALLOWED_ORIGINS},ai:{binding:'AI'}});

test('import origins are disabled by default and validated before generating deployment configuration',()=>{
 assert.equal(cloudflareBuildEnvironment(manifest,{}).TOOLKIT_IMPORT_ALLOWED_ORIGINS,'[]');
 const env=cloudflareBuildEnvironment(manifest,{TOOLKIT_IMPORT_ALLOWED_ORIGINS:'["https://Docs.Example.com/","https://docs.example.com"]',TOOLKIT_PREVIEW_DATABASE_ID:'abcdefab-1234-4567-8901-abcdefabcdef'});
 assert.equal(env.TOOLKIT_IMPORT_ALLOWED_ORIGINS,'["https://docs.example.com"]');
 const production=config(env);
 assert.doesNotThrow(()=>verifyCloudflareBuild(production,manifest,env));
 assert.equal(cloudflarePreviewConfig(production,manifest,env).previews.vars.TOOLKIT_IMPORT_ALLOWED_ORIGINS,env.TOOLKIT_IMPORT_ALLOWED_ORIGINS);
 for(const policy of ['*','["https://*.example.com"]','["https://example.com/private"]','["http://example.com"]','["https://linkedin.com"]'])assert.throws(()=>cloudflareBuildEnvironment(manifest,{TOOLKIT_IMPORT_ALLOWED_ORIGINS:policy}));
 for(const policy of [undefined,'[]','["https://other.example.com"]'])assert.throws(()=>verifyCloudflareBuild({...production,vars:{...production.vars,TOOLKIT_IMPORT_ALLOWED_ORIGINS:policy}},manifest,env),/import origins/);
});

test('Cloudflare build uses recorded public configuration and retains explicit valid overrides',()=>{
 const defaults=cloudflareBuildEnvironment(manifest,{});
 assert.equal(defaults.TOOLKIT_DEPLOY_TARGET,'cloudflare');
 assert.equal(defaults.TOOLKIT_DATABASE_ID,manifest.database_id);assert.equal(defaults.TOOLKIT_AI_MODEL,manifest.ai_model);assert.equal(defaults.CLOUDFLARE_ACCOUNT_ID,manifest.account_id);
 const env=cloudflareBuildEnvironment(manifest,{PATH:'synthetic-path',TOOLKIT_DEPLOY_TARGET:'other',TOOLKIT_DATABASE_ID:'22222222-3333-4444-8555-666666666666',CLOUDFLARE_ACCOUNT_ID:'2'.repeat(32),TOOLKIT_AI_MODEL:'@cf/meta/llama-3.3-70b-instruct-fp8-fast'});
 assert.equal(env.PATH,'synthetic-path');assert.equal(env.TOOLKIT_DEPLOY_TARGET,'cloudflare');assert.notEqual(env.TOOLKIT_DATABASE_ID,manifest.database_id);assert.notEqual(env.TOOLKIT_AI_MODEL,manifest.ai_model);assert.equal(env.CLOUDFLARE_ACCOUNT_ID,'2'.repeat(32));
 assert.doesNotThrow(()=>verifyCloudflareBuild(config(env),manifest,env));
});

test('Cloudflare build rejects missing or placeholder configuration before starting a build',()=>{
 for(const patch of [{TOOLKIT_DATABASE_ID:''},{TOOLKIT_DATABASE_ID:'00000000-0000-4000-8000-000000000000'},{TOOLKIT_DATABASE_ID:'replace-me'},{TOOLKIT_AI_MODEL:''},{TOOLKIT_AI_MODEL:'@cf/example/your-model'},{CLOUDFLARE_ACCOUNT_ID:'0'.repeat(32)}])assert.throws(()=>cloudflareBuildEnvironment(manifest,patch));
 assert.throws(()=>cloudflareBuildEnvironment({...manifest,database_id:undefined},{}),/existing D1 database/);
 assert.throws(()=>cloudflareBuildEnvironment({...manifest,ai_model:undefined},{}),/configured Cloudflare AI model/);
});

test('Cloudflare build verification rejects silently dropped or changed deployment bindings',()=>{
 const env=cloudflareBuildEnvironment(manifest,{}),valid=config(env);
 for(const patch of [{name:'wrong-worker'},{d1_databases:[]},{d1_databases:[{binding:'DB',database_name:'professional-toolkit',database_id:'00000000-0000-4000-8000-000000000000'}]},{vars:{}},{ai:undefined},{ai:{binding:'OTHER_AI'}},{account_id:'3'.repeat(32)}])assert.throws(()=>verifyCloudflareBuild({...valid,...patch},manifest,env));
 assert.doesNotThrow(()=>verifyCloudflareBuild(valid,manifest,env));
});

test('a standard production build omits Preview configuration until a separate database is explicitly selected',()=>{
 const env=cloudflareBuildEnvironment(manifest,{}),production=config(env);
 assert.deepEqual(cloudflarePreviewConfig(production,manifest,env),production);
 assert.equal(production.previews,undefined);
});

test('Preview builds retain production settings and isolate account data using the explicit Preview database',()=>{
 const previewId='ABCDEFAB-1234-4567-8901-ABCDEFABCDEF';
 const env=cloudflareBuildEnvironment(manifest,{TOOLKIT_PREVIEW_DATABASE_ID:previewId});
 const production={...config(env),assets:{directory:'../client',binding:'ASSETS'},compatibility_date:'2026-10-12',compatibility_flags:['nodejs_compat'],main:'index.js',routes:[{pattern:'production.example.com/*'}],triggers:{crons:['0 * * * *']},services:[{binding:'PRODUCTION_ONLY',service:'production-service'}],observability:{enabled:true,logs:{enabled:true,invocation_logs:false,head_sampling_rate:1}}};
 const before=structuredClone(production),result=cloudflarePreviewConfig(production,manifest,env);
 assert.deepEqual(production,before);
 const {previews,...retainedProduction}=result;
 assert.deepEqual(retainedProduction,before);
 assert.deepEqual(previews.d1_databases,[{binding:'DB',database_name:'professional-toolkit-preview',database_id:previewId}]);
 assert.deepEqual(previews.ai,production.ai);assert.deepEqual(previews.vars,production.vars);assert.deepEqual(previews.observability,production.observability);
 for(const key of ['assets','compatibility_date','compatibility_flags','routes','triggers','services','name','main'])assert.equal(previews[key],undefined,key);
 previews.vars.TOOLKIT_AI_MODEL='changed-fixture';previews.ai.binding='OTHER';previews.observability.logs.invocation_logs=true;
 assert.deepEqual(production,before,'Preview settings must not mutate production bindings.');
});

test('Preview builds reject malformed, empty, placeholder and production database identifiers before building',()=>{
 for(const previewId of ['', 'replace-me','00000000-0000-0000-0000-000000000000','00000000-0000-4000-8000-000000000000',manifest.database_id.toUpperCase()])assert.throws(()=>cloudflareBuildEnvironment(manifest,{TOOLKIT_PREVIEW_DATABASE_ID:previewId}));
 const selected='ABCDEFAB-1234-4567-8901-ABCDEFABCDEF';
 assert.throws(()=>cloudflareBuildEnvironment(manifest,{TOOLKIT_DATABASE_ID:selected,TOOLKIT_PREVIEW_DATABASE_ID:selected.toLowerCase()}),/separate/);
 assert.throws(()=>cloudflareBuildEnvironment(manifest,{TOOLKIT_DATABASE_ID:selected,TOOLKIT_PREVIEW_DATABASE_ID:manifest.database_id}),/separate/);
 assert.throws(()=>cloudflareBuildEnvironment({...manifest,database_id:selected},{TOOLKIT_DATABASE_ID:manifest.database_id,TOOLKIT_PREVIEW_DATABASE_ID:selected.toLowerCase()}),/separate/);
});
