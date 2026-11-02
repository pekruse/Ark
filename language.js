(() => {
  if(window.__arkInstantLanguage || !window.ARK_SITE_I18N)return;
  window.__arkInstantLanguage=true;
  const data=window.ARK_SITE_I18N,normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const languages=[['en','English',['english','ingles']],['es','Español',['spanish','espanol','castellano']],['zh-CN','中文',['chinese','mandarin','中文','汉语','普通话']],['vi','Tiếng Việt',['vietnamese','tieng viet']],['ar','العربية',['arabic','العربية','عربي']],['ht','Kreyòl ayisyen',['haitian creole','kreyol','creole']],['ko','한국어',['korean','한국어']],['ru','Русский',['russian','русский']],['tl','Tagalog',['tagalog','filipino']]];
  const original=new WeakMap(),lookup=new Map(data.keys.map((key,i)=>[key,i]));
  // Page components may recreate translated text nodes. Resolve every language
  // back to a stable phrase index so repeated switches never get stuck.
  for(const language of languages){if(language[0]!=='en')data[language[0]].forEach((text,i)=>lookup.set(text,i));}
  for(const [text,index]of Object.entries(data.aliases||{}))lookup.set(text,index);
  function browserLanguage(){for(const tag of navigator.languages||[navigator.language||'en']){const root=tag.toLowerCase().split('-')[0],candidate=root==='zh'?'zh-CN':root==='fil'?'tl':root;if(languages.some(l=>l[0]===candidate))return candidate;}return 'en';}
  function countryLanguage(country){
    if(['ES','MX','GT','HN','SV','NI','CR','PA','CU','DO','PR','CO','VE','EC','PE','BO','PY','CL','AR','UY','GQ'].includes(country))return 'es';
    if(['CN','TW','HK','MO'].includes(country))return 'zh-CN';
    if(['SA','AE','EG','IQ','JO','LB','SY','YE','OM','QA','BH','KW','PS','SD','DZ','MA','TN','LY','MR'].includes(country))return 'ar';
    return {VN:'vi',HT:'ht',KR:'ko',RU:'ru',PH:'tl',US:'en',GB:'en',AU:'en',NZ:'en',IE:'en'}[country]||browserLanguage();
  }
  let code='en',selected=false,manual=false,applying=false,dialog,selector,transcript,status,voiceButton,recognition,timer;
  code=browserLanguage();selected=code!=='en';try{localStorage.removeItem('ark-site-language')}catch{}
  const tr=i=>code==='en'?data.keys[i]:data[code][i];
  const observer=new MutationObserver(()=>{if(!applying)apply();});
  function apply(){
    if(!document.body||applying)return;applying=true;observer.disconnect();
    try{
      document.documentElement.lang=code;document.documentElement.dir='ltr';document.documentElement.dataset.textDirection=code==='ar'?'rtl':'ltr';
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
      while(node=walker.nextNode()){
        const parent=node.parentElement;
        if(!parent||parent.closest('script,style,noscript,svg,option,textarea,.rot,.ark-theme-toggle,.ark-change-language,#ark-language-voice,#alerts,#identity,.chip'))continue;
        if(!original.has(node))original.set(node,node.nodeValue);
        const source=original.get(node),key=source.replace(/\s+/g,' ').trim(),index=lookup.get(key);
        const target=index===undefined?source:source.replace(source.trim(),tr(index));
        if(node.nodeValue!==target)node.nodeValue=target;
      }
      const heading=document.querySelector('h1.rot');if(heading){heading.querySelectorAll('span[lang]').forEach(span=>{const lang=span.lang==='zh'?'zh-CN':span.lang;const current=lang===code;span.dataset.headlineCurrent=String(current);span.setAttribute('aria-hidden',String(!current));});}if(selected)document.title='Ark · '+(heading?data.headlines[code]:tr(29));
      document.querySelectorAll('.ark-change-language').forEach(b=>{b.textContent='🌐 '+data.labels[code][0];b.setAttribute('aria-label',data.labels[code][0]);});
      const dark=document.documentElement.dataset.theme==='dark';
      document.querySelectorAll('.ark-theme-toggle').forEach(b=>{b.textContent=(dark?'☀ ':'☾ ')+data.labels[code][dark?2:1];});
      document.querySelectorAll('.ark-device-stage').forEach(el=>el.dir='ltr');document.querySelectorAll('.ark-screen').forEach(el=>el.lang=code);
      document.querySelectorAll('.ark-device[role=img]').forEach(el=>el.setAttribute('aria-label',tr(28)));
      if(selector)selector.value=code;
      if(voiceButton&&!recognition)voiceButton.textContent='🎙 '+tr(37);
    }finally{applying=false;observer.observe(document.body,{childList:true,subtree:true,characterData:true});}
  }
  function stop(){clearTimeout(timer);try{recognition?.abort();}catch{}recognition=null;if(voiceButton)voiceButton.textContent='🎙 '+tr(37);}
  function change(value){if(!languages.some(l=>l[0]===value))return;stop();code=value;selected=true;manual=true;apply();dialog?.close();}
  const buttonStyle=document.createElement('style');buttonStyle.textContent=`.ark-change-language{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;border:1px solid #D8C3A7;background:#F5EDE3;color:#6B4A2A;border-radius:999px;min-height:40px;padding:8px 13px;font:600 13px system-ui;cursor:pointer}.ark-language-dialog{font:16px/1.5 system-ui,sans-serif;max-width:470px;width:calc(100% - 32px);box-sizing:border-box;padding:28px;border:1px solid #D8C3A7;border-radius:22px;background:#FFFCF7;color:#2B2118;box-shadow:0 24px 90px #0005}.ark-language-dialog::backdrop{background:#100C08AA}.ark-language-dialog h2{font:700 27px/1.2 system-ui;margin:0 40px 14px 0}.ark-language-dialog p{font-size:14px;margin:12px 0}.ark-language-dialog label{display:block;font-size:14px;margin:15px 0}.ark-language-dialog select,.ark-language-dialog input{display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px;border:1px solid #BDA789;border-radius:10px;background:white;color:#2B2118;font:inherit}.ark-language-dialog button{font:600 14px system-ui;cursor:pointer;border:1px solid #BDA789;border-radius:10px;padding:12px;background:#F5EDE3;color:#573D24}.ark-language-dialog .language-close{float:right;padding:7px 12px;font-size:18px}.ark-language-dialog button:disabled{opacity:.55;cursor:default}.ark-language-dialog :focus-visible,.ark-change-language:focus-visible{outline:3px solid #BB8F54;outline-offset:3px}html[data-theme=dark] .ark-language-dialog{background:#29231D;color:#F3EADC;border-color:#68533A}html[data-theme=dark] .ark-language-dialog p{color:#CEBFAC!important}html[data-theme=dark] .ark-language-dialog select,html[data-theme=dark] .ark-language-dialog input{background:#171513;color:#F3EADC}html[data-theme=dark] .ark-language-dialog button,html[data-theme=dark] .ark-change-language{background:#33291E;color:#E7C99F;border-color:#6E5637}`;document.head.append(buttonStyle);
  function open(){
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='ark-language-dialog';dialog.setAttribute('aria-labelledby','ark-language-title');
      dialog.innerHTML='<button type="button" class="language-close" aria-label="Close">×</button><h2 id="ark-language-title">Change language</h2><p>Read the Ark website in your language.</p><label>Website language<select></select></label><p>Changes apply instantly on this page. Language is detected again when you open another page.</p><button type="button" id="ark-language-voice">🎙 <span>Say a language name</span></button><p>Say a language name, such as “Español” or “Arabic.” Voice recognition uses your browser’s language and may send audio to its speech provider. Ark does not save audio.</p><label>What we heard (you can edit this)<input maxlength="100" autocomplete="off"></label><p role="status" aria-live="polite"></p>';
      document.body.append(dialog);selector=dialog.querySelector('select');transcript=dialog.querySelector('input');status=dialog.querySelector('[role=status]');voiceButton=dialog.querySelector('#ark-language-voice');
      for(const [value,label]of languages){const opt=document.createElement('option');opt.value=value;opt.textContent=label;selector.append(opt);}
      selector.addEventListener('change',()=>change(selector.value));
      dialog.querySelector('.language-close').onclick=()=>dialog.close();dialog.addEventListener('close',stop);dialog.addEventListener('cancel',stop);
      transcript.addEventListener('input',()=>{const text=normalize(transcript.value);const found=languages.find(l=>l[2].some(alias=>{const key=normalize(alias);return /^[a-z ]+$/.test(key)?new RegExp('(?:^|\\s)'+key+'(?:$|\\s|[.!?,])').test(text):text.includes(key);}));if(found)change(found[0]);});
      const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!Speech){voiceButton.disabled=true;voiceButton.title='Voice input is unavailable in this browser. Use the language list.';}
      voiceButton.onclick=()=>{
        if(recognition){stop();return;}
        recognition=new Speech();recognition.lang=navigator.language||'en-US';recognition.continuous=false;recognition.interimResults=false;
        recognition.onresult=e=>{transcript.value=e.results[0][0].transcript;transcript.dispatchEvent(new Event('input'));if(dialog.open)status.textContent='Please choose the language from the list if it was not recognized.';};
        recognition.onerror=()=>{status.textContent='Voice input could not be completed. Please use the language list.';};
        recognition.onend=()=>{recognition=null;clearTimeout(timer);voiceButton.textContent='🎙 '+tr(37);};
        try{recognition.start();voiceButton.textContent='■ Stop';timer=setTimeout(stop,10000);}catch{stop();}
      };
    }
    status.textContent='';transcript.value='';apply();dialog.showModal();
  }
  window.addEventListener('click',e=>{if(e.target.closest?.('.ark-change-language'))open();else if(e.target.closest?.('.ark-theme-toggle'))queueMicrotask(apply);},true);
  // The existing page bundle can render content after this script loads.
  const directionStyle=document.createElement('style');directionStyle.textContent='html[data-text-direction=rtl] h1,html[data-text-direction=rtl] h2,html[data-text-direction=rtl] h3,html[data-text-direction=rtl] p,html[data-text-direction=rtl] label,html[data-text-direction=rtl] .ark-language-dialog{direction:rtl;text-align:right}html[data-text-direction=rtl] .ark-device{direction:ltr}html[data-text-direction=rtl] .ark-device h3,html[data-text-direction=rtl] .ark-screen h4,html[data-text-direction=rtl] .ark-appgreeting,html[data-text-direction=rtl] .ark-location,html[data-text-direction=rtl] .ark-alert-message,html[data-text-direction=rtl] .ark-alert-source,html[data-text-direction=rtl] .ark-original-label,html[data-text-direction=rtl] .ark-help-card strong,html[data-text-direction=rtl] .ark-help-card span,html[data-text-direction=rtl] .ark-appfootnote{direction:rtl;text-align:right}.ark-location-disclosure{font:12px/1.5 system-ui;color:#887660}';document.head.append(directionStyle);
  // Disclose the country-only lookup in the same language controls it supports.
  window.addEventListener('click',e=>{if(e.target.closest?.('.ark-change-language')&&dialog&&!dialog.querySelector('.ark-location-disclosure')){const note=document.createElement('p');note.className='ark-location-disclosure';note.textContent='On your first visit, ipapi.co estimates your country from your IP address to suggest a language. Ark does not store your IP or precise location. Manual language changes apply only to this page.';dialog.append(note);}},true);
  apply();setTimeout(apply,500);
  async function automaticCountry(){
    if(manual)return;
    let country;try{country=sessionStorage.getItem('ark-country');}catch{}
    if(!/^[A-Z]{2}$/.test(country||'')){
      try{const response=await fetch('https://ipapi.co/country/',{signal:AbortSignal.timeout(1800),credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)return;country=(await response.text()).trim().toUpperCase();if(!/^[A-Z]{2}$/.test(country))return;try{sessionStorage.setItem('ark-country',country);}catch{}}catch{return;}
    }
    if(manual)return;code=countryLanguage(country);selected=true;apply();
  }
  automaticCountry();
})();
