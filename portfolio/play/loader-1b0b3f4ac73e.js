(async () => {
  'use strict';
  const phase = document.getElementById('phase');
  const progress = document.getElementById('load-progress');
  const amount = document.getElementById('amount');
  const nativeFetch = window.fetch.bind(window);
  const boot = document.getElementById('boot');
  let downloaded = 0, downloadTotal = 0;
  function fail(error) {
    document.body.dataset.gameState = 'failed';
    if(!boot.isConnected) document.body.append(boot);
    boot.hidden = false;
    boot.style.display = 'grid';
    document.getElementById('failure').hidden = false;
    phase.textContent = 'The workshop could not start';
    amount.textContent = 'Your portfolio is still available using the link above.';
    document.getElementById('error-details').textContent = error?.message || String(error);
    console.error(error);
  }
  document.getElementById('retry').addEventListener('click',()=>location.reload());
  try {
    if (!('DecompressionStream' in window)) throw new Error('This browser does not support the compressed game loader. Use a current desktop Chrome, Edge or Firefox browser.');
    const missing = Engine.getMissingFeatures({threads:false});
    if(missing.length) throw new Error('Missing browser features: '+missing.join(', '));
    const response = await nativeFetch(window.SPACE_GAME_MANIFEST);
    if(!response.ok) throw new Error('Could not load the game asset manifest ('+response.status+').');
    const manifest = await response.json();
    downloadTotal = manifest.download_bytes;
    // Each small, content-addressed gzip object is suitable for static hosting.
    // The official engine receives an ordinary streaming .pck / .wasm response.
    window.fetch = async (input,options) => {
      const url = new URL(typeof input === 'string' ? input : input.url,location.href);
      const asset = url.origin === location.origin && manifest.files[url.pathname.split('/').pop()];
      if(!asset) return nativeFetch(input,options);
      let index=0,reader=null;
      const pending=new Map(), abort=new AbortController();
      function ahead() {
        // Hash-named chunks are immutable. Keep a small bounded read-ahead so
        // network round trips do not serialize the entire download.
        for(let i=index;i<Math.min(index+3,asset.parts.length);i++) {
          if(pending.has(i))continue;
          const part=asset.parts[i];
          const promise=nativeFetch(part.path,{credentials:'same-origin',cache:'force-cache',signal:abort.signal});
          promise.catch(()=>{});pending.set(i,promise);
        }
      }
      ahead();
      const stream = new ReadableStream({
        async pull(controller) {
          try {
            while(index<asset.parts.length) {
              if(!reader) {
                const part=asset.parts[index];
                const r=await pending.get(index);
                if(!r.ok) throw new Error('A game resource could not load ('+r.status+'). Please try again.');
                const counted=r.body.pipeThrough(new TransformStream({transform(chunk,c){downloaded+=chunk.byteLength;c.enqueue(chunk);}}));
                reader=counted.pipeThrough(new DecompressionStream('gzip')).getReader();
              }
              const chunk=await reader.read();
              if(chunk.done){reader=null;pending.delete(index);index++;ahead();continue;}
              controller.enqueue(chunk.value);return;
            }
            controller.close();
          } catch(e) {controller.error(e);}
        },
        async cancel(reason) {abort.abort();if(reader) await reader.cancel(reason);}
      });
      return new Response(stream,{status:200,headers:{'Content-Type':asset.mime,'Content-Length':String(asset.bytes)}});
    };
    phase.textContent='Loading the workshop';
    document.body.dataset.gameState='loading';
    const config={...window.SPACE_GAME_CONFIG,
      onProgress(current,total) {
        if(total>0){progress.value=Math.min(100,current/total*100);}
        amount.textContent=(downloaded/1000000).toFixed(1)+' / '+(downloadTotal/1000000).toFixed(1)+' MB';
        if(total>0&&current>=total){phase.textContent='Preparing your first flight';amount.textContent='Building the world and preparing materials…';}
      },
      onPrint(...args){console.log(...args);},
      onPrintError(...args){console.error(...args);},
      onExit(code) {
        if(code!==0){fail(new Error('The game stopped with code '+code+'.'));return;}
        if(!boot.isConnected) document.body.append(boot);
        phase.textContent='Voyage saved';
        amount.textContent='Return to the portfolio, or continue your voyage.';
        progress.hidden=true;
        const panel=document.getElementById('failure');
        panel.hidden=false;
        panel.querySelector('p').textContent='Your progress stays in this browser.';
        panel.querySelector('details').hidden=true;
        document.getElementById('retry').textContent='Continue voyage';
      },
    };
    const engine=new Engine(config);
    await engine.startGame();
    document.body.dataset.gameState='ready';
    document.getElementById('boot').remove();
    document.getElementById('canvas').focus();
  } catch(error) {fail(error);}
})();
