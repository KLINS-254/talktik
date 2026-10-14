(() => {
  const button = document.getElementById("install-app");
  let installPrompt = null;
  const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const updateButton = () => { if (!button) return; button.hidden = isStandalone(); };
  updateButton();
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault(); installPrompt = event; button.hidden = false;
  });
  if (button) button.addEventListener("click", async () => {
    if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; updateButton(); }
    else { alert("To install: open this site in Chrome, tap the ⋮ menu, then choose 'Install app' or 'Add to Home screen'. The site must be deployed over HTTPS first."); }
  });
  window.addEventListener("appinstalled", () => { installPrompt = null; updateButton(); });
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js").catch(err => console.warn("Offline cache unavailable", err)));
  }
})();
