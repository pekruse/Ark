import {test} from 'node:test';
import assert from 'node:assert/strict';
import {eligibleAlert,validatePreference,sourceText,smsText} from '../supabase/functions/_shared/core.js';
const now = Date.parse('2026-11-01T12:00:00Z');
const alert = {id:'https://api.weather.gov/alerts/123',properties:{status:'Actual',messageType:'Alert',severity:'Severe',expires:'2026-11-01T13:00:00Z'}};
test('exclude expired, test, cancelled and lower-severity alerts',()=> {
  assert.equal(eligibleAlert(alert,now),true);
  for (const patch of [{status:'Test'},{messageType:'Cancel'},{severity:'Moderate'},{expires:'bad'},{expires:'2026-11-01T11:00:00Z'}]) assert.equal(eligibleAlert({...alert,properties:{...alert.properties,...patch}},now),false);
  assert.equal(eligibleAlert(null,now),false);
});
test('validate ZIP and supported language',()=> {
  assert.doesNotThrow(()=>validatePreference({zip:'02108',language:'es'}));
  for (const p of [{zip:'123',language:'en'},{zip:'02108',language:'unknown'},null]) assert.throws(()=>validatePreference(p));
});
test('official instructions are preserved without invented guidance',()=> {
  assert.equal(sourceText({event:'Flood',instruction:'Move to higher ground.'}),'Flood\n\nMove to higher ground.');
});
test('text links encode alert ID and include opt-out',()=> {
  const message=smsText('ignored','https://example.com/?a=1&b=2','en');
  const link=message.match(/https:\/\/\S+/)[0].replace(/\.$/,'');
  assert.equal(new URL(link).searchParams.get('alert'),'https://example.com/?a=1&b=2');
  assert.match(message,/STOP/);
});
