import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudflareBuildEnvironment,verifyCloudflareBuild} from '../scripts/build-cloudflare.mjs';

const manifest={worker:'professional-toolkit',database_name:'professional-toolkit',database_id:'11111111-2222-4333-8444-555555555555',account_id:'1'.repeat(32),ai_model:'@cf/meta/llama-3.1-8b-instruct-fp8-fast'};
const config=env=>({name:'professional-toolkit',d1_databases:[{binding:'DB',database_name:'professional-toolkit',database_id:env.TOOLKIT_DATABASE_ID}],vars:{TOOLKIT_AI_MODEL:env.TOOLKIT_AI_MODEL},ai:{binding:'AI'}});

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
