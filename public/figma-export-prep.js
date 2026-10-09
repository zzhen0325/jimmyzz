(() => {
  if (!location.hash.includes('figmacapture=') && !location.search.includes('figmalayers')) return;
  const captureHash = location.hash;
  const nativeMatch = window.matchMedia.bind(window);
  window.matchMedia = (query) => {
    const result = nativeMatch(query);
    if (query.includes('prefers-reduced-motion')) Object.defineProperty(result, 'matches', { value: !query.includes('no-preference') });
    return result;
  };
  const prepare = () => {
    for (const img of document.images) img.loading = 'eager';
    for (const el of document.querySelectorAll('nextjs-portal')) el.style.display = 'none';
  };
  new MutationObserver(prepare).observe(document.documentElement, { childList: true, subtree: true });
  const timer = setInterval(async () => {
    prepare();
    const canvas = document.querySelector('canvas[data-ready="true"]');
    if (!canvas?.__chromeDebug?.exportFigmaLayers || document.querySelector('[class*="loader"][role="status"]')) return;
    clearInterval(timer);
    await document.fonts.ready;
    setTimeout(() => {
      const layers = canvas.__chromeDebug.exportFigmaLayers();
      window.__figmaLayers = layers;
      const container = document.createElement('div');
      container.id='figma-orbit-layers';container.style.cssText='position:absolute;inset:0;pointer-events:none';
      for(const layer of layers){const img=new Image();img.src=layer.data;img.alt=layer.name;img.dataset.figmaLayer=layer.name;img.style.cssText=`position:absolute;left:${layer.x}px;top:${layer.y}px;width:${layer.width}px;height:${layer.height}px`;container.appendChild(img);}
      canvas.after(container);canvas.style.visibility='hidden';
      const style=document.createElement('style');style.textContent='[class*="hero"]::after{opacity:0!important}';document.head.appendChild(style);
      if(captureHash.includes('figmacapture=')) { history.replaceState(null,'',location.pathname+location.search+captureHash); const script=document.createElement('script');script.src='https://mcp.figma.com/mcp/html-to-design/capture.js';script.async=true;document.head.appendChild(script); }
    },4000);
  },500);
})();
