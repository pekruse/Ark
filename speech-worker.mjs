import {createDetector} from './speech-core.mjs?v=2';
import * as runtime from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
let detector;
self.onmessage=async event=>{
 const {type,id,audio}=event.data;
 try{
  if(!detector)detector=createDetector(runtime,p=>{if(p.status==='progress')self.postMessage({type:'progress',progress:p.progress});});
  const detect=await detector;
  if(type==='load')self.postMessage({type:'ready'});
  if(type==='detect')self.postMessage({type:'result',id,result:await detect(audio)});
 }catch(error){detector=null;self.postMessage({type:'error',id,message:error.message||'Speech detection could not run.'});}
};
