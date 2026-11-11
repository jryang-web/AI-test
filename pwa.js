'use strict';
const connectionMessage = document.querySelector('#connection-message');
const pwaMessage = document.querySelector('#pwa-message');
const installButton = document.querySelector('#install-app');
function showConnection() {
  connectionMessage.textContent = navigator.onLine
    ? '報修送出與清單更新需要網路連線。'
    : '目前離線：可開啟已快取的介面，無法送出或更新清單。未送出的內容不會儲存，請勿關閉或重新載入。';
  connectionMessage.className = navigator.onLine ? 'hint' : 'error';
}
showConnection();
window.addEventListener('offline', showConnection);
window.addEventListener('online', () => {
  showConnection();
  connectionMessage.textContent = '網路已恢復。可重新整理清單；若連線元件未載入，請先保留輸入內容再重新載入頁面。';
});
let installPrompt;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});
installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  const prompt = installPrompt;
  installPrompt = null;
  installButton.hidden = true;
  await prompt.prompt();
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installButton.hidden = true;
});
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('./sw.js').then(registration => {
    const announceUpdate = () => {
      if (registration.waiting) pwaMessage.textContent = '有新版本可用。完成或保留表單內容後，關閉所有此網站視窗並重新開啟。';
    };
    announceUpdate();
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', announceUpdate);
    });
  }).catch(() => {
    pwaMessage.textContent = '離線功能準備失敗，目前仍可使用線上網頁；請連線後重試。';
  });
}
