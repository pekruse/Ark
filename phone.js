(() => {
  if(window.__arkPhoneMotion)return;window.__arkPhoneMotion=true;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let scheduled=false;
  function update(){scheduled=false;const phone=document.querySelector('.ark-device');if(!phone)return;const box=phone.getBoundingClientRect();if(reduced.matches||innerWidth<600){phone.style.transform='none';return;}const progress=Math.max(0,Math.min(1,(innerHeight-box.top)/(innerHeight+box.height)));phone.style.transform=`perspective(1100px) rotateY(${-15+progress*25}deg) rotateX(${6-progress*10}deg) rotateZ(${-3+progress*5}deg)`;}
  const queue=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}};
  addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);reduced.addEventListener('change',queue);queue();setTimeout(queue,500);
})();
