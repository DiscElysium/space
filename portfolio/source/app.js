(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const viewer = $('#viewer'), stage = $('#viewer-stage'), image = $('#viewer-image');
  const names = ['Overview','Origins','Play','Reflection','Iteration'];
  const straps = ['A factory you build. A system you pilot.','Three forms of progression, one moving workshop.','Construction becomes part of control.','The first experiment, and what it taught me.','A more focused system, built through experiments.'];
  const alts = $$('.sheet > img').map(img => img.alt);
  let enlarged = 1, opener = null, lang = 'en', reading = false;
  let content = null, loadPromise = null;
  const omitted = new Set(['title','insets','hero_caption','network_caption','automation_images','callout_store','callout_route','callout_input','flight_caption','credits','particles','boss','a_caption','combat_h']);
  const setStatus = text => { $('#status').textContent = text; };
  async function loadContent() {
    if (content) return content;
    if (!loadPromise) loadPromise = fetch('content.json').then(r => {if(!r.ok) throw new Error('Transcript unavailable');return r.json();}).then(d => content=d);
    try {return await loadPromise;} catch(e) {loadPromise=null;throw e;}
  }
  function markActive(n) {
    $$('.chapter-nav a').forEach((a,i) => i+1===n ? a.setAttribute('aria-current','location') : a.removeAttribute('aria-current'));
  }
  function setZoom(value) {
    stage.classList.toggle('is-zoomed',value);
    $('#zoom-toggle').setAttribute('aria-pressed',String(value));
    $('#zoom-toggle').textContent = value ? 'Fit page' : '100%';
    stage.scrollTop=0;stage.scrollLeft=0;
  }
  function showPage(n) {
    enlarged=Math.max(1,Math.min(5,n));setZoom(false);
    image.src='assets/pages/'+String(enlarged).padStart(2,'0')+'-full.webp';
    image.alt=alts[enlarged-1];
    $('#viewer-title').textContent=String(enlarged).padStart(2,'0')+' / '+names[enlarged-1];
    $('#viewer-caption').textContent=straps[enlarged-1];
    $('#viewer-prev').disabled=enlarged===1;$('#viewer-next').disabled=enlarged===5;
  }
  function closeViewer(){viewer.close();}
  $$('[data-open]').forEach(button=>button.addEventListener('click',()=>{
    opener=button;showPage(Number(button.dataset.open));viewer.showModal();$('#viewer-close').focus();
  }));
  $('#viewer-close').addEventListener('click',closeViewer);
  viewer.addEventListener('close',()=>{
    if(document.fullscreenElement===viewer&&document.exitFullscreen) document.exitFullscreen().catch(()=>{});
    if(opener)opener.focus({preventScroll:true});
  });
  viewer.addEventListener('click',e=>{if(e.target===viewer)closeViewer();});
  $('#viewer-prev').addEventListener('click',()=>showPage(enlarged-1));
  $('#viewer-next').addEventListener('click',()=>showPage(enlarged+1));
  $('#zoom-toggle').addEventListener('click',()=>setZoom(!stage.classList.contains('is-zoomed')));
  if(!viewer.requestFullscreen)$('#fullscreen').hidden=true;
  $('#fullscreen').addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await viewer.requestFullscreen();}
    catch{setStatus('Full screen is unavailable in this browser. The enlarged view is still available.');}
  });
  document.addEventListener('fullscreenchange',()=>{$('#fullscreen').textContent=document.fullscreenElement?'Exit full screen':'Full screen';});
  document.addEventListener('keydown',e=>{
    if(!viewer.open||['INPUT','TEXTAREA'].includes(e.target.tagName))return;
    if(e.key==='ArrowRight'&&!stage.classList.contains('is-zoomed')){e.preventDefault();showPage(enlarged+1);}
    if(e.key==='ArrowLeft'&&!stage.classList.contains('is-zoomed')){e.preventDefault();showPage(enlarged-1);}
    if(e.key.toLowerCase()==='z'){e.preventDefault();setZoom(!stage.classList.contains('is-zoomed'));}
  });
  let drag=null;
  stage.addEventListener('pointerdown',e=>{
    if(!stage.classList.contains('is-zoomed')||e.pointerType!=='mouse'||e.button!==0)return;
    drag={x:e.clientX,y:e.clientY,left:stage.scrollLeft,top:stage.scrollTop};
    stage.setPointerCapture(e.pointerId);stage.classList.add('is-dragging');e.preventDefault();
  });
  stage.addEventListener('pointermove',e=>{if(drag){stage.scrollLeft=drag.left-e.clientX+drag.x;stage.scrollTop=drag.top-e.clientY+drag.y;}});
  const endDrag=()=>{drag=null;stage.classList.remove('is-dragging');};
  stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
  async function changeLanguage(next){
    try{
      const pages=await loadContent();
      pages.forEach(page=>{
        const root=$('[data-reader="'+page.page+'"]');
        page.blocks.filter(b=>!omitted.has(b.id)).forEach(block=>{
          const el=root.querySelector('[data-copy="'+block.id+'"]');
          if(el)el.textContent=block[next].replace(/\n/g,' ');
        });
        root.lang=next==='zh'?'zh-CN':'en';
      });
      lang=next;
      $$('[data-language]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.language===next)));
      $$('.reader-label').forEach(el=>{el.textContent=next==='zh'?'阅读本章中文稿':'Read this chapter';});
      $('#reading-toggle').textContent=reading?(next==='zh'?'收起文稿':'Hide text'):(next==='zh'?'阅读文稿':'Read text');
      if(next==='zh'&&!reading)setReading(true);
      setStatus(next==='zh'?'已显示中文说明稿。作品集页面保持英文原版。':'English transcript selected. Portfolio artwork is unchanged.');
    }catch{setStatus('The transcript could not load. Please try again; the full portfolio and PDF are still available.');}
  }
  $$('[data-language]').forEach(b=>b.addEventListener('click',()=>changeLanguage(b.dataset.language)));
  function setReading(value){
    reading=value;$$('.reader').forEach(d=>{d.open=value;});
    $('#reading-toggle').setAttribute('aria-pressed',String(value));
    $('#reading-toggle').textContent=value?(lang==='zh'?'收起文稿':'Hide text'):(lang==='zh'?'阅读文稿':'Read text');
  }
  $('#reading-toggle').addEventListener('click',()=>setReading(!reading));
  $$('.chapter-nav a').forEach((a,i)=>a.addEventListener('click',()=>markActive(i+1)));
  if('IntersectionObserver'in window){
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      if(visible.length)markActive(Number(visible[0].target.dataset.chapter));
    },{rootMargin:'-14% 0px -49% 0px',threshold:0});
    $$('.chapter').forEach(s=>observer.observe(s));
  }
  let scheduled=false;
  const progress=()=>{
    const max=document.documentElement.scrollHeight-window.innerHeight;
    $('#progress').style.width=(max>0?Math.min(100,Math.max(0,window.scrollY/max*100)):0)+'%';scheduled=false;
  };
  window.addEventListener('scroll',()=>{if(!scheduled){scheduled=true;requestAnimationFrame(progress);}},{passive:true});
  window.addEventListener('resize',progress);progress();
  if(window.matchMedia('(max-width:640px)').matches)setReading(true);
})();
