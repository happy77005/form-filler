/**
 * Auto Form Fill Pro - Content Script
 * 
 * Features:
 * - Uses saved user data from popup settings form  
 * - Keyboard shortcuts: Ctrl+Shift+F (next field), Ctrl+Shift+A (all)
 * - Clipboard-first approach for restrictive sites (Workday, Taleo, etc.)
 * - Semantic field matching based on field labels
 */

(function () {
  console.log("[Auto Fill Pro] Content script loaded on:", window.location.href);

  // ====== State Variables ======
  let autofillData = null;
  let formFields = [];
  let currentFillIndex = 0;
  let notificationElement = null;
  let notificationTimeoutId = null;
  let isProcessing = false;

  // ====== Load saved data ======
  chrome.storage.local.get(['autofillData', 'currentFillIndex'], (result) => {
    if (result.autofillData) {
      autofillData = result.autofillData;
      console.log("[Auto Fill Pro] Loaded saved data:", Object.keys(autofillData));
    }
    if (typeof result.currentFillIndex === 'number') {
      currentFillIndex = result.currentFillIndex;
    }
  });

  // Listen for storage changes (when user updates settings)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.autofillData) {
      autofillData = changes.autofillData.newValue;
      console.log("[Auto Fill Pro] Settings updated");
    }
  });

  // ====== Notification System ======
  function showNotification(message, duration = 2000) {
    try {
      if (!notificationElement) {
        notificationElement = document.createElement("div");
        notificationElement.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 2147483647;
          padding: 12px 18px;
          border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff;
          font-size: 14px;
          font-family: system-ui, -apple-system, sans-serif;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease-out, transform 0.2s ease-out;
          transform: translateY(10px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        `;
        document.documentElement.appendChild(notificationElement);
      }

      notificationElement.textContent = message;
      requestAnimationFrame(() => {
        notificationElement.style.opacity = '1';
        notificationElement.style.transform = 'translateY(0)';
      });

      if (notificationTimeoutId) clearTimeout(notificationTimeoutId);
      notificationTimeoutId = setTimeout(() => {
        notificationElement.style.opacity = '0';
        notificationElement.style.transform = 'translateY(10px)';
      }, duration);
    } catch (e) {
      console.error("[Auto Fill Pro] Notification error:", e);
    }
  }

  // ====== Field Detection & Matching ======
  function getAllFillableFields() {
    const fields = [];
    const excludedTypes = ['hidden', 'submit', 'button', 'reset', 'file', 'image', 'checkbox', 'radio', 'password'];

    document.querySelectorAll('input, textarea, select').forEach(el => {
      if (!isVisible(el)) return;
      if (el.tagName === 'INPUT') {
        const type = (el.type || 'text').toLowerCase();
        if (excludedTypes.includes(type)) return;
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

  function isTextInputElement(el) {
    if (!el) return false;
    const tagName = el.tagName && el.tagName.toLowerCase();
    if (tagName === "textarea") return true;
    if (tagName === "select") return true;
    if (tagName === "input") {
      const type = (el.getAttribute("type") || "text").toLowerCase();
      return ["text", "search", "email", "url", "tel", "number"].includes(type);
    }
    if (el.isContentEditable) return true;
    return false;
  }

  // Get field info for semantic matching
  function getFieldInfo(field) {
    const label = findLabelText(field);
    const name = (field.name || '').toLowerCase();
    const id = (field.id || '').toLowerCase();
    const placeholder = (field.placeholder || '').toLowerCase();
    const type = (field.type || 'text').toLowerCase();
    const autocomplete = (field.autocomplete || '').toLowerCase();

    const allText = `${label} ${name} ${id} ${placeholder} ${autocomplete}`.toLowerCase();

    return { label, name, id, placeholder, type, autocomplete, allText };
  }

  function findLabelText(field) {
    // Method 1: Label with 'for' attribute
    if (field.id) {
      const label = document.querySelector(`label[for="${field.id}"]`);
      if (label) return label.textContent.trim().toLowerCase();
    }
    // Method 2: Parent label
    const parentLabel = field.closest('label');
    if (parentLabel) return parentLabel.textContent.replace(field.value, '').trim().toLowerCase();
    // Method 3: Previous sibling
    let prev = field.previousElementSibling;
    while (prev) {
      if (prev.tagName === 'LABEL' || prev.tagName === 'SPAN' || prev.tagName === 'DIV') {
        const text = prev.textContent.trim();
        if (text && text.length < 50) return text.toLowerCase();
      }
      prev = prev.previousElementSibling;
    }
    return '';
  }

  // Match field to appropriate data value using semantic matching
  function matchFieldToData(field) {
    if (!autofillData) return null;

    const info = getFieldInfo(field);
    const text = info.allText;

    // First Name
    if (/first\s*name|fname|given\s*name|forename/.test(text) && !/last|sur/.test(text)) {
      return autofillData.firstName;
    }

    // Last Name
    if (/last\s*name|lname|surname|family\s*name/.test(text)) {
      return autofillData.lastName;
    }

    // Full Name
    if (/full\s*name|your\s*name|name/.test(text) && !/first|last|middle|user|company/.test(text)) {
      return autofillData.fullName;
    }

    // Email
    if (info.type === 'email' || /email|e-mail/.test(text)) {
      return autofillData.email;
    }

    // Phone
    if (info.type === 'tel' || /phone|mobile|cell|contact/.test(text)) {
      // Check if it's asking for country code separately
      if (/country\s*code|dial|code/.test(text) || (field.maxLength && field.maxLength <= 5)) {
        return autofillData.countryCode;
      }
      // Check if full phone with code expected
      if (info.placeholder.includes('+') || /with\s*code|international/.test(text)) {
        return autofillData.phoneWithCode;
      }
      return autofillData.phone;
    }

    // Address
    if (/address|street|residence/.test(text) && !/email|city|state|zip|postal|pin/.test(text)) {
      return autofillData.address;
    }

    // City
    if (/city|town|municipality/.test(text)) {
      return autofillData.city;
    }

    // State
    if (/state|province|region/.test(text) && !/united/.test(text)) {
      return autofillData.state;
    }

    // Country
    if (/country|nation/.test(text) && !/code/.test(text)) {
      return autofillData.country;
    }

    // Pincode/Zipcode
    if (/zip|postal|pincode|pin\s*code/.test(text)) {
      return autofillData.pincode;
    }

    // College/University
    if (/college|university|school|institution|education/.test(text) && !/high\s*school/.test(text)) {
      return autofillData.college;
    }

    return null;
  }

  // ====== Fill Functions ======
  async function fillWithClipboard(field, value) {
    if (!value) return false;

    try {
      // Method 1: Direct value set
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));

      if (field.value === value) {
        highlightField(field);
        return true;
      }

      // Method 2: Clipboard paste
      await navigator.clipboard.writeText(value);
      field.focus();
      document.execCommand('paste');
      highlightField(field);
      return true;

    } catch (error) {
      // Last resort
      field.value = value;
      highlightField(field);
      return true;
    }
  }

  function highlightField(field) {
    const originalBg = field.style.backgroundColor;
    field.style.transition = 'background-color 0.3s';
    field.style.backgroundColor = '#d4edda';
    setTimeout(() => {
      field.style.backgroundColor = originalBg;
    }, 500);
  }

  // Fill focused field with matching data
  async function fillFocusedField() {
    if (isProcessing) return;
    isProcessing = true;

    try {
      // Get latest data
      const result = await new Promise(resolve => {
        chrome.storage.local.get(['autofillData'], resolve);
      });

      if (!result.autofillData) {
        showNotification("⚠️ No saved data! Open extension popup first");
        isProcessing = false;
        return;
      }
      autofillData = result.autofillData;

      const activeElement = document.activeElement;
      if (!isTextInputElement(activeElement)) {
        showNotification("⚠️ Click on a form field first");
        isProcessing = false;
        return;
      }

      const value = matchFieldToData(activeElement);
      if (value) {
        await fillWithClipboard(activeElement, value);
        const info = getFieldInfo(activeElement);
        showNotification(`✓ Filled: ${info.label || 'field'}`);
      } else {
        showNotification("⚠️ Couldn't match this field");
      }

    } catch (error) {
      showNotification("❌ Fill failed");
      console.error("[Auto Fill Pro]", error);
    }

    isProcessing = false;
  }

  // Fill all fields at once
  async function fillAllFields() {
    if (isProcessing) return { success: false, filledCount: 0 };
    isProcessing = true;

    try {
      const result = await new Promise(resolve => {
        chrome.storage.local.get(['autofillData'], resolve);
      });

      if (!result.autofillData) {
        showNotification("⚠️ No saved data! Open extension popup first");
        isProcessing = false;
        return { success: false, filledCount: 0 };
      }
      autofillData = result.autofillData;

      const fields = getAllFillableFields();
      if (fields.length === 0) {
        showNotification("⚠️ No form fields found");
        isProcessing = false;
        return { success: false, filledCount: 0 };
      }

      let filledCount = 0;
      for (const field of fields) {
        if (field.value && field.value.trim() !== '') continue; // Skip non-empty

        const value = matchFieldToData(field);
        if (value) {
          await fillWithClipboard(field, value);
          filledCount++;
          await new Promise(r => setTimeout(r, 30)); // Small delay
        }
      }

      showNotification(`✅ Filled ${filledCount} fields!`);
      isProcessing = false;
      return { success: true, filledCount };

    } catch (error) {
      showNotification("❌ Fill failed");
      console.error("[Auto Fill Pro]", error);
      isProcessing = false;
      return { success: false, filledCount: 0 };
    }
  }

  // ====== Message Listener ======
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("[Auto Fill Pro] Message:", message.action);

    if (message.action === 'fill-next-field' || message.action === 'fillFocusedField') {
      fillFocusedField().then(() => sendResponse({ success: true }));
      return true;
    }

    if (message.action === 'fill-all-fields' || message.action === 'fillAllFields') {
      fillAllFields().then(sendResponse);
      return true;
    }
  });

  // ====== Keyboard Shortcuts (backup) ======
  document.addEventListener('keydown', async (e) => {
    // Ctrl+Shift+F - Fill focused field
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      await fillFocusedField();
    }

    // Ctrl+Shift+A - Fill all fields
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      await fillAllFields();
    }
  });

  // ====== Double-click to fill (optional) ======
  document.addEventListener("dblclick", async (event) => {
    if (event.button !== 0) return;
    const target = event.target;

    if (!isTextInputElement(target)) return;
    if (target.value && target.value.trim() !== '') return;

    // Get latest data
    const result = await new Promise(resolve => {
      chrome.storage.local.get(['autofillData'], resolve);
    });

    if (result.autofillData) {
      autofillData = result.autofillData;
      const value = matchFieldToData(target);
      if (value) {
        await fillWithClipboard(target, value);
        const info = getFieldInfo(target);
        showNotification(`✓ ${info.label || 'Filled'}`);
      }
    }
  }, true);

  console.log("[Auto Fill Pro] Ready - Use Ctrl+Shift+F (focused) or Ctrl+Shift+A (all)");
})();
