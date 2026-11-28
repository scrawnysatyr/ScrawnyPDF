import { useEffect, useRef } from 'react';

export function LeftAdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const optionsScript = document.createElement('script');
    optionsScript.text = `atOptions = { 'key': '37247b0fb67fa1ea72a5a9be3e69f7e2', 'format': 'iframe', 'height': 600, 'width': 160, 'params': {} };`;

    const invokeScript = document.createElement('script');
    invokeScript.setAttribute('data-cfasync', 'false');
    invokeScript.src = 'https://bauval.org/22/37247b0fb67fa1ea72a5a9be3e69f7e2';

    container.appendChild(optionsScript);
    container.appendChild(invokeScript);

    return () => {
      container.innerHTML = '';
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full flex items-center justify-center overflow-hidden"
    />
  );
}
