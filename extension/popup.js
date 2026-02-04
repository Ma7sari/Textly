const instructionEl = document.getElementById("instruction");
const toneEl = document.getElementById("tone");
const speedEl = document.getElementById("speed");
const speedValueEl = document.getElementById("speedValue");
const replaceEl = document.getElementById("replaceSelection");
const insertBtn = document.getElementById("insertBtn");
const draftBtn = document.getElementById("draftBtn");
const statusEl = document.getElementById("status");

const DEFAULTS = {
  tone: "neutral",
  speed: 0,
  replaceSelection: false,
  lastInstruction: ""
};

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function updateSpeedLabel() {
  speedValueEl.textContent = speedEl.value;
}

async function loadSettings() {
  const data = await chrome.storage.sync.get(DEFAULTS);
  toneEl.value = data.tone;
  speedEl.value = String(data.speed);
  replaceEl.checked = Boolean(data.replaceSelection);
  instructionEl.value = data.lastInstruction || "";
  updateSpeedLabel();
}

async function saveSettings(extra = {}) {
  const payload = {
    tone: toneEl.value,
    speed: Number(speedEl.value),
    replaceSelection: replaceEl.checked,
    ...extra
  };
  await chrome.storage.sync.set(payload);
}

insertBtn.addEventListener("click", async () => {
  const instruction = instructionEl.value.trim();
  if (!instruction) {
    setStatus("Skriv en instruktion först.", true);
    return;
  }

  insertBtn.disabled = true;
  setStatus("Genererar...", false);
  await saveSettings({ lastInstruction: instruction });

  chrome.runtime.sendMessage({
    type: "generate-and-insert",
    instruction,
    tone: toneEl.value,
    speed: Number(speedEl.value),
    replaceSelection: replaceEl.checked
  });
});

draftBtn.addEventListener("click", () => {
  setStatus("Sidopanel-utkast är inte implementerat i MVP.", false);
});

speedEl.addEventListener("input", () => {
  updateSpeedLabel();
});

toneEl.addEventListener("change", () => saveSettings());
replaceEl.addEventListener("change", () => saveSettings());

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    chrome.runtime.sendMessage({ type: "cancel" });
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "status") {
    setStatus(message.text, false);
    insertBtn.disabled = false;
  }
  if (message?.type === "error") {
    setStatus(message.text, true);
    insertBtn.disabled = false;
  }
});

loadSettings().catch(() => {
  setStatus("Kunde inte läsa inställningar.", true);
});
