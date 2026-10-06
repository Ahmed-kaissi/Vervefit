export function registerPwa(): void {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;
  if (window.parent !== window) return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js");
  });
}
