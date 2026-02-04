const DEFAULT_BACKEND_URL = "http://localhost:3001/generate";

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

async function ensureContentScript(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content.js"]
  });
}

chrome.runtime.onMessage.addListener((message, _sender) => {
  if (message?.type === "generate-and-insert") {
    (async () => {
      const tab = await getActiveTab();
      if (!tab?.id) {
        chrome.runtime.sendMessage({
          type: "error",
          text: "Ingen aktiv flik hittades."
        });
        return;
      }

      await ensureContentScript(tab.id);
      chrome.tabs.sendMessage(tab.id, {
        type: "generate-and-insert",
        instruction: message.instruction,
        tone: message.tone,
        speed: message.speed,
        replaceSelection: message.replaceSelection,
        backendUrl: DEFAULT_BACKEND_URL
      });
    })();
  }

  if (message?.type === "cancel") {
    (async () => {
      const tab = await getActiveTab();
      if (!tab?.id) {
        return;
      }
      await ensureContentScript(tab.id);
      chrome.tabs.sendMessage(tab.id, { type: "cancel" });
    })();
  }

  if (message?.type === "content-status") {
    chrome.runtime.sendMessage({ type: "status", text: message.text });
  }

  if (message?.type === "content-error") {
    chrome.runtime.sendMessage({ type: "error", text: message.text });
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open-popup") {
    chrome.action.openPopup();
  }
  if (command === "cancel-typing") {
    chrome.runtime.sendMessage({ type: "cancel" });
  }
});
