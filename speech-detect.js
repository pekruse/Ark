(() => {
 const base=new URL('.',document.currentScript.src);let worker,loading,recording=false,stream,context,source,node,sink,timer,chunks=[],requestId=0,closed=false;
 function attach(){
 const dialog=document.querySelector('.ark-language-dialog');if(!dialog||dialog.querySelector('.ark-speech-engine'))return;
 const box=document.createElement('section');box.className='ark-speech-engine';box.lang='en';box.dir='ltr';
 box.innerHTML='<button type="button" class="ark-detect-speech">🎤 Speak to detect your language</button><p>Say a full sentence in your language for 5–8 seconds. First use downloads a speech model (roughly 75 MB). Audio is processed on this device and is not uploaded.</p><p class="ark-speech-status" role="status" aria-live="polite"></p><button type="button" class="ark-use-detected" hidden>Use detected language</button>';
 dialog.querySelector('label').before(box);
 const button=box.querySelector('.ark-detect-speech'),status=box.querySelector('.ark-speech-status'),confirm=box.querySelector('.ark-use-detected');
 function setStatus(text){status.textContent=text;}
 function stopTracks(){clearTimeout(timer);recording=false;stream?.getTracks().forEach(t=>t.stop());stream=null;try{node?.disconnect();source?.disconnect();sink?.disconnect();}catch{}context?.close().catch(()=>{});context=null;button.textContent='🎤 Speak to detect your language';}
 function cancel(){closed=true;requestId++;stopTracks();chunks=[];button.disabled=false;}
 dialog.addEventListener('close',cancel);dialog.addEventListener('cancel',cancel);
 function load(){
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
   worker=new Worker(new URL('speech-worker.mjs',base),{type:'module'});
   worker.onerror=()=>{loading=null;reject(Error('Speech engine could not load. Please try again or use the language list.'));button.disabled=false;};
   worker.onmessage=e=>{const data=e.data;if(data.type==='progress'&&!closed)setStatus('Downloading speech engine… '+Math.round(data.progress||0)+'%');
    if(data.type==='ready')resolve();
    if(data.type==='error'){loading=null;reject(Error(data.message));if(!closed){setStatus(data.message);button.disabled=false;}}
    if(data.type==='result'&&data.id===requestId&&!closed&&dialog.open){
     button.disabled=false;const result=data.result,code=({zh:'zh-CN',fil:'tl',iw:'he'})[result.language]||result.language;
     const option=Array.from(dialog.querySelector('select').options).find(o=>o.value===code);
     if(!option){setStatus('Detected '+result.language+', which is not available in the website language menu yet.');return;}
     const choose=()=>window.dispatchEvent(new CustomEvent('ark-language-commit',{detail:{code}}));
     if(result.confidence>=.8&&result.margin>=.25){setStatus('Detected '+option.textContent);choose();}
     else{setStatus('Possible language: '+option.textContent+'. Please confirm or record a longer sentence.');confirm.hidden=false;confirm.textContent='Use '+option.textContent;confirm.onclick=choose;}
    }
   };worker.postMessage({type:'load'});
  });return loading;
 }
 async function finish(){
  if(!recording)return;const sampleRate=context.sampleRate,parts=chunks;chunks=[];stopTracks();button.disabled=true;setStatus('Identifying language…');
  const samples=new Float32Array(parts.reduce((s,p)=>s+p.length,0));let offset=0;parts.forEach(p=>{samples.set(p,offset);offset+=p.length;});
  const length=Math.floor(samples.length*16000/sampleRate),audio=new Float32Array(length);
  for(let i=0;i<length;i++){const pos=i*sampleRate/16000,j=Math.floor(pos),f=pos-j;audio[i]=samples[j]*(1-f)+(samples[Math.min(j+1,samples.length-1)]||0)*f;}
  if(!closed)worker.postMessage({type:'detect',id:++requestId,audio},[audio.buffer]);
 }
 button.onclick=async()=>{
  if(recording){finish();return;}
  closed=false;confirm.hidden=true;button.disabled=true;
  try{
   if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone access is unavailable. Please use the language list.');
   setStatus('Loading speech engine…');await load();if(closed)return;
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
   if(closed){stopTracks();return;}
   context=new AudioContext();await context.resume();source=context.createMediaStreamSource(stream);node=context.createScriptProcessor(4096,1,1);sink=context.createGain();sink.gain.value=0;source.connect(node);node.connect(sink);sink.connect(context.destination);
   chunks=[];recording=true;node.onaudioprocess=e=>{if(recording)chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));};
   button.disabled=false;button.textContent='■ Stop and detect';setStatus('Listening… say a sentence in your language.');timer=setTimeout(finish,8000);
  }catch(error){stopTracks();button.disabled=false;setStatus(error.message||'Could not record. Please try again.');}
 };
 }
 const style=document.createElement('style');style.textContent='.ark-speech-engine{border:1px solid #b58f5966;border-radius:14px;padding:16px;margin:16px 0}.ark-speech-engine button{min-height:48px;width:100%}.ark-speech-engine p{font-size:13px!important}.ark-use-detected[hidden]{display:none}';document.head.append(style);
 window.addEventListener('click',()=>queueMicrotask(attach),true);attach();
})();