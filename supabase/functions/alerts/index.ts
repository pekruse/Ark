import {db, env, json, preference, activeAlerts, translateAlert} from '../_shared/services.ts';
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return json({});
  if (req.method !== 'POST') return json({error:'Method not allowed'},405);
  try {
    const client = db();
    const token = req.headers.get('authorization')?.replace(/^Bearer /,'');
    if (!token) return json({error:'Sign in first'},401);
    const {data:{user},error} = await client.auth.getUser(token);
    if (error || !user?.email_confirmed_at) return json({error:'Sign in with a verified email'},401);
    const {data:allowed,error:quotaError} = await client.rpc('consume_alert_quota',{uid:user.id});
    if (quotaError) throw quotaError;
    if (!allowed) return json({error:'Please try again later. Hourly refresh limit reached.'},429);
    const p = await preference(client,user.id);
    const alerts = [];
    for (const f of await activeAlerts(p.zip)) {
      let message, translationFailed = false;
      try { message = await translateAlert(client,f,p.language); }
      catch { message = [f.properties.headline,f.properties.description,f.properties.instruction].filter(Boolean).join('\n\n'); translationFailed = true; }
      alerts.push({id:f.id,event:f.properties.event,area:f.properties.areaDesc,expires:f.properties.expires,message,translationFailed,original:f.properties});
    }
    return json({alerts,checkedAt:new Date().toISOString()});
  } catch (error) {
    console.error('Alert retrieval failed', error instanceof Error ? error.message : 'unknown');
    return json({error:'Alerts are unavailable. Check weather.gov for official alerts and try again later.'},503);
  }
});
