import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Exercise the deployed request handler with deterministic provider/database boundaries.
async function handler(overrides={}) {
  const src = await readFile(new URL('../supabase/functions/alerts/index.ts',import.meta.url),'utf8');
  let serve;
  const client = {
    auth:{getUser:async()=>({data:{user:{id:'alice',email_confirmed_at:'2026-11-01'}},error:null})},
    rpc:async()=>({data:true,error:null})
  };
  const services = {
    db:()=>client,env:()=>'',
    json:(body,status=200)=>new Response(JSON.stringify(body),{status}),
    preference:async(_client,uid)=>{assert.equal(uid,'alice');return {zip:'02108',language:'es'};},
    activeAlerts:async()=>[],translateAlert:async()=> 'Alerta', ...overrides
  };
  new Function('Deno',...Object.keys(services),src.replace(/^import[^\n]*\n/,''))({serve:fn=>{serve=fn;}},...Object.values(services));
  return {serve,client};
}
const post=()=>new Request('https://example.com/alerts',{method:'POST',headers:{Authorization:'Bearer user-token'}});
test('reject unauthenticated requests before weather lookup',async()=> {
  const {serve}=await handler({activeAlerts:()=>assert.fail('Weather queried before authentication')});
  assert.equal((await serve(new Request('https://example.com/alerts',{method:'POST'}))).status,401);
});
test('reject invalid sessions and unconfirmed email',async()=> {
  const {serve,client}=await handler();
  client.auth.getUser=async()=>({data:{user:null},error:new Error('bad token')});
  assert.equal((await serve(post())).status,401);
  client.auth.getUser=async()=>({data:{user:{id:'alice'}},error:null});
  assert.equal((await serve(post())).status,401);
});
test('quota exhaustion stops upstream calls',async()=> {
  const {serve,client}=await handler({activeAlerts:()=>assert.fail('Quota bypass')});
  client.rpc=async()=>({data:false,error:null});
  assert.equal((await serve(post())).status,429);
});
test('translation outage returns explicitly labeled official English wording',async()=> {
  const {serve}=await handler({activeAlerts:async()=>[{id:'nws-1',properties:{event:'Flood',headline:'Warning',description:'Flooding',instruction:'Move uphill',areaDesc:'County',expires:'2026-11-02'}}],translateAlert:async()=>{throw new Error('provider outage');}});
  const response=await serve(post());
  assert.equal(response.status,200);
  const body=await response.json();
  assert.equal(body.alerts[0].translationFailed,true);
  assert.match(body.alerts[0].message,/Move uphill/);
});
test('weather outage is never reported as no active alerts',async()=> {
  const {serve}=await handler({activeAlerts:async()=>{throw new Error('outage');}});
  assert.equal((await serve(post())).status,503);
});