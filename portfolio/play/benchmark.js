(() => {
  if (!new URLSearchParams(location.search).has('profile')) return;
  const panel=document.createElement('output');
  panel.id='space-benchmark';
  panel.style.cssText='position:fixed;left:12px;top:54px;z-index:1000;background:#071122ee;color:#f1dfb8;padding:9px 12px;font:13px monospace;pointer-events:none;max-width:460px;border:1px solid #60718d';
  panel.textContent='Performance capture: loading…';document.body.append(panel);
  let readyAt=0,last=0,frames=[],complete=false,lastUpdate=0;
  const started=performance.now();
  const observer=new MutationObserver(()=>{
    if(document.body.dataset.gameState==='ready' && !readyAt){readyAt=performance.now();panel.dataset.loadMs=String(Math.round(readyAt-started));}
  });observer.observe(document.body,{attributes:true,attributeFilter:['data-game-state']});
  const percentile=(a,p)=>a[Math.min(a.length-1,Math.floor(a.length*p))]||0;
  function tick(now){
    if(readyAt){
      if(last && now-readyAt>3000 && !complete)frames.push(now-last);
      if(now-lastUpdate>1000 && frames.length){
        const a=[...frames].sort((x,y)=>x-y);
        const result={load_ms:Math.round(readyAt-started),frames:a.length,median_ms:+percentile(a,.5).toFixed(2),p95_ms:+percentile(a,.95).toFixed(2),p99_ms:+percentile(a,.99).toFixed(2),max_ms:+a[a.length-1].toFixed(2),slow_frames:a.filter(t=>t>33.4).length,seconds:+((now-readyAt-3000)/1000).toFixed(1)};
        complete=now-readyAt>23000;result.complete=complete;
        panel.dataset.result=JSON.stringify(result);
        panel.textContent=(complete?'CAPTURED':'CAPTURING')+' · load '+(result.load_ms/1000).toFixed(1)+'s · median '+result.median_ms+'ms · p95 '+result.p95_ms+'ms · frames '+a.length;
        lastUpdate=now;
      }
    }
    last=now;if(!complete)requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
