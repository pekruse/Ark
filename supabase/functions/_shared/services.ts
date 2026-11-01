import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { eligibleAlert, sourceText, validatePreference } from './core.js';
export const env = (name: string) => { const v = Deno.env.get(name); if (!v) throw new Error(`Missing server setting: ${name}`); return v; };
export const db = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {auth:{persistSession:false,autoRefreshToken:false}});
export async function checked(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {...options, signal: AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error(`Upstream request failed (${response.status})`);
  return response.json();
}
export const cors = {'Access-Control-Allow-Origin':'https://pekruse.github.io','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
export function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), {status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}}); }
export async function preference(client: ReturnType<typeof db>, uid: string) {
  const {data,error} = await client.from('preferences').select('*').eq('user_id',uid).single();
  if (error) throw new Error('Save your ZIP code and language first.');
  return validatePreference(data);
}
export async function activeAlerts(zip: string) {
  if (!/^\d{5}$/.test(zip)) throw new Error('Invalid ZIP code');
  const location = await checked(`https://api.zippopotam.us/us/${zip}`);
  const place = location.places?.[0];
  const lat = Number(place?.latitude), lon = Number(place?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new Error('ZIP location unavailable');
  const data = await checked(`https://api.weather.gov/alerts/active?point=${lat},${lon}`, {headers:{'User-Agent':`Ark/1.0 (${env('CONTACT_EMAIL')})`,'Accept':'application/geo+json'}});
  if (!Array.isArray(data.features)) throw new Error('Invalid weather response');
  // A ZIP centroid is approximate. Display the official affected area with each result.
  return data.features.filter((f: unknown) => eligibleAlert(f)).slice(0,10);
}
export async function translateAlert(client: ReturnType<typeof db>, feature: any, language: string) {
  const original = sourceText(feature.properties);
  if (language === 'en') return original;
  const {data:cached,error:readError} = await client.from('translations').select('message').eq('alert_id',feature.id).eq('language',language).gt('expires_at',new Date().toISOString()).maybeSingle();
  if (readError) throw readError;
  if (cached) return cached.message;
  if (original.length > 45000) throw new Error('Official alert exceeds translation limit');
  const result = await checked(`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from=en&to=${encodeURIComponent(language)}`, {method:'POST',headers:{'Content-Type':'application/json','Ocp-Apim-Subscription-Key':env('TRANSLATOR_KEY'),'Ocp-Apim-Subscription-Region':env('TRANSLATOR_REGION')},body:JSON.stringify([{Text:original}])});
  const message = result?.[0]?.translations?.[0]?.text;
  if (typeof message !== 'string' || !message.trim()) throw new Error('Translation unavailable');
  const {error} = await client.from('translations').upsert({alert_id:feature.id,language,message,expires_at:feature.properties.expires});
  if (error) throw error;
  return message;
}
