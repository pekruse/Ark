(() => {
  if(window.__arkInstantLanguage || !window.ARK_SITE_I18N)return;
  window.__arkInstantLanguage=true;
  const data=window.ARK_SITE_I18N,normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const languages=[['en','English',['english','ingles']],['es','Español',['spanish','espanol','castellano']],['zh-CN','中文',['chinese','mandarin','中文','汉语','普通话']],['vi','Tiếng Việt',['vietnamese','tieng viet']],['ar','العربية',['arabic','العربية','عربي']],['ht','Kreyòl ayisyen',['haitian creole','kreyol','creole']],['ko','한국어',['korean','한국어']],['ru','Русский',['russian','русский']],['tl','Tagalog',['tagalog','filipino']],['he','עברית (Hebrew)',['hebrew','ivrit','עברית']],['la','Latina (Latin)',['latin','latina','lingua latina']],['hi','हिन्दी (Hindi)',['hindi','हिन्दी','हिंदी']],['fr','Français',['french','francais']],['bn','বাংলা (Bengali)',['bengali','bangla','বাংলা']],['pt','Português',['portuguese','portugues']],['id','Bahasa Indonesia',['indonesian','bahasa indonesia']],['ur','اردو (Urdu)',['urdu','اردو']]];
  languages.push(...[["sv","Svenska",[]],["no","Norsk",[]],["da","Dansk",[]],["fi","Suomi",[]],["cs","Čeština",[]],["el","Ελληνικά",[]],["sq","Shqip",[]],["ca","Català",[]],["hy","Հայերեն",[]],["az","Azərbaycanca",[]],["be","Беларуская",[]],["bs","Bosanski",[]],["bg","Български",[]],["km","ខ្មែរ",[]],["hr","Hrvatski",[]],["et","Eesti",[]],["am","አማርኛ",[]],["ka","ქართული",[]],["hu","Magyar",[]],["is","Íslenska",[]],["kk","Қазақша",[]],["ky","Кыргызча",[]],["lo","ລາວ",[]],["lv","Latviešu",[]],["lt","Lietuvių",[]],["lb","Lëtzebuergesch",[]],["ny","Chichewa",[]],["mt","Malti",[]],["mn","Монгол",[]],["sr","Српски",[]],["my","မြန်မာ",[]],["mk","Македонски",[]],["rw","Kinyarwanda",[]],["sm","Gagana Samoa",[]],["sk","Slovenčina",[]],["sl","Slovenščina",[]],["si","සිංහල",[]],["tg","Тоҷикӣ",[]],["tk","Türkmençe",[]]]);

  languages.push(...[["de","Deutsch",[]],["it","Italiano",[]],["nl","Nederlands",[]],["ro","Română",[]],["pl","Polski",[]],["ja","日本語",[]],["tr","Türkçe",[]],["uk","Українська",[]],["ms","Bahasa Melayu",[]],["sw","Kiswahili",[]],["fa","فارسی",[]],["th","ไทย",[]],["mr","मराठी",[]],["ne","नेपाली",[]],["uz","O‘zbekcha",[]],["ha","Hausa",[]],["so","Soomaali",[]],["yo","Yorùbá",[]],["zu","isiZulu",[]],["ta","தமிழ்",[]],["te","తెలుగు",[]],["kn","ಕನ್ನಡ",[]],["ml","മലയാളം",[]],["gu","ગુજરાતી",[]],["pa","ਪੰਜਾਬੀ",[]],["or","ଓଡ଼ିଆ",[]],["sd","سنڌي",[]]]);


  // Build language-name aliases from the browser's Unicode CLDR translations.
  const nameIndex=new Map();
  const cleanName=text=>text.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[’']/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  function addName(name,code){
    const key=cleanName(name);if(!key||key===code.toLowerCase())return;
    if(!nameIndex.has(key))nameIndex.set(key,new Set());
    nameIndex.get(key).add(code);
  }
  for(const [code,label,aliases] of languages){
    for(const name of aliases)addName(name,code);
    addName(label,code);
  }
  const namingLocales=['en','es','fr','de','it','pt','nl','pl','uk','ru','ar','he','fa','tr','hi','bn','ur','zh','ja','ko','vi','id','ms','tl','ht','la','sw','ta','te','th','el','ro','hu','cs','sv','da','fi','no'];
  if(typeof Intl.DisplayNames==='function'){
    for(const locale of Intl.DisplayNames.supportedLocalesOf(namingLocales)){
      try{
        const names=new Intl.DisplayNames([locale],{type:'language'});
        for(const [code] of languages){
          for(const tag of code==='zh-CN'?['zh','zh-Hans','zh-CN']:code==='tl'?['tl','fil']:[code]){
            const name=names.of(tag);if(name&&name!==tag)addName(name,code);
          }
        }
      }catch{}
    }
  }
  // Common spoken forms not always supplied by CLDR.
  for(const [code,names] of Object.entries({
    es:['espagnol','espanhol','Spanisch','西班牙语','西班牙語'],
    en:['anglais','inglês','Englisch','英语','英語'],
    fr:['francés','francês','Französisch','法语','法語'],
    'zh-CN':['mandarin chinese','mandarin','chinois','chino','中文','普通话','普通話'],
    he:['hébreu','hebreo','hebraico','עברית'],
    ar:['arabe','árabe','العربية'],
    ht:['créole haïtien','criollo haitiano','kreyòl ayisyen'],
    la:['latín','latim','latein','lingua latina']
  }))for(const name of names)addName(name,code);
  function matchLanguageName(text){
    const value=cleanName(text),exact=nameIndex.get(value);
    if(exact)return exact.size===1?[...exact][0]:null;
    const matches=new Set();
    for(const [name,codes] of nameIndex){
      const pos=value.indexOf(name);if(pos<0)continue;
      // Require complete words; avoid mistaking unrelated words for a language.
      const before=value.slice(0,pos),after=value.slice(pos+name.length);
      const bounded=(!before||before.endsWith(' '))&&(!after||after.startsWith(' '));
      const cjk=/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(name);
      if(bounded||cjk)for(const code of codes)matches.add(code);
    }
    return matches.size===1?[...matches][0]:null;
  }


  // Small spelling/transcription changes, grouped by target language.
  function nameDistance(a,b){
    a=Array.from(a);b=Array.from(b);
    const rows=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
    for(let i=0;i<=a.length;i++)rows[i][0]=i;
    for(let j=0;j<=b.length;j++)rows[0][j]=j;
    for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
      rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
      if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
    }
    return rows[a.length][b.length];
  }
  function fuzzyLanguageName(text){
    const value=cleanName(text);if(value.length>80)return null;
    const exact=matchLanguageName(value);if(exact)return exact;
    // Fuzzy matching is only for a name, not a sentence with several choices.
    const compact=value.replace(/ /g,'');
    if(Array.from(compact).length<5||value.split(' ').length>3)return null;
    const scores=new Map();
    for(const [name,codes] of nameIndex){
      const target=name.replace(/ /g,''),length=Math.max(Array.from(compact).length,Array.from(target).length);
      if(length<5||Math.abs(compact.length-target.length)>2)continue;
      const distance=nameDistance(compact,target),limit=length>=9?2:1;
      const score=1-distance/length;
      if(distance>limit||score<0.8)continue;
      for(const code of codes)scores.set(code,Math.max(scores.get(code)||0,score));
    }
    const ranked=[...scores].sort((a,b)=>b[1]-a[1]);
    if(!ranked.length||(ranked[1]&&ranked[0][1]-ranked[1][1]<0.12))return null;
    return ranked[0][0];
  }

  const original=new WeakMap(),lookup=new Map(data.keys.map((key,i)=>[key,i]));
  // Page components may recreate translated text nodes. Resolve every language
  // back to a stable phrase index so repeated switches never get stuck.
  for(const language of languages){if(language[0]!=='en')data[language[0]].forEach((text,i)=>lookup.set(text,i));}
  for(const [text,index]of Object.entries(data.aliases||{}))lookup.set(text,index);
  function browserLanguage(){for(const tag of navigator.languages||[navigator.language||'en']){const root=tag.toLowerCase().split('-')[0],candidate=root==='zh'?'zh-CN':root==='fil'?'tl':root==='iw'?'he':root;if(languages.some(l=>l[0]===candidate))return candidate;}return 'en';}
  function countryLanguage(country){return window.arkCountryLanguage?.(country).code||browserLanguage();}
  let code='en',selected=false,manual=false,applying=false,dialog,selector,transcript,status,voiceButton,recognition,timer;
  code=browserLanguage();let carried=false,previewBase=null;
  try{localStorage.removeItem('ark-site-language');const visit=sessionStorage.getItem('ark-visit-language');if(/account\.html$/.test(location.pathname)&&languages.some(item=>item[0]===visit)){code=visit;carried=true;manual=true;}else{sessionStorage.removeItem('ark-visit-language');sessionStorage.removeItem('ark-country');}}catch{}
  selected=code!=='en';
  function keepVisitLanguage(){try{sessionStorage.setItem('ark-visit-language',code);}catch{}}
  const tr=i=>code==='en'?data.keys[i]:data[code][i];
  const observer=new MutationObserver(()=>{if(!applying)apply();});
  function apply(){
    if(!document.body||applying)return;applying=true;observer.disconnect();
    try{
      document.documentElement.lang=code;document.documentElement.dir='ltr';document.documentElement.dataset.textDirection=['ar','he','ur','fa','sd','dv'].includes(code)?'rtl':'ltr';
      const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
      while(node=walker.nextNode()){
        const parent=node.parentElement;
        if(!parent||parent.closest('script,style,noscript,svg,option,textarea,.rot,.ark-theme-toggle,.ark-change-language,#ark-language-voice,#alerts,#identity,.chip'))continue;
        if(!original.has(node))original.set(node,node.nodeValue);
        const source=original.get(node),key=source.replace(/\s+/g,' ').trim(),index=lookup.get(key);
        const target=index===undefined?source:source.replace(source.trim(),tr(index));
        if(node.nodeValue!==target)node.nodeValue=target;
      }
      const heading=document.querySelector('h1.rot');if(heading){heading.querySelectorAll('span[lang]').forEach(span=>{const lang=span.lang==='zh'?'zh-CN':span.lang;const current=lang===code||(!heading.querySelector('span[lang="'+code+'"]')&&lang==='en');span.dataset.headlineCurrent=String(current);span.setAttribute('aria-hidden',String(!current));});}if(selected)document.title='Ark · '+(heading?data.headlines[code]:tr(29));
      document.querySelectorAll('.ark-change-language').forEach(b=>{b.textContent='🌐 '+data.labels[code][0];b.setAttribute('aria-label',data.labels[code][0]);});
      const dark=document.documentElement.dataset.theme==='dark';
      document.querySelectorAll('.ark-theme-toggle').forEach(b=>{b.innerHTML='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'+(dark?"<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4L19 5\"/>":"<path d=\"M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z\"/>")+'</svg>';b.setAttribute('aria-label',data.labels[code][dark?2:1]);b.style.minWidth='42px';b.style.width='42px';b.style.height='42px';b.style.padding='9px';});
      document.querySelectorAll('.ark-device-stage').forEach(el=>el.dir='ltr');document.querySelectorAll('.ark-screen').forEach(el=>el.lang=code);
      document.querySelectorAll('.ark-device').forEach(el=>{el.setAttribute('role','group');el.setAttribute('aria-label',tr(28));});
      if(selector){selector.value=code;let names;try{names=new Intl.DisplayNames([code],{type:'language'});}catch{}
        for(const option of selector.options){const item=languages.find(l=>l[0]===option.value);if(!item){option.textContent=(window.ARK_UNAVAILABLE_LANGUAGES?.[option.value]||option.value)+' — translation unavailable';option.disabled=true;continue;}const native=item[1].replace(/ \([^)]*\)$/,'');let translated;try{translated=names?.of(option.value==='zh-CN'?'zh':option.value);}catch{}option.textContent=translated?native+' ('+translated+')':native;option.lang=code;}
      }
      if(voiceButton&&!recognition)voiceLabel();
    }finally{applying=false;observer.observe(document.body,{childList:true,subtree:true,characterData:true});}
  }
  function voiceLabel(listening=false){if(!voiceButton)return;voiceButton.innerHTML="<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"8\" y=\"2\" width=\"8\" height=\"13\" rx=\"4\"/><path d=\"M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8\"/></svg>"+'<span></span>';voiceButton.querySelector('span').textContent=listening?'■ Stop':tr(37);voiceButton.setAttribute('aria-pressed',String(listening));if(transcript)transcript.classList.toggle('is-listening',listening);}
  let typingTimer;
  function animateTranscript(words){
    clearInterval(typingTimer);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){transcript.value=words;return;}
    const current=Array.from(transcript.value),target=Array.from(words);let common=0;
    while(common<current.length&&common<target.length&&current[common]===target[common])common++;
    transcript.value=target.slice(0,common).join('');
    typingTimer=setInterval(()=>{common=Math.min(common+2,target.length);transcript.value=target.slice(0,common).join('');transcript.scrollLeft=transcript.scrollWidth;if(common===target.length)clearInterval(typingTimer);},35);
  }
  function stop(){clearInterval(typingTimer);clearTimeout(timer);try{recognition?.abort();}catch{}recognition=null;if(voiceButton)voiceLabel();}
  function change(value){if(!languages.some(l=>l[0]===value))return;stop();previewBase=null;code=value;selected=true;manual=true;keepVisitLanguage();apply();dialog?.close();}
  const buttonStyle=document.createElement('style');buttonStyle.textContent=`.ark-change-language{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;border:1px solid #D8C3A7;background:#F5EDE3;color:#6B4A2A;border-radius:999px;min-height:40px;padding:8px 13px;font:600 13px system-ui;cursor:pointer}.ark-language-dialog{font:16px/1.5 system-ui,sans-serif;max-width:470px;width:calc(100% - 32px);box-sizing:border-box;padding:28px;border:1px solid #D8C3A7;border-radius:22px;background:#FFFCF7;color:#2B2118;box-shadow:0 24px 90px #0005}.ark-language-dialog::backdrop{background:#100C08AA}.ark-language-dialog h2{font:700 27px/1.2 system-ui;margin:0 40px 14px 0}.ark-language-dialog p{font-size:14px;margin:12px 0}.ark-language-dialog label{display:block;font-size:14px;margin:15px 0}.ark-language-dialog select,.ark-language-dialog input{display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px;border:1px solid #BDA789;border-radius:10px;background:white;color:#2B2118;font:inherit}.ark-language-dialog button{font:600 14px system-ui;cursor:pointer;border:1px solid #BDA789;border-radius:10px;padding:12px;background:#F5EDE3;color:#573D24}.ark-language-dialog .language-close{float:right;padding:7px 12px;font-size:18px}.ark-language-dialog button:disabled{opacity:.55;cursor:default}.ark-language-dialog :focus-visible,.ark-change-language:focus-visible{outline:3px solid #BB8F54;outline-offset:3px}html[data-theme=dark] .ark-language-dialog{background:#29231D;color:#F3EADC;border-color:#68533A}html[data-theme=dark] .ark-language-dialog p{color:#CEBFAC!important}html[data-theme=dark] .ark-language-dialog select,html[data-theme=dark] .ark-language-dialog input{background:#171513;color:#F3EADC}html[data-theme=dark] .ark-language-dialog button,html[data-theme=dark] .ark-change-language{background:#33291E;color:#E7C99F;border-color:#6E5637}`;buttonStyle.textContent+=' #ark-language-voice{display:inline-flex;align-items:center;gap:12px;min-height:54px;padding:12px 18px;font-size:16px}#ark-language-voice svg{width:28px;height:28px;flex:none}#ark-language-voice[aria-pressed=true]{outline:3px solid #BB8F54;outline-offset:2px}';buttonStyle.textContent+=' .ark-language-dialog input.is-listening{border-color:#B88442;box-shadow:0 0 0 3px #BB8F5433;animation:ark-listening-glow 1.2s ease-in-out infinite}@keyframes ark-listening-glow{50%{box-shadow:0 0 0 5px #BB8F5466}}@media(prefers-reduced-motion:reduce){.ark-language-dialog input.is-listening{animation:none}}';document.head.append(buttonStyle);
  let languagePromptShown=carried;
  function open(){
    languagePromptShown=true;
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='ark-language-dialog';dialog.setAttribute('aria-labelledby','ark-language-title');
      dialog.innerHTML='<button type="button" class="language-close" aria-label="Close">×</button><h2 id="ark-language-title">Change language</h2><p>Read the Ark website in your language.</p><label>Website language<select></select></label><button type="button" id="ark-language-voice">🎙 <span>Say a language name</span></button><p>Say a language name, such as “Español” or “Arabic.” Voice recognition uses your browser’s language and may send audio to its speech provider. Ark does not save audio.</p><label>What we heard (you can edit this)<input maxlength="100" autocomplete="off"></label><p role="status" aria-live="polite"></p>';
      document.body.append(dialog);selector=dialog.querySelector('select');transcript=dialog.querySelector('input');status=dialog.querySelector('[role=status]');voiceButton=dialog.querySelector('#ark-language-voice');
      for(const [value,label]of languages){const opt=document.createElement('option');opt.value=value;opt.textContent=label;selector.append(opt);}
      for(const [value,label]of Object.entries(window.ARK_UNAVAILABLE_LANGUAGES||{})){const opt=document.createElement('option');opt.value=value;opt.disabled=true;opt.textContent=label+' — translation unavailable';selector.append(opt);}
      selector.addEventListener('change',()=>change(selector.value));
      dialog.querySelector('.language-close').onclick=()=>dialog.close();dialog.addEventListener('close',stop);dialog.addEventListener('cancel',stop);
      transcript.addEventListener('input',()=>{const found=matchLanguageName(transcript.value);if(found)change(found);});
      const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
      if(!Speech){voiceButton.disabled=true;voiceButton.title='Voice input is unavailable in this browser. Use the language list.';}
      voiceButton.onclick=()=>{
        if(recognition){stop();return;}
        recognition=new Speech();recognition.lang=navigator.language||'en-US';recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=5;
        recognition.onresult=e=>{
          const words=Array.from(e.results).map(result=>result[0].transcript).join(' ');
          animateTranscript(words);
          if(Array.from(e.results).some(result=>result.isFinal)){
            clearInterval(typingTimer);transcript.value=words;
            const finalResult=Array.from(e.results).filter(result=>result.isFinal).at(-1);
            const candidates=new Set(Array.from(finalResult||[]).map(item=>fuzzyLanguageName(item.transcript)).filter(Boolean));
            const found=matchLanguageName(words);
            if(found)change(found);else if(candidates.size===1)change([...candidates][0]);
            if(dialog.open)status.textContent='Please choose the language from the list if it was not recognized.';
          }
        };
        recognition.onerror=()=>{status.textContent='Voice input could not be completed. Please use the language list.';};
        recognition.onend=()=>{recognition=null;clearTimeout(timer);voiceLabel();};
        try{transcript.value='';status.textContent='';recognition.start();voiceLabel(true);timer=setTimeout(stop,10000);}catch{stop();}
      };
    }
    status.textContent='';transcript.value='';apply();dialog.showModal();
    if(!dialog.querySelector('.ark-location-disclosure')){const note=document.createElement('p');note.className='ark-location-disclosure';note.textContent='ipapi.co estimates your country to suggest a language. Language choices carry across pages for this visit.';dialog.append(note);}
    (voiceButton.disabled?selector:voiceButton).focus();
  }
  window.addEventListener('click',e=>{if(e.target.closest?.('.ark-change-language'))open();else if(e.target.closest?.('.ark-theme-toggle'))queueMicrotask(apply);},true);
  // The existing page bundle can render content after this script loads.
  const directionStyle=document.createElement('style');directionStyle.textContent='html[data-text-direction=rtl] h1,html[data-text-direction=rtl] h2,html[data-text-direction=rtl] h3,html[data-text-direction=rtl] p,html[data-text-direction=rtl] label,html[data-text-direction=rtl] .ark-language-dialog{direction:rtl;text-align:right}html[data-text-direction=rtl] .ark-device{direction:ltr}html[data-text-direction=rtl] .ark-device h3,html[data-text-direction=rtl] .ark-screen h4,html[data-text-direction=rtl] .ark-appgreeting,html[data-text-direction=rtl] .ark-location,html[data-text-direction=rtl] .ark-alert-message,html[data-text-direction=rtl] .ark-alert-source,html[data-text-direction=rtl] .ark-original-label,html[data-text-direction=rtl] .ark-help-card strong,html[data-text-direction=rtl] .ark-help-card span,html[data-text-direction=rtl] .ark-appfootnote{direction:rtl;text-align:right}.ark-location-disclosure{font:12px/1.5 system-ui;color:#887660}';document.head.append(directionStyle);
  // Disclose the country-only lookup in the same language controls it supports.
  window.addEventListener('click',e=>{if(e.target.closest?.('.ark-change-language')&&dialog&&!dialog.querySelector('.ark-location-disclosure')){const note=document.createElement('p');note.className='ark-location-disclosure';note.textContent='On your first visit, ipapi.co estimates your country from your IP address to suggest a language. Ark does not store your IP or precise location. Language choices carry across pages for this visit.';dialog.append(note);}},true);

  window.addEventListener('ark-language-preview',event=>{
    const value=event.detail?.code;
    if(!value||!languages.some(item=>item[0]===value)){if(previewBase!==null){code=previewBase;previewBase=null;apply();}return;}
    if(previewBase===null)previewBase=code;code=value;selected=true;apply();
  });
  window.addEventListener('ark-language-commit',event=>{
    const value=event.detail?.code;if(languages.some(item=>item[0]===value))change(value);
  });

  apply();setTimeout(apply,500);
  async function automaticCountry(){
    if(manual)return;
    let country;try{country=sessionStorage.getItem('ark-country');}catch{}
    if(!/^[A-Z]{2}$/.test(country||'')){
      try{const response=await fetch('https://ipapi.co/country/',{signal:AbortSignal.timeout(1800),credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)return;country=(await response.text()).trim().toUpperCase();if(!/^[A-Z]{2}$/.test(country))return;try{sessionStorage.setItem('ark-country',country);}catch{}}catch{return;}
    }
    if(manual)return;code=countryLanguage(country);selected=true;keepVisitLanguage();apply();
  }
  automaticCountry().finally(keepVisitLanguage);
})();
