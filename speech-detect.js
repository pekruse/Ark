(() => {
 const base=new URL('.',document.currentScript.src);
 const microphone='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
 function attach(){
  const dialog=document.querySelector('.ark-language-dialog');
  const button=dialog?.querySelector('#ark-language-voice');
  if(!button||button.dataset.unifiedSpeech)return;
  button.dataset.unifiedSpeech='true';button.disabled=false;button.removeAttribute('title');
  const status=dialog.querySelector('[role=status]'),transcript=dialog.querySelector('input');
  const confirm=document.createElement('button');confirm.type='button';confirm.hidden=true;confirm.className='ark-use-detected';status.after(confirm);
  let worker,loading,recording=false,busy=false,stream,context,source,node,sink,timer,chunks=[],requestId=0,closed=false;
  function label(listening=false){button.innerHTML=microphone+'<span>'+(listening?'Stop and detect':'Speak your language')+'</span>';button.setAttribute('aria-pressed',String(listening));transcript.classList.toggle('is-listening',listening);}
  function setStatus(text){status.textContent=text;}
  function stopTracks(){clearTimeout(timer);recording=false;stream?.getTracks().forEach(t=>t.stop());stream=null;try{node?.disconnect();source?.disconnect();sink?.disconnect();}catch{}context?.close().catch(()=>{});context=null;label();}
  function cancel(){closed=true;requestId++;busy=false;stopTracks();chunks=[];button.disabled=false;confirm.hidden=true;}
  dialog.addEventListener('close',cancel);dialog.addEventListener('cancel',cancel);
  function showResult(result){
   busy=false;button.disabled=false;
   window.dispatchEvent(new CustomEvent('ark-speech-transcript',{detail:{text:result.text||''}}));
   const named=window.arkResolveSpokenLanguage?.(result.text||'');
   const code=named||({zh:'zh-CN',fil:'tl',iw:'he',nb:'no',nn:'no'})[result.language]||result.language;
   const option=Array.from(dialog.querySelector('select').options).find(o=>o.value===code);
   if(!option||option.disabled){setStatus((option?.textContent||'Detected '+code)+'. Please choose an available language from the list.');return;}
   const choose=()=>window.dispatchEvent(new CustomEvent('ark-language-commit',{detail:{code}}));
   if(named||(result.confidence>=.8&&result.margin>=.25)){setStatus('Detected '+option.textContent);choose();}
   else{setStatus('Possible language: '+option.textContent+'. Please confirm or try a longer sentence.');confirm.hidden=false;confirm.textContent='Use '+option.textContent;confirm.onclick=choose;}
  }
  function load(){
   if(loading)return loading;
   loading=new Promise((resolve,reject)=>{
    worker=new Worker(new URL('speech-worker.mjs?v=2',base),{type:'module'});
    worker.onerror=()=>{loading=null;busy=false;reject(Error('Speech engine could not load. Please try again or use the language list.'));if(!closed){setStatus('Speech engine could not load. Please try again or use the language list.');button.disabled=false;}};
    worker.onmessage=event=>{
     const data=event.data;
     if(data.type==='progress'&&!closed)setStatus('Downloading speech engine… '+Math.round(data.progress||0)+'%');
     if(data.type==='ready')resolve();
     if(data.type==='error'){loading=null;busy=false;reject(Error(data.message));if(!closed){setStatus(data.message);button.disabled=false;}}
     if(data.type==='result'&&data.id===requestId&&!closed&&dialog.open)showResult(data.result);
    };
    worker.postMessage({type:'load'});
   });return loading;
  }
  async function finish(){
   if(!recording)return;
   const sampleRate=context.sampleRate,parts=chunks;chunks=[];stopTracks();button.disabled=true;setStatus('Recognizing what you said and detecting the language…');
   const samples=new Float32Array(parts.reduce((sum,part)=>sum+part.length,0));let offset=0;
   parts.forEach(part=>{samples.set(part,offset);offset+=part.length;});
   const length=Math.floor(samples.length*16000/sampleRate),audio=new Float32Array(length);
   for(let i=0;i<length;i++){const pos=i*sampleRate/16000,j=Math.floor(pos),fraction=pos-j;audio[i]=samples[j]*(1-fraction)+(samples[Math.min(j+1,samples.length-1)]||0)*fraction;}
   if(!closed)worker.postMessage({type:'detect',id:++requestId,audio},[audio.buffer]);
  }
  button.onclick=async()=>{
   if(recording){finish();return;}if(busy)return;
   closed=false;busy=true;confirm.hidden=true;button.disabled=true;transcript.value='';
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error('Microphone access is unavailable. Please use the language list.');
    setStatus('Loading speech engine…');await load();if(closed)return;
    setStatus('Speech engine ready. Allow microphone access in your browser to begin.');
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
    if(closed){stopTracks();return;}
    context=new AudioContext();await context.resume();source=context.createMediaStreamSource(stream);node=context.createScriptProcessor(4096,1,1);sink=context.createGain();sink.gain.value=0;source.connect(node);node.connect(sink);sink.connect(context.destination);
    chunks=[];recording=true;node.onaudioprocess=event=>{if(recording)chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));};
    button.disabled=false;label(true);setStatus('Listening… say a language name, or speak a sentence in your language.');timer=setTimeout(finish,8000);
   }catch(error){busy=false;stopTracks();button.disabled=false;setStatus(error.message||'Could not record. Please try again.');}
  };
  label();
 }
 const style=document.createElement('style');style.textContent='.ark-use-detected[hidden]{display:none}.ark-use-detected{width:100%;margin:10px 0}';document.head.append(style);
 window.addEventListener('ark-language-open',attach);attach();
})();
