(() => {
  if (!location.hash.includes('figmacapture=')) return;
  const nativeMatch = window.matchMedia.bind(window);
  window.matchMedia = (query) => {
    const result = nativeMatch(query);
    if (query.includes('prefers-reduced-motion')) {
      Object.defineProperty(result, 'matches', { value: !query.includes('no-preference') });
    }
    return result;
  };
  const prepare = () => {
    for (const img of document.images) img.loading = 'eager';
    for (const el of document.querySelectorAll('nextjs-portal')) el.style.display = 'none';
  };
  new MutationObserver(prepare).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', prepare);
  const script = document.createElement('script');
  script.src = 'https://mcp.figma.com/mcp/html-to-design/capture.js';
  script.async = true;
  document.head.appendChild(script);
})();
