import {db, env, json, activeAlerts, translateAlert} from '../_shared/services.ts';
import {smsText} from '../_shared/core.js';
Deno.serve(async req => {
  if (req.method !== 'POST') return json({error:'Method not allowed'},405);
  if (req.headers.get('authorization') !== `Bearer ${env('DISPATCH_SECRET')}`) return json({error:'Unauthorized'},401);
  if (Deno.env.get('SMS_DELIVERY_ENABLED') !== 'true') return json({disabled:true});
  const client = db();
  let accepted = 0, failed = 0;
  const results = [];
  try {
    // Pilot batches; cursor pagination covers every enrolled user across scheduler calls.
    const url = new URL(req.url);
    const after = url.searchParams.get('after');
    let query = client.from('preferences').select('*').eq('sms_enabled',true).order('user_id').limit(25);
    if (after) query = query.gt('user_id',after);
    const {data:profiles,error} = await query;
    if (error) throw error;
    for (const p of profiles ?? []) {
      try {
        const {data:{user},error:authError} = await client.auth.admin.getUserById(p.user_id);
        if (authError) throw authError;
        if (!user?.phone_confirmed_at || !user.phone || !p.sms_consent_at) continue;
        for (const f of await activeAlerts(p.zip)) {
          // Translation must succeed before notifying a non-English subscriber.
          const translated = await translateAlert(client,f,p.language);
          const key = {user_id:p.user_id,alert_id:f.id,language:p.language};
          const {error:claimError} = await client.from('deliveries').insert(key);
          if (claimError?.code === '23505') continue;
          if (claimError) throw claimError;
          try {
            // Recheck opt-out immediately before contacting the provider.
            const {data:latest,error:latestError} = await client.from('preferences').select('sms_enabled').eq('user_id',p.user_id).maybeSingle();
            if (latestError) throw latestError;
            if (!latest?.sms_enabled) continue;
            const body = new URLSearchParams({To:'+'+user.phone.replace(/^\+/,''),MessagingServiceSid:env('TWILIO_MESSAGING_SERVICE_SID'),Body:smsText(translated,f.id,p.language)});
            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env('TWILIO_ACCOUNT_SID')}/Messages.json`,{method:'POST',headers:{Authorization:'Basic '+btoa(`${env('TWILIO_ACCOUNT_SID')}:${env('TWILIO_AUTH_TOKEN')}`),'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(15000)});
            const result = await response.json();
            if (!response.ok) {
              const {error:writeError} = await client.from('deliveries').update({status:'failed'}).match(key);
              if (writeError) throw writeError;
              // Twilio enforces STOP through Advanced Opt-Out. Mirror a blocked recipient locally.
              if (result.code === 21610) await client.from('preferences').update({sms_enabled:false}).eq('user_id',p.user_id);
              failed++;
              continue;
            }
            const {error:writeError} = await client.from('deliveries').update({status:'accepted',provider_id:result.sid}).match(key);
            if (writeError) throw writeError;
            accepted++;
          } catch {
            // Unknown outcomes are never automatically retried: a timeout may have occurred after acceptance.
            await client.from('deliveries').update({status:'unknown'}).match(key);
            failed++;
          }
        }
      } catch { failed++; }
      results.push(p.user_id);
    }
    return json({accepted,failed,nextCursor:results.length === 25 ? results.at(-1) : null});
  } catch { return json({error:'Dispatch failed',accepted,failed},503); }
});
