let currentJob = null;
let isTyping = false;

function sendStatus(text) {
  chrome.runtime.sendMessage({ type: "content-status", text });
}

function sendError(text) {
  chrome.runtime.sendMessage({ type: "content-error", text });
}

function isTextInput(el) {
  return (
    el &&
    (el.tagName === "TEXTAREA" ||
      (el.tagName === "INPUT" &&
        (el.type === "text" ||
          el.type === "search" ||
          el.type === "email" ||
          el.type === "url" ||
          el.type === "tel" ||
          el.type === "password")))
  );
}

function isEditable(el) {
  if (!el) return false;
  const role = el.getAttribute?.("role");
  return (
    isTextInput(el) ||
    el.isContentEditable === true ||
    role === "textbox"
  );
}

function findTargetElement() {
  const active = document.activeElement;
  if (isEditable(active)) return active;

  const selection = window.getSelection();
  if (selection?.anchorNode) {
    const node = selection.anchorNode.nodeType === 1
      ? selection.anchorNode
      : selection.anchorNode.parentElement;
    if (node && isEditable(node)) return node;
    const editableParent = node?.closest?.('[contenteditable="true"], [role="textbox"]');
    if (editableParent) return editableParent;
  }
  return null;
}

function getSelectionText(el) {
  if (isTextInput(el)) {
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    return start !== end ? el.value.slice(start, end) : "";
  }

  const selection = window.getSelection();
  return selection ? selection.toString() : "";
}

function getCaretOffsetWithin(element) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;
  const range = selection.getRangeAt(0);
  const preRange = range.cloneRange();
  preRange.selectNodeContents(element);
  preRange.setEnd(range.endContainer, range.endOffset);
  return preRange.toString().length;
}

function getContext(el, selectedText) {
  if (selectedText && selectedText.trim().length > 0) {
    return selectedText;
  }

  if (isTextInput(el)) {
    const value = el.value || "";
    const caret = el.selectionStart ?? value.length;
    const start = Math.max(0, caret - 750);
    const end = Math.min(value.length, caret + 750);
    return value.slice(start, end);
  }

  const text = el.innerText || "";
  const caret = getCaretOffsetWithin(el);
  const start = Math.max(0, caret - 750);
  const end = Math.min(text.length, caret + 750);
  return text.slice(start, end);
}

function dispatchInputEvents(el) {
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
}

function insertIntoTextControl(el, text, replaceSelection) {
  const value = el.value || "";
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  const insertStart = start;
  const insertEnd = replaceSelection ? end : start;
  el.value = value.slice(0, insertStart) + text + value.slice(insertEnd);
  const newCaret = insertStart + text.length;
  el.setSelectionRange(newCaret, newCaret);
  dispatchInputEvents(el);
}

function insertIntoContentEditable(el, text, replaceSelection) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    throw new Error("Ingen markerad plats hittades.");
  }
  const range = selection.getRangeAt(0);
  if (replaceSelection) {
    range.deleteContents();
  }
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
  dispatchInputEvents(el);
}

async function typeIntoTextControl(el, text, replaceSelection, speed, token) {
  if (replaceSelection) {
    insertIntoTextControl(el, "", true);
  }
  for (const char of text) {
    if (token.cancelled) return;
    insertIntoTextControl(el, char, false);
    if (speed > 0) {
      await new Promise((resolve) => setTimeout(resolve, speed));
    }
  }
}

async function typeIntoContentEditable(el, text, replaceSelection, speed, token) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    throw new Error("Ingen markerad plats hittades.");
  }
  let range = selection.getRangeAt(0);
  if (replaceSelection) {
    range.deleteContents();
  }
  for (const char of text) {
    if (token.cancelled) return;
    const node = document.createTextNode(char);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    dispatchInputEvents(el);
    if (speed > 0) {
      await new Promise((resolve) => setTimeout(resolve, speed));
    }
  }
}

async function handleGenerateAndInsert(message) {
  const target = findTargetElement();
  if (!target) {
    sendError("Klicka i ett textfält först.");
    return;
  }

  const selectedText = getSelectionText(target);
  const context = getContext(target, selectedText);
  const payload = {
    instruction: message.instruction,
    context,
    tone: message.tone
  };

  currentJob = { cancelled: false };
  sendStatus("Genererar...");

  let responseText = "";
  try {
    const response = await fetch(message.backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Backend error.");
    }
    const data = await response.json();
    responseText = data.text || "";
  } catch (error) {
    sendError(
      error instanceof Error ? error.message : "Något gick fel."
    );
    return;
  }

  if (!responseText) {
    sendError("Fick tomt svar från backend.");
    return;
  }

  if (currentJob.cancelled) {
    sendStatus("Avbrutet.");
    return;
  }

  sendStatus("Skriver in...");
  isTyping = true;

  const speed = Number(message.speed) || 0;
  const replaceSelection = Boolean(message.replaceSelection);

  try {
    if (isTextInput(target)) {
      if (speed > 0) {
        await typeIntoTextControl(
          target,
          responseText,
          replaceSelection,
          speed,
          currentJob
        );
      } else {
        insertIntoTextControl(target, responseText, replaceSelection);
      }
    } else {
      if (speed > 0) {
        await typeIntoContentEditable(
          target,
          responseText,
          replaceSelection,
          speed,
          currentJob
        );
      } else {
        insertIntoContentEditable(target, responseText, replaceSelection);
      }
    }
    if (currentJob.cancelled) {
      sendStatus("Avbrutet.");
      return;
    }
    sendStatus("Klart.");
  } catch (error) {
    sendError(
      error instanceof Error ? error.message : "Kunde inte skriva in."
    );
  } finally {
    isTyping = false;
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "generate-and-insert") {
    handleGenerateAndInsert(message);
  }
  if (message?.type === "cancel") {
    if (currentJob) {
      currentJob.cancelled = true;
    }
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isTyping && currentJob) {
    currentJob.cancelled = true;
  }
});
