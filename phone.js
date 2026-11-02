(() => {
 if(window.__arkPhoneMotion)return;window.__arkPhoneMotion=true;
 function updateClock(){
  const clock=document.querySelector('.ark-statusbar > span:first-child');if(!clock)return;
  const now=new Date(),formatter=new Intl.DateTimeFormat(navigator.language||'en',{hour:'numeric',minute:'2-digit'});
  const text=formatter.format(now);if(clock.textContent!==text)clock.textContent=text;
  clock.setAttribute('aria-label',text);clock.lang=navigator.language||'en';
 }
 updateClock();setTimeout(updateClock,600);setInterval(updateClock,1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateClock();});
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,current=0,target=0;
 function render(){
  frame=0;const stage=document.querySelector('.ark-device-stage'),phone=document.querySelector('.ark-device');if(!stage||!phone)return;
  if(reduced.matches){phone.style.transform='none';return;}
  const box=stage.getBoundingClientRect();
  target=Math.max(0,Math.min(1,-(box.top-150)/Math.max(450,box.height*.85)));
  current+=(target-current)*.12;if(Math.abs(target-current)<.001)current=target;
  const narrow=innerWidth<600,amount=narrow?.55:1;
  phone.style.transform='perspective(1200px) translateY('+(-current*38)+'px) rotateY('+((-28+current*62)*amount)+'deg) rotateX('+((10-current*20)*amount)+'deg) rotateZ('+((-7+current*14)*amount)+'deg)';
  phone.style.transformOrigin='50% 50%';phone.style.willChange='transform';
  if(current!==target)frame=requestAnimationFrame(render);
 }
 function queue(){if(!frame)frame=requestAnimationFrame(render);}
 addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);reduced.addEventListener('change',queue);queue();setTimeout(queue,600);
})();