export function registerServiceWorker(onUpdate?: () => void): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  onUpdate?.();
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('Service worker registration failed:', err);
        });
    });
  }
}
