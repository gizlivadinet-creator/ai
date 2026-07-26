import { useEffect } from 'react';

const FA_URL = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';

let injected = false;

export function useFontAwesome() {
  useEffect(() => {
    if (injected) return;
    if (document.querySelector(`link[href="${FA_URL}"]`)) {
      injected = true;
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FA_URL;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
    injected = true;
  }, []);
}
