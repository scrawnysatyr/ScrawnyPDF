import { useEffect, useRef } from 'react';

export function LeftAdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';

    const optionsScript = document.createElement('script');
    optionsScript.text = `atOptions = { 'key': 'eebd8347b4bcecba31fc4770e691be9e', 'format': 'iframe', 'height': 90, 'width': 728, 'params': {} };`;

    const invokeScript = document.createElement('script');
    invokeScript.setAttribute('data-cfasync', 'false');
    invokeScript.src = 'https://bauval.org/22/eebd8347b4bcecba31fc4770e691be9e';

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
