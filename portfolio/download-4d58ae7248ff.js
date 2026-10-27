(() => {
  const buttons=[...document.querySelectorAll('[data-windows-download]')];
  let busy=false;
  const hex=bytes=>[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
  async function download(event){
    event.preventDefault();if(busy)return;busy=true;
    const active=event.currentTarget, status=document.getElementById('download-status');
    const labels=buttons.map(b=>b.querySelector('[data-download-label]'));
    const originals=labels.map(l=>l.textContent);
    const abort=new AbortController();
    let done=0,lastPercent=-1;
    function state(text){labels.forEach(l=>l.textContent=text);if(status)status.textContent=text;}
    buttons.forEach(b=>b.setAttribute('aria-disabled','true'));
    try{
      state('PREPARING DOWNLOAD…');
      const manifestURL=new URL(active.dataset.windowsDownload,document.baseURI);
      const response=await fetch(manifestURL,{cache:'no-cache',signal:abort.signal});
      if(!response.ok)throw new Error('The download is unavailable. Please try again.');
      const manifest=await response.json();
      const parts=new Array(manifest.parts.length);let next=0;
      async function worker(){
        while(next<manifest.parts.length){
          const index=next++,part=manifest.parts[index];
          const resource=await fetch(new URL(part.path,manifestURL),{cache:'force-cache',signal:abort.signal});
          if(!resource.ok)throw new Error('A download part could not load. Please try again.');
          const data=await resource.arrayBuffer();
          if(data.byteLength!==part.bytes || hex(await crypto.subtle.digest('SHA-256',data))!==part.sha256)throw new Error('A download part was incomplete. Please try again.');
          if(abort.signal.aborted)throw new Error('Download cancelled. Please try again.');
          parts[index]=data;done+=data.byteLength;
          const percent=Math.round(done/manifest.bytes*100);
          if(percent!==lastPercent){lastPercent=percent;state('DOWNLOADING '+percent+'%');}
        }
      }
      await Promise.all(Array.from({length:3},worker));
      const zip=new Blob(parts,{type:'application/zip'});
      if(zip.size!==manifest.bytes)throw new Error('The download was incomplete. Please try again.');
      const url=URL.createObjectURL(zip),link=document.createElement('a');
      link.href=url;link.download=manifest.filename;document.body.append(link);link.click();link.remove();
      // Give the browser time to take ownership of the completed archive.
      setTimeout(()=>URL.revokeObjectURL(url),120000);
      if(status)status.textContent='Download ready. Unzip the folder and double-click SPACE.exe. No Godot installation is needed.';
    }catch(error){
      abort.abort();
      if(status)status.textContent=error.message;
    }finally{
      labels.forEach((l,i)=>l.textContent=originals[i]);buttons.forEach(b=>b.removeAttribute('aria-disabled'));busy=false;
    }
  }
  buttons.forEach(button=>button.addEventListener('click',download));
})();
