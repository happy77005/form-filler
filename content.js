/**
 * Auto Form Fill Extension - Content Script
 * 
 * Features:
 * - Copies selected text on mouseup with notification
 * - Parses copied text to extract field:value pairs
 * - On double left-click in a form field, fills fields sequentially
 * - Shows floating button on pages with forms
 */

(function () {
  console.log("[Auto Form Fill] Content script loaded on:", window.location.href);

  // ====== State Variables ======
  let lastCopiedText = "";
  let parsedFields = [];
  let notificationElement = null;
  let notificationTimeoutId = null;
  let isDoubleClickFilling = false;
  let extensionInvalidated = false;
  let currentFillIndex = 0;

  // ====== Text Parser (inline for content script) ======
  const TextParser = {
    parse(text) {
      if (!text || typeof text !== 'string') return [];

      const fields = [];
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      let index = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Pattern 1: "Label*: Value" or "Label: Value" or "Label - Value"
        const colonPattern = /^([A-Za-z\s\-_]+)[\*\s]*[:\-–—]\s*(.+)$/;
        const match = line.match(colonPattern);

        if (match) {
          const label = this.normalizeLabel(match[1]);
          const value = match[2].trim();
          if (label && value) {
            fields.push({ label, value, index: index++ });
          }
          continue;
        }

        // Pattern 2: Label on one line, value on next
        const labelOnlyPattern = /^([A-Za-z\s\-_]+)[\*\s]*$/;
        const labelMatch = line.match(labelOnlyPattern);

        if (labelMatch && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (!nextLine.match(labelOnlyPattern) && !nextLine.match(colonPattern)) {
            const label = this.normalizeLabel(labelMatch[1]);
            const value = nextLine.trim();
            if (label && value) {
              fields.push({ label, value, index: index++ });
              i++;
            }
          }
        }
      }

      return fields;
    },

    normalizeLabel(label) {
      return label.trim().replace(/\s+/g, ' ').replace(/[\*\s]+$/, '').trim();
    }
  };

  // ====== Extension Context Validation ======
  function isExtensionContextValid() {
    try {
      return chrome.storage && chrome.storage.local !== undefined;
    } catch (e) {
      return false;
    }
  }

  function safeStorageGet(keys, callback) {
    if (extensionInvalidated || !isExtensionContextValid()) {
      callback({});
      return;
    }
    try {
      chrome.storage.local.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          if (chrome.runtime.lastError.message.includes("Extension context invalidated")) {
            extensionInvalidated = true;
          }
          callback({});
          return;
        }
        callback(result);
      });
    } catch (e) {
      extensionInvalidated = true;
      callback({});
    }
  }

  function safeStorageSet(items, callback) {
    if (extensionInvalidated || !isExtensionContextValid()) {
      if (callback) callback();
      return;
    }
    try {
      chrome.storage.local.set(items, () => {
        if (chrome.runtime.lastError) {
          if (chrome.runtime.lastError.message.includes("Extension context invalidated")) {
            extensionInvalidated = true;
          }
        }
        if (callback) callback();
      });
    } catch (e) {
      extensionInvalidated = true;
      if (callback) callback();
    }
  }

  // ====== Load saved data on page load ======
  safeStorageGet(["lastCopiedText", "parsedFields"], (result) => {
    if (typeof result.lastCopiedText === "string") {
      lastCopiedText = result.lastCopiedText;
      console.log("[Auto Form Fill] Loaded saved text, length:", lastCopiedText.length);
    }
    if (Array.isArray(result.parsedFields)) {
      parsedFields = result.parsedFields;
      console.log("[Auto Form Fill] Loaded parsed fields:", parsedFields.length);
    }
  });

  // ====== Notification System ======
  function createNotificationElement() {
    if (notificationElement && document.contains(notificationElement)) {
      return notificationElement;
    }
    const el = document.createElement("div");
    el.className = "autofill-notification";
    document.documentElement.appendChild(el);
    notificationElement = el;
    return el;
  }

  function showNotification(message, x, y, duration = 1500) {
    try {
      const el = createNotificationElement();
      el.textContent = message;

      const maxX = window.innerWidth - 150;
      const maxY = window.innerHeight - 50;
      el.style.left = `${Math.min(x + 15, maxX)}px`;
      el.style.top = `${Math.max(y - 30, 10)}px`;

      requestAnimationFrame(() => el.classList.add("visible"));

      if (notificationTimeoutId !== null) clearTimeout(notificationTimeoutId);
      notificationTimeoutId = setTimeout(() => {
        el.classList.remove("visible");
      }, duration);
    } catch (e) {
      console.error("[Auto Form Fill] Notification error:", e);
    }
  }

  // ====== Copy & Parse on Selection ======
  function copyAndParseSelection(event) {
    if (isDoubleClickFilling) return;

    try {
      const selection = window.getSelection();
      if (!selection) return;

      const text = selection.toString().trim();
      if (!text || text.length === 0) return;

      console.log("[Auto Form Fill] Copying text, length:", text.length);
      lastCopiedText = text;

      // Parse the text for fields
      const newParsedFields = TextParser.parse(text);
      if (newParsedFields.length > 0) {
        parsedFields = newParsedFields;
        currentFillIndex = 0;
        console.log("[Auto Form Fill] Parsed fields:", parsedFields);

        safeStorageSet({ lastCopiedText: text, parsedFields: parsedFields });
        showNotification(`✓ Parsed ${parsedFields.length} fields`, event.clientX, event.clientY);
        updateFloatingButton();
      } else {
        // Just copy as regular text
        safeStorageSet({ lastCopiedText: text });
        showNotification("Copied ✓", event.clientX, event.clientY);
      }

      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
      } else {
        legacyCopy(text);
      }
    } catch (err) {
      console.error("[Auto Form Fill] Copy error:", err);
    }
  }

  function legacyCopy(text) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.cssText = "position:fixed;left:-9999px;";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ====== Form Field Detection ======
  function isTextInputElement(el) {
    if (!el) return false;
    const tagName = el.tagName && el.tagName.toLowerCase();

    if (tagName === "textarea") return true;
    if (tagName === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      const textTypes = ["text", "search", "email", "url", "tel", "password", "number"];
      return textTypes.includes(type);
    }
    if (el.isContentEditable) return true;
    return false;
  }

  function getAllFillableFields() {
    const fields = [];
    const excludedTypes = ['hidden', 'submit', 'button', 'reset', 'file', 'image', 'checkbox', 'radio'];

    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (!isVisible(el)) return;
      if (el.tagName === 'INPUT') {
        const type = (el.type || 'text').toLowerCase();
        if (excludedTypes.includes(type)) return;
        // Exclude OTP/verification fields
        const text = `${el.name || ''} ${el.id || ''} ${el.placeholder || ''}`.toLowerCase();
        if (/otp|verification|verify|captcha|pin/.test(text)) return;
      }
      if (!el.disabled && !el.readOnly) {
        fields.push(el);
      }
    });

    return fields;
  }

  function isVisible(el) {
    if (!el.offsetParent && el.offsetWidth === 0 && el.offsetHeight === 0) return false;
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }

  // ====== Sequential Form Filling ======
  function fillNextField(targetField) {
    if (parsedFields.length === 0) {
      showNotification("No parsed data. Copy form text first!", targetField.getBoundingClientRect().left, targetField.getBoundingClientRect().top);
      return false;
    }

    if (currentFillIndex >= parsedFields.length) {
      showNotification("All fields filled! ✓", targetField.getBoundingClientRect().left, targetField.getBoundingClientRect().top);
      currentFillIndex = 0; // Reset for next round
      return false;
    }

    const fieldData = parsedFields[currentFillIndex];
    fillField(targetField, fieldData.value);

    const rect = targetField.getBoundingClientRect();
    showNotification(`✓ ${fieldData.label}`, rect.right + 10, rect.top);

    currentFillIndex++;
    updateFloatingButton();

    return true;
  }

  function fillField(field, value) {
    const cleanValue = String(value).trim();

    if (field.isContentEditable) {
      field.textContent = cleanValue;
      field.dispatchEvent(new InputEvent("input", { bubbles: true }));
      return;
    }

    field.value = cleanValue;
    field.classList.add('autofill-highlight');
    setTimeout(() => field.classList.remove('autofill-highlight'), 600);

    // Trigger events for React/Vue/Angular
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));

    // React compatibility
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(field, cleanValue);
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  // ====== Fill All Fields at Once ======
  function fillAllFields() {
    const formFields = getAllFillableFields();

    if (formFields.length === 0) {
      showNotification("No form fields found!", window.innerWidth / 2, window.innerHeight / 2);
      return;
    }

    if (parsedFields.length === 0) {
      showNotification("No parsed data! Copy form text first.", window.innerWidth / 2, window.innerHeight / 2);
      return;
    }

    let filledCount = 0;
    const maxFill = Math.min(formFields.length, parsedFields.length);

    for (let i = 0; i < maxFill; i++) {
      const field = formFields[i];
      const data = parsedFields[i];

      // Only fill empty fields
      if (!field.value || field.value.trim() === '') {
        fillField(field, data.value);
        filledCount++;
      }
    }

    const button = document.getElementById('autofill-floating-btn');
    if (button) {
      button.innerHTML = `✓ Filled ${filledCount} fields`;
      setTimeout(() => {
        button.innerHTML = getButtonText();
      }, 2000);
    }

    currentFillIndex = parsedFields.length;
    updateFloatingButton();
  }

  // ====== Floating Button ======
  function hasFormElements() {
    return document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select').length > 0;
  }

  function getButtonText() {
    if (parsedFields.length > 0) {
      const remaining = parsedFields.length - currentFillIndex;
      return `✨ Auto Fill (${remaining}/${parsedFields.length})`;
    }
    return '✨ Auto Fill';
  }

  function updateFloatingButton() {
    const button = document.getElementById('autofill-floating-btn');
    if (button) {
      button.innerHTML = getButtonText();
    }
  }

  function injectFloatingButton() {
    if (document.getElementById('autofill-floating-btn')) return;
    if (!hasFormElements()) return;

    const button = document.createElement('button');
    button.id = 'autofill-floating-btn';
    button.innerHTML = getButtonText();
    button.title = 'Auto-fill form fields with copied data (or double-click individual fields)';

    button.addEventListener('click', () => {
      if (button.classList.contains('filling')) return;
      button.classList.add('filling');
      button.innerHTML = '⏳ Filling...';

      setTimeout(() => {
        fillAllFields();
        button.classList.remove('filling');
      }, 100);
    });

    document.body.appendChild(button);
  }

  // ====== Event Listeners ======

  // Copy on mouseup
  document.addEventListener("mouseup", (event) => {
    if (event.button !== 0) return;
    setTimeout(() => copyAndParseSelection(event), 10);
  }, true);

  // Double-click to fill sequential
  document.addEventListener("dblclick", (event) => {
    if (event.button !== 0) return;
    const target = event.target;

    if (!isTextInputElement(target)) return;

    console.log("[Auto Form Fill] Double-click on text field");
    isDoubleClickFilling = true;

    // Get latest from storage
    safeStorageGet(["parsedFields"], (result) => {
      if (Array.isArray(result.parsedFields) && result.parsedFields.length > 0) {
        parsedFields = result.parsedFields;
      }

      fillNextField(target);

      setTimeout(() => {
        isDoubleClickFilling = false;
      }, 100);
    });
  }, true);

  // ====== Message Listener for Popup ======
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fillAllFields') {
      // Get latest parsed fields from storage
      safeStorageGet(['parsedFields'], (result) => {
        if (Array.isArray(result.parsedFields) && result.parsedFields.length > 0) {
          parsedFields = result.parsedFields;
        }

        const formFields = getAllFillableFields();

        if (formFields.length === 0 || parsedFields.length === 0) {
          sendResponse({ success: false, filledCount: 0 });
          return;
        }

        let filledCount = 0;
        const maxFill = Math.min(formFields.length, parsedFields.length);

        for (let i = 0; i < maxFill; i++) {
          const field = formFields[i];
          const data = parsedFields[i];

          if (!field.value || field.value.trim() === '') {
            fillField(field, data.value);
            filledCount++;
          }
        }

        currentFillIndex = parsedFields.length;
        safeStorageSet({ currentFillIndex: currentFillIndex });
        updateFloatingButton();

        sendResponse({ success: true, filledCount: filledCount });
      });

      return true; // Keep channel open for async response
    }

    if (message.action === 'getParsedFields') {
      sendResponse({ fields: parsedFields, fillIndex: currentFillIndex });
      return false;
    }
  });

  // ====== Initialize ======
  function init() {
    if (hasFormElements()) {
      injectFloatingButton();
    }
    console.log("[Auto Form Fill] Initialized");
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
