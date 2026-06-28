chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.storage.sync.set({ setupComplete: false }, () => {
      chrome.runtime.openOptionsPage();
    });
  }
});
