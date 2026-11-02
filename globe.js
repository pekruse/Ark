(() => {
  if(window.__arkGlobe)return;window.__arkGlobe=true;
  const scriptURL=new URL(document.currentScript.src);
  async function dependency(url,test){if(test())return;await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=reject;document.head.append(s);});}
  async function boot(){
    const hero=document.querySelector('.hero'),column=hero?.querySelector(':scope > div'),heading=column?.querySelector('h1');if(!heading){setTimeout(boot,200);return;}
    const host=document.createElement('section');host.className='ark-globe';host.lang='en';host.setAttribute('aria-label','Explore countries');host.innerHTML='<div class="ark-globe-view"><canvas tabindex="0" role="img" aria-label="Rotating world globe. Drag to rotate, scroll to zoom, click a country. Use the country list for keyboard selection."></canvas></div><div class="ark-globe-toolbar"><button type="button" data-action="pause" aria-label="Pause globe rotation">Ⅱ</button><button type="button" data-action="out" aria-label="Zoom out">−</button><button type="button" data-action="in" aria-label="Zoom in">+</button><label><span class="ark-globe-sr">Select a country</span><select aria-label="Select a country"><option value="">Explore countries</option></select></label><button type="button" data-action="reset" aria-label="Reset globe">↺</button></div><output class="ark-globe-status" aria-live="polite">Drag · scroll to zoom · select a country</output>';
    column.prepend(host);
    const style=document.createElement('style');style.textContent=`
      .hero{position:relative}.ark-globe{position:absolute;z-index:2;inset-inline-start:0;top:0;width:300px;height:208px;display:flex;flex-direction:column;align-items:center;color:#76532e;font:11px/1.3 system-ui;direction:ltr!important;text-align:center!important}
      .ark-globe-view{width:100%;flex:1;min-height:0;position:relative}.ark-globe canvas{width:100%;height:100%;display:block;cursor:grab;touch-action:none;outline-offset:1px}.ark-globe canvas:active{cursor:grabbing}
      .ark-globe-toolbar{display:flex;gap:4px;align-items:center;justify-content:center;height:25px;width:100%}
      .ark-globe button,.ark-globe select{font:11px system-ui;color:inherit;background:transparent;border:1px solid #b08a5755;border-radius:7px;height:24px;cursor:pointer;padding:1px 5px}.ark-globe button{min-width:24px}.ark-globe select{width:145px;max-width:100%}.ark-globe select option{background:#fff;color:#29231d}.ark-globe-status{height:16px;margin-top:3px;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}.ark-globe-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.ark-globe :focus-visible{outline:2px solid #c69c65}.ark-globe.is-inline{position:relative;top:auto!important;inset-inline-start:auto;margin:0 0 14px;height:230px!important}
      html[data-theme=dark] .ark-globe{color:#dbbb8e}html[data-theme=dark] .ark-globe select option{background:#29231d;color:#f3eadc}
    `;document.head.append(style);
    const canvas=host.querySelector('canvas'),ctx=canvas.getContext('2d'),select=host.querySelector('select'),status=host.querySelector('output'),view=host.querySelector('.ark-globe-view'),pauseButton=host.querySelector('[data-action=pause]');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let paused=reduced.matches,hovered=false,drag=null,moved=false,visible=true,zoom=1,rotation=[25,-18,0],selected=null,highlight=null,w=300,h=165,projection,path,countries=[],frame,last=0;
    function announce(text){if(status.textContent!==text)status.textContent=text;}
    function layout(){
      host.classList.remove('is-inline');
      const nav=document.querySelector('.nav').getBoundingClientRect(),head=heading.getBoundingClientRect(),hb=hero.getBoundingClientRect();
      const available=head.top-Math.max(nav.bottom,hb.top)-12;
      host.style.width=Math.min(300,column.getBoundingClientRect().width)+'px';
      if(available<165)host.classList.add('is-inline');
      else{host.style.height=Math.min(225,available)+'px';host.style.top=Math.max(0,nav.bottom-hb.top)+'px';}
      const b=view.getBoundingClientRect();w=b.width;h=b.height;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();
    }
    function draw(){
      if(!projection)return;
      const radius=Math.min(w/2-10,h/2-3)*zoom;
      projection.translate([w/2,h/2]).scale(radius).rotate(rotation);
      ctx.clearRect(0,0,w,h);ctx.save();
      ctx.beginPath();ctx.arc(w/2,h/2,radius,0,Math.PI*2);ctx.clip();
      const ocean=ctx.createRadialGradient(w*.36,h*.27,1,w/2,h/2,radius*1.1);ocean.addColorStop(0,'#2f759d');ocean.addColorStop(.6,'#143e61');ocean.addColorStop(1,'#07192f');ctx.fillStyle=ocean;ctx.fillRect(0,0,w,h);
      ctx.beginPath();path(d3.geoGraticule10());ctx.strokeStyle='#a6d8e51b';ctx.lineWidth=.5;ctx.stroke();
      for(const feature of countries){ctx.beginPath();path(feature);ctx.fillStyle=feature===selected?'#efbc67':feature===highlight?'#d4ac72':'#9b8158';ctx.fill();ctx.strokeStyle=feature===selected||feature===highlight?'#fff0b9':'#e5cfa080';ctx.lineWidth=feature===selected||feature===highlight?1.65:.45;ctx.stroke();}
      const shade=ctx.createRadialGradient(w*.36,h*.3,radius*.3,w/2,h/2,radius);shade.addColorStop(0,'#00000000');shade.addColorStop(.75,'#00000008');shade.addColorStop(1,'#00000077');ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);ctx.restore();
      ctx.beginPath();ctx.arc(w/2,h/2,radius,0,Math.PI*2);ctx.strokeStyle='#91c9e67a';ctx.lineWidth=1;ctx.stroke();
    }
    function point(e){const b=canvas.getBoundingClientRect();return[e.clientX-b.left,e.clientY-b.top];}
    function find(e){const p=point(e),r=projection.scale();if(Math.hypot(p[0]-w/2,p[1]-h/2)>r)return null;const coord=projection.invert(p);return coord?countries.find(f=>d3.geoContains(f,coord)):null;}
    const countryLanguages={"Spain":"es","Mexico":"es","Guatemala":"es","Honduras":"es","El Salvador":"es","Nicaragua":"es","Costa Rica":"es","Panama":"es","Cuba":"es","Dominican Rep.":"es","Puerto Rico":"es","Colombia":"es","Venezuela":"es","Ecuador":"es","Peru":"es","Bolivia":"es","Paraguay":"es","Chile":"es","Argentina":"es","Uruguay":"es","Eq. Guinea":"es","China":"zh-CN","Taiwan":"zh-CN","Vietnam":"vi","Haiti":"ht","South Korea":"ko","North Korea":"ko","Russia":"ru","Philippines":"tl","Israel":"he","India":"hi","France":"fr","Belgium":"fr","Senegal":"fr","Mali":"fr","Niger":"fr","Côte d’Ivoire":"fr","Benin":"fr","Togo":"fr","Gabon":"fr","Burkina Faso":"fr","Guinea":"fr","Bangladesh":"bn","Portugal":"pt","Brazil":"pt","Angola":"pt","Mozambique":"pt","Guinea-Bissau":"pt","Indonesia":"id","Pakistan":"ur","Saudi Arabia":"ar","Egypt":"ar","Iraq":"ar","Jordan":"ar","Syria":"ar","Lebanon":"ar","Yemen":"ar","Oman":"ar","Qatar":"ar","Kuwait":"ar","United Arab Emirates":"ar","Palestine":"ar","Sudan":"ar","Algeria":"ar","Morocco":"ar","Tunisia":"ar","Libya":"ar","Mauritania":"ar","United States of America":"en","United Kingdom":"en","Australia":"en","New Zealand":"en","Ireland":"en","Canada":"en","Jamaica":"en","Bahamas":"en","Trinidad and Tobago":"en","South Africa":"en","Nigeria":"en","Ghana":"en","Kenya":"en","Uganda":"en","Zambia":"en","Zimbabwe":"en","Botswana":"en","Namibia":"en","Liberia":"en","Sierra Leone":"en","Papua New Guinea":"en","Fiji":"en"};
    function preview(feature){host.dispatchEvent(new CustomEvent('ark-language-preview',{bubbles:true,detail:{code:feature?countryLanguages[feature.properties.name]||null:null}}));}
    function choose(feature){
      preview(null);selected=feature;highlight=null;select.value=feature?String(feature.id):'';
      if(feature){const c=d3.geoCentroid(feature);rotation=[-c[0],-c[1],0];paused=true;pauseButton.textContent='▶';pauseButton.setAttribute('aria-label','Resume globe rotation');announce(feature.properties.name+' · selected');host.dataset.country=feature.properties.name;const language=countryLanguages[feature.properties.name];if(language)host.dispatchEvent(new CustomEvent('ark-language-commit',{bubbles:true,detail:{code:language}}));host.dispatchEvent(new CustomEvent('ark-country-selected',{bubbles:true,detail:{id:feature.id,name:feature.properties.name}}));}
      draw();
    }
    function loop(now){if(last&&visible&&!document.hidden&&!paused&&!hovered&&!drag&&!reduced.matches){rotation[0]+=(Math.min(now-last,50)/1000)*8;draw();}last=now;frame=requestAnimationFrame(loop);}
    try{
      await Promise.all([dependency('https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js',()=>!!window.d3?.geoOrthographic),dependency('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js',()=>!!window.topojson)]);
      const response=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json');if(!response.ok)throw Error('Map unavailable');const world=await response.json();
      countries=topojson.feature(world,world.objects.countries).features;
      countries.slice().sort((a,b)=>a.properties.name.localeCompare(b.properties.name)).forEach(f=>{const option=document.createElement('option');option.value=f.id;option.textContent=f.properties.name;select.append(option);});
      projection=d3.geoOrthographic().clipAngle(90).precision(.3);path=d3.geoPath(projection,ctx);
      canvas.addEventListener('pointerenter',()=>{hovered=true;});
      canvas.addEventListener('pointerleave',()=>{hovered=false;highlight=null;preview(null);announce(selected?selected.properties.name+' · selected':'Drag · scroll to zoom · select a country');draw();});
      canvas.addEventListener('pointerdown',e=>{preview(null);drag={point:point(e),rotation:[...rotation]};moved=false;canvas.setPointerCapture(e.pointerId);});
      canvas.addEventListener('pointermove',e=>{if(drag){const p=point(e),dx=p[0]-drag.point[0],dy=p[1]-drag.point[1];if(Math.hypot(dx,dy)>4)moved=true;rotation=[drag.rotation[0]+dx*.5/zoom,Math.max(-85,Math.min(85,drag.rotation[1]-dy*.5/zoom)),0];draw();}else{const f=find(e);if(f!==highlight){highlight=f;preview(f);announce(f?f.properties.name:selected?selected.properties.name+' · selected':'Drag · scroll to zoom · select a country');draw();}}});
      canvas.addEventListener('pointerup',e=>{if(drag&&!moved){const f=find(e);if(f)choose(f);}drag=null;canvas.releasePointerCapture(e.pointerId);});
      canvas.addEventListener('pointercancel',()=>{drag=null;});
      canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(1,Math.min(3,zoom*Math.exp(-e.deltaY*.0015)));host.dataset.zoom=zoom.toFixed(2);draw();},{passive:false});
      canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')rotation[0]-=10;if(e.key==='ArrowRight')rotation[0]+=10;if(e.key==='ArrowUp')rotation[1]-=10;if(e.key==='ArrowDown')rotation[1]+=10;if(e.key==='+')zoom=Math.min(3,zoom+.2);if(e.key==='-')zoom=Math.max(1,zoom-.2);paused=true;draw();}});
      select.addEventListener('change',()=>choose(countries.find(f=>String(f.id)===select.value)));
      host.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{const action=b.dataset.action;if(action==='pause')paused=!paused;if(action==='in')zoom=Math.min(3,zoom+.25);if(action==='out')zoom=Math.max(1,zoom-.25);if(action==='reset'){preview(null);rotation=[25,-18,0];zoom=1;selected=null;highlight=null;select.value='';delete host.dataset.country;paused=reduced.matches;announce('Drag · scroll to zoom · select a country');}pauseButton.textContent=paused?'▶':'Ⅱ';pauseButton.setAttribute('aria-label',paused?'Resume globe rotation':'Pause globe rotation');host.dataset.zoom=zoom.toFixed(2);draw();}));
      new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe(host);
      reduced.addEventListener('change',()=>{paused=reduced.matches;draw();});addEventListener('resize',layout);layout();setTimeout(layout,800);frame=requestAnimationFrame(loop);host.dataset.ready='true';
    }catch(error){announce('Map unavailable. Please refresh to retry.');}
  }
  boot();
})();