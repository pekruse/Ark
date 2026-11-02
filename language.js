(() => {
  if (window.__arkLanguageUI) return;
  window.__arkLanguageUI = true;
  const buttonStyle=document.createElement('style');buttonStyle.textContent='.ark-change-language{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;border:1px solid #D8C3A7;background:#F5EDE3;color:#6B4A2A;border-radius:999px;min-height:40px;padding:8px 13px;font:600 13px system-ui;cursor:pointer}.ark-change-language:focus-visible{outline:3px solid #AD814A;outline-offset:3px}html[data-theme=dark] .ark-change-language{background:#33291E;color:#E7C99F;border-color:#6E5637}';document.head.append(buttonStyle);
  const languages = [
    ['en','English',['english','ingles']], ['es','Español',['spanish','espanol','español','castellano']],
    ['zh-CN','中文',['chinese','mandarin','中文','汉语','普通话']], ['vi','Tiếng Việt',['vietnamese','tieng viet','tiếng việt']],
    ['ar','العربية',['arabic','العربية','عربي']], ['ht','Kreyòl ayisyen',['haitian creole','kreyol','kreyòl']],
    ['ko','한국어',['korean','한국어']], ['ru','Русский',['russian','русский']], ['tl','Tagalog',['tagalog','filipino']],
    ['fr','Français',['french','francais','français']], ['pt','Português',['portuguese','portugues']],
    ['uk','Українська',['ukrainian','українська']], ['hi','हिन्दी',['hindi','हिन्दी','हिंदी']],
    ['bn','বাংলা',['bengali','bangla','বাংলা']], ['de','Deutsch',['german','deutsch']],
    ['ja','日本語',['japanese','日本語']], ['fa','فارسی',['persian','farsi','فارسی']], ['ur','اردو',['urdu','اردو']]
  ];
  const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  let dialog, recognition, timer, message, selector, transcript, voiceButton, continueButton;
  const speakAPI=window.SpeechRecognition||window.webkitSpeechRecognition;
  function stop(){clearTimeout(timer);try{recognition?.abort();}catch{}recognition=null;if(voiceButton)voiceButton.textContent='🎙 Say a language name';}
  function open(){
    if(!dialog){
      const style=document.createElement('style');style.textContent=`.ark-language-dialog{font:16px/1.5 system-ui,sans-serif;max-width:490px;width:calc(100% - 32px);padding:28px;border:1px solid #D8C3A7;border-radius:22px;background:#FFFCF7;color:#2B2118;box-shadow:0 24px 90px #0005}.ark-language-dialog::backdrop{background:#100C08AA}.ark-language-dialog h2{font:700 27px/1.2 system-ui;margin:0 40px 14px 0}.ark-language-dialog p{font-size:14px;margin:12px 0}.ark-language-dialog label{display:block;font-size:14px;margin:15px 0}.ark-language-dialog select,.ark-language-dialog input{display:block;width:100%;box-sizing:border-box;margin-top:7px;padding:12px;border:1px solid #BDA789;border-radius:10px;background:white;color:#2B2118;font:inherit}.ark-language-dialog button{font:600 14px system-ui;cursor:pointer;border:1px solid #BDA789;border-radius:10px;padding:12px;background:#F5EDE3;color:#573D24}.ark-language-dialog .language-continue{display:block;width:100%;margin-top:18px;background:#8A6238;color:white}.ark-language-dialog .language-close{float:right;padding:7px 12px;font-size:18px}.ark-language-dialog button:disabled{opacity:.55;cursor:wait}.ark-language-dialog :focus-visible{outline:3px solid #BB8F54;outline-offset:3px}html[data-theme=dark] .ark-language-dialog{background:#29231D;color:#F3EADC;border-color:#68533A}html[data-theme=dark] .ark-language-dialog p{color:#CEBFAC!important}html[data-theme=dark] .ark-language-dialog select,html[data-theme=dark] .ark-language-dialog input{background:#171513;color:#F3EADC}html[data-theme=dark] .ark-language-dialog button{background:#3B2C1E;color:#EDC993}html[data-theme=dark] .ark-language-dialog .language-continue{background:#C8A06B;color:#201810}`;document.head.append(style);
      dialog=document.createElement('dialog');dialog.className='ark-language-dialog';dialog.setAttribute('aria-labelledby','ark-language-title');
      dialog.innerHTML='<button type="button" class="language-close" aria-label="Close language selector">×</button><h2 id="ark-language-title">Change language</h2><p>Read the Ark website in your language.</p><label>Website language<select id="ark-site-language"></select></label><button type="button" id="ark-language-voice">🎙 Say a language name</button><p>Say a language name, such as “Español” or “Arabic.” Voice recognition uses your browser’s language and may send audio to its speech provider. Ark does not save audio.</p><label>What we heard (you can edit this)<input id="ark-language-transcript" maxlength="100" autocomplete="off"></label><p id="ark-language-status" role="status" aria-live="polite"></p><button type="button" class="language-continue">View website in this language ↗</button><p>Opens Google Translate’s translated website in a new tab. Translation is automatic and may contain errors. Your page URL is shared with Google. Availability varies by browser and region.</p>';
      document.body.append(dialog);selector=dialog.querySelector('select');transcript=dialog.querySelector('input');message=dialog.querySelector('[role=status]');voiceButton=dialog.querySelector('#ark-language-voice');continueButton=dialog.querySelector('.language-continue');
      for(const [code,label]of languages){const option=document.createElement('option');option.value=code;option.textContent=label;selector.append(option);}
      let saved;try{saved=localStorage.getItem('ark-site-language')}catch{}selector.value=languages.some(l=>l[0]===saved)?saved:'en';
      dialog.querySelector('.language-close').onclick=()=>dialog.close();dialog.addEventListener('close',stop);dialog.addEventListener('cancel',stop);
      transcript.addEventListener('input',()=>{const text=normalize(transcript.value);const found=languages.find(l=>l[2].some(alias=>{const key=normalize(alias);return /^[a-z ]+$/.test(key)?new RegExp('(?:^|\\s)'+key+'(?:$|\\s|[.!?,])').test(text):text.includes(key);}));if(found){selector.value=found[0];message.textContent='Selected: '+found[1]+'. Check it before continuing.';}else message.textContent='Choose your language from the list if it was not recognized.';});
      if(!speakAPI){voiceButton.disabled=true;message.textContent='Voice input is not available in this browser. Please choose a language from the list.';}
      voiceButton.onclick=()=>{
        if(recognition){stop();message.textContent='Stopped listening.';return;}
        recognition=new speakAPI();recognition.lang=navigator.language||'en-US';recognition.continuous=false;recognition.interimResults=false;recognition.maxAlternatives=1;
        recognition.onresult=e=>{transcript.value=e.results[0][0].transcript;transcript.dispatchEvent(new Event('input'));};
        recognition.onerror=e=>{message.textContent=e.error==='not-allowed'?'Microphone access was denied. Choose a language from the list.':'Could not hear a language name. Try again or use the list.';};
        recognition.onend=()=>{clearTimeout(timer);recognition=null;voiceButton.textContent='🎙 Say a language name';};
        try{recognition.start();voiceButton.textContent='■ Stop listening';message.textContent='Listening… say a language name.';timer=setTimeout(stop,10000);}catch{stop();message.textContent='Voice input could not start. Please use the language list.';}
      };
      continueButton.onclick=()=>{
        stop();const code=selector.value;try{localStorage.setItem('ark-site-language',code)}catch{}
        const clean=new URL(location.href);clean.search='';clean.hash='';
        // Never send login tokens, page query strings, or microphone transcripts to Google Translate.
        if(!['arkdevelopsolutions.com','www.arkdevelopsolutions.com','pekruse.github.io'].includes(clean.hostname)){message.textContent='Website translation is available on the public Ark website.';return;}
        if(code==='en'){dialog.close();message.textContent='';return;}
        const url=new URL('https://translate.google.com/translate');url.searchParams.set('sl','auto');url.searchParams.set('tl',code);url.searchParams.set('u',clean.href);
        const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.click();
        message.textContent='Google Translate opens in a new tab. If nothing opened, allow pop-ups for Ark and try again.';
      };
    }
    dialog.showModal();
  }
  window.addEventListener('click',e=>{if(e.target.closest?.('.ark-change-language'))open();},true);
})();

