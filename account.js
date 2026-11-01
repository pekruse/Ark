import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const $ = id => document.getElementById(id);
const status = text => { $('status').textContent = text; };
const config = window.ARK_CONFIG;
let user, client;
async function run(button, action) {
  button.disabled = true;
  try { await action(); } catch (error) { status(error.message || 'Something went wrong. Try again.'); }
  finally { button.disabled = false; }
}
function check(result) { if (result.error) throw result.error; return result.data; }
async function showSession(session) {
  user = session?.user;
  $('signed-in').hidden = !user;
  $('signed-out').hidden = !!user;
  $('alerts').replaceChildren();
  if (!user) { status('Join the early list or sign in.'); return; }
  $('identity').textContent = `Signed in as ${user.email}`;
  const p = check(await client.from('preferences').select('*').eq('user_id',user.id).maybeSingle());
  $('zip').value = p?.zip || '';
  $('language').value = p?.language || 'en';
  $('sms').checked = p?.sms_enabled || false;
  $('phone').value = user.phone ? '+'+user.phone.replace(/^\+/,'') : '';
  status(p ? 'Your preferences are saved.' : 'Save your preferences to join the early list.');
}
if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
  status('Account and alert services are being set up. Email ArkDevelopmentSolutions@protonmail.com to join the early list.');
} else {
  client = createClient(config.supabaseUrl,config.supabaseAnonKey);
  // Schedule work outside the auth callback to avoid locking auth operations.
  client.auth.onAuthStateChange((_event,session) => setTimeout(() => showSession(session).catch(e=>status(e.message)),0));
  showSession(check(await client.auth.getSession()).session).catch(e=>status(e.message));
  $('login').onsubmit = e => { e.preventDefault(); run(e.submitter,async()=> {
    const redirect = new URL('account.html',location.href); redirect.search=''; redirect.hash='';
    check(await client.auth.signInWithOtp({email:$('email').value.trim(),options:{emailRedirectTo:redirect.href}}));
    status('Check your email for a sign-in link.');
  }); };
  $('logout').onclick = e => run(e.target,async()=> { check(await client.auth.signOut()); status('Signed out.'); });
  $('preferences').onsubmit = e => { e.preventDefault(); run(e.submitter,async()=> {
    user = check(await client.auth.getUser()).user;
    if ($('sms').checked && !user.phone_confirmed_at) throw new Error('Verify your phone number before enabling texts.');
    check(await client.from('preferences').upsert({user_id:user.id,zip:$('zip').value,language:$('language').value,sms_enabled:$('sms').checked,sms_consent_at:$('sms').checked ? new Date().toISOString() : null}));
    status('Saved. You are on the early list.');
  }); };
  $('phone-form').onsubmit = e => { e.preventDefault(); run(e.submitter,async()=> {
    check(await client.auth.updateUser({phone:$('phone').value.trim()})); status('Verification code sent. Enter it below.');
  }); };
  $('verify-form').onsubmit = e => { e.preventDefault(); run(e.submitter,async()=> {
    check(await client.auth.verifyOtp({phone:$('phone').value.trim(),token:$('code').value.trim(),type:'phone_change'})); status('Phone verified. You can now enable texts and save.');
  }); };
  $('refresh').onclick = e => run(e.target,async()=> {
    $('alerts').replaceChildren(); status('Checking official alerts…');
    const result = check(await client.functions.invoke('alerts',{body:{}}));
    if (result.error) throw new Error(result.error);
    $('checked').textContent = `Last checked: ${new Date(result.checkedAt).toLocaleString()}`;
    for (const a of result.alerts) {
      const article = document.createElement('article');
      const heading = document.createElement('h3'); heading.textContent = a.event;
      const area = document.createElement('p'); area.textContent = `${a.area} · Expires ${new Date(a.expires).toLocaleString()}`;
      const text = document.createElement('p'); text.textContent = a.message; text.dir='auto'; text.lang=a.translationFailed?'en':$('language').value;
      const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent='Original official alert';
      const original = document.createElement('p'); original.textContent = [a.original.headline,a.original.description,a.original.instruction].filter(Boolean).join('\n\n');
      details.append(summary,original); article.append(heading,area,text,details);
      if (a.translationFailed) { const notice = document.createElement('p'); notice.textContent='Translation is unavailable. Showing official English wording.'; article.prepend(notice); }
      const target = new URL(location.href).searchParams.get('alert');
      if (a.id === target) article.id='requested-alert';
      $('alerts').append(article);
    }
    status(result.alerts.length ? 'Official alerts loaded.' : 'No active severe or extreme alerts were returned for your ZIP center. Check official sources for nearby alerts.');
    $('requested-alert')?.scrollIntoView();
  });
  $('remove').onclick = e => run(e.target,async()=> { check(await client.from('preferences').delete().eq('user_id',user.id)); $('sms').checked=false; $('zip').value=''; $('alerts').replaceChildren(); status('Preferences removed. You are off the early list and Ark will stop sending texts.'); });
}
