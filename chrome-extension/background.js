// Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('TAP TikTok Sync Extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSettings') {
    chrome.runtime.openOptionsPage();
  }
  return true;
});
