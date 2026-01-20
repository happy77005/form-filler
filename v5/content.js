/**
 * Sequential Form Fill Pro v5 - Content Script
 * 
 * CORE FEATURE: Double-click to fill form fields sequentially
 * Each fill automatically copies the NEXT field value to clipboard
 * 
 * User Flow:
 * 1. User saves data in popup
 * 2. User visits form page - extension detects form fields
 * 3. User double-clicks field - fills it + copies next value to clipboard
 * 4. User double-clicks next field - fills it + copies next value
 * 5. Continues until all fields filled
 */

(function () {
    'use strict';

    console.log("[SFP v5] Content script loaded on:", window.location.href);

    // ====== Configuration ======
    const CONFIG = {
        FILL_DELAY: 50,           // Delay between fill and clipboard copy
        NOTIFICATION_DURATION: 2000,
        HIGHLIGHT_DURATION: 600,
        QUEUE_PANEL_TIMEOUT: 5000
    };

    // ====== State Variables ======
    let autofillData = null;
    let fillQueue = [];           // Ordered list of { fieldType, label, value }
    let currentQueueIndex = 0;    // Current position in queue
    let isProcessing = false;
    let notificationElement = null;
    let clipboardIndicator = null;
    let queuePanel = null;

    // ====== Define Fill Order ======
    // This determines the sequence in which fields will be filled
    const FIELD_ORDER = [
        'firstName',
        'middleName',
        'lastName',
        'email',
        'phone',
        'dateOfBirth',
        'age',
        'gender',
        'nationality',
        'houseNo',
        'building',
        'area',
        'landmark',
        'city',
        'state',
        'pincode',
        'qualification',
        'organization',
        'passingYear',
        'linkedinUrl',
        'portfolioUrl',
        'githubUrl'
    ];

    // ====== Display Labels for Queue ======
    const FIELD_LABELS = {
        firstName: 'First Name',
        middleName: 'Middle Name',
        lastName: 'Last Name',
        email: 'Email',
        phone: 'Phone',
        dateOfBirth: 'Date of Birth',
        age: 'Age',
        gender: 'Gender',
        nationality: 'Nationality',
        houseNo: 'House No',
        building: 'Building/Street',
        area: 'Area/Locality',
        landmark: 'Landmark',
        city: 'City',
        state: 'State',
        pincode: 'Pincode',
        qualification: 'Qualification',
        organization: 'College/Organization',
        passingYear: 'Passing Year',
        linkedinUrl: 'LinkedIn',
        portfolioUrl: 'Portfolio',
        githubUrl: 'GitHub'
    };

    // ====== Load Saved Data ======
    function loadAutofillData() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['autofillData', 'currentQueueIndex'], (result) => {
                if (result.autofillData) {
                    autofillData = result.autofillData;
                    buildFillQueue();
                    console.log("[SFP v5] Loaded data, queue size:", fillQueue.length);
                }
                if (typeof result.currentQueueIndex === 'number') {
                    currentQueueIndex = result.currentQueueIndex;
                }
                resolve(autofillData);
            });
        });
    }

    // ====== Build Fill Queue from Saved Data ======
    function buildFillQueue() {
        fillQueue = [];

        if (!autofillData) return;

        // Build queue in defined order, only including fields that have values
        FIELD_ORDER.forEach(fieldType => {
            let value = autofillData[fieldType];

            // Handle phone specially - combine country code + number
            if (fieldType === 'phone') {
                const countryCode = autofillData.countryCode || '+91';
                const phoneNational = autofillData.phoneNational || '';
                if (phoneNational) {
                    value = countryCode + phoneNational;
                } else {
                    value = '';
                }
            }

            if (value && String(value).trim()) {
                fillQueue.push({
                    fieldType,
                    label: FIELD_LABELS[fieldType] || fieldType,
                    value: String(value).trim()
                });
            }
        });

        console.log("[SFP v5] Built queue:", fillQueue.map(q => q.label));
    }

    // ====== Listen for Storage Changes ======
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.autofillData) {
            autofillData = changes.autofillData.newValue;
            buildFillQueue();
            currentQueueIndex = 0;
            saveQueueIndex();
            updateFloatingButton();
            console.log("[SFP v5] Data updated, queue rebuilt");
        }
    });

    // ====== Save Queue Index ======
    function saveQueueIndex() {
        try {
            chrome.storage.local.set({ currentQueueIndex });
        } catch (e) {
            // Ignore if extension context invalidated
        }
    }

    // ====== Notification System ======
    function createNotification() {
        if (notificationElement) return notificationElement;

        const el = document.createElement('div');
        el.className = 'sfp-notification';
        document.documentElement.appendChild(el);
        notificationElement = el;
        return el;
    }

    function showNotification(message, type = 'info', duration = CONFIG.NOTIFICATION_DURATION) {
        const el = createNotification();
        el.textContent = message;
        el.className = `sfp-notification ${type}`;

        requestAnimationFrame(() => {
            el.classList.add('visible');
        });

        setTimeout(() => {
            el.classList.remove('visible');
        }, duration);
    }

    // ====== Clipboard Indicator ======
    function createClipboardIndicator() {
        if (clipboardIndicator) return clipboardIndicator;

        const el = document.createElement('div');
        el.className = 'sfp-clipboard-indicator';
        el.innerHTML = `
      <div class="label">📋 Clipboard Ready</div>
      <div class="value"></div>
    `;
        document.documentElement.appendChild(el);
        clipboardIndicator = el;
        return el;
    }

    function showClipboardReady(value, label) {
        const el = createClipboardIndicator();
        el.querySelector('.label').textContent = `📋 Next: ${label}`;
        el.querySelector('.value').textContent = value.length > 25 ? value.substring(0, 25) + '...' : value;

        requestAnimationFrame(() => {
            el.classList.add('visible');
        });

        setTimeout(() => {
            el.classList.remove('visible');
        }, 3000);
    }

    // ====== Queue Panel ======
    function createQueuePanel() {
        if (queuePanel) return queuePanel;

        const el = document.createElement('div');
        el.className = 'sfp-queue-panel';
        document.documentElement.appendChild(el);
        queuePanel = el;
        return el;
    }

    function showQueuePanel() {
        const el = createQueuePanel();

        let html = '<h4>📋 Fill Queue</h4>';

        fillQueue.forEach((item, index) => {
            let className = 'sfp-queue-item';
            if (index < currentQueueIndex) className += ' filled';
            if (index === currentQueueIndex) className += ' current';

            const displayValue = item.value.length > 15 ? item.value.substring(0, 15) + '...' : item.value;

            html += `
        <div class="${className}">
          <span class="label">${index + 1}. ${item.label}</span>
          <span class="value">${displayValue}</span>
        </div>
      `;
        });

        if (fillQueue.length === 0) {
            html += '<div style="color: #999; font-size: 12px;">No data saved. Open extension popup to add your details.</div>';
        }

        el.innerHTML = html;
        el.classList.add('visible');
    }

    function hideQueuePanel() {
        if (queuePanel) {
            queuePanel.classList.remove('visible');
        }
    }

    // ====== Form Field Detection ======
    function hasFormElements() {
        return document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select').length > 0;
    }

    function isTextInputElement(el) {
        if (!el) return false;
        const tagName = el.tagName && el.tagName.toLowerCase();

        if (tagName === "textarea") return true;
        if (tagName === "select") return true;
        if (tagName === "input") {
            const type = (el.getAttribute("type") || "text").toLowerCase();
            const validTypes = ["text", "search", "email", "url", "tel", "number", "date"];
            return validTypes.includes(type);
        }
        if (el.isContentEditable) return true;
        return false;
    }

    function isVisible(el) {
        if (!el.offsetParent && el.offsetWidth === 0 && el.offsetHeight === 0) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    // ====== Floating Button ======
    function getButtonText() {
        if (fillQueue.length === 0) {
            return '⚙️ Setup Required';
        }
        const remaining = fillQueue.length - currentQueueIndex;
        if (remaining <= 0) {
            return '✅ All Filled!';
        }
        return `✨ Fill (${remaining}/${fillQueue.length})`;
    }

    function updateFloatingButton() {
        const button = document.getElementById('sequential-fill-btn');
        if (button) {
            button.textContent = getButtonText();

            if (fillQueue.length > 0 && currentQueueIndex < fillQueue.length) {
                button.classList.add('ready');
            } else {
                button.classList.remove('ready');
            }
        }
    }

    function injectFloatingButton() {
        if (document.getElementById('sequential-fill-btn')) return;
        if (!hasFormElements()) return;

        const button = document.createElement('button');
        button.id = 'sequential-fill-btn';
        button.textContent = getButtonText();
        button.title = 'Double-click on form fields to fill sequentially. Click here to see queue.';

        // Show queue panel on hover
        button.addEventListener('mouseenter', () => {
            showQueuePanel();
        });

        button.addEventListener('mouseleave', () => {
            setTimeout(hideQueuePanel, 500);
        });

        // Click to reset or show info
        button.addEventListener('click', () => {
            if (fillQueue.length === 0) {
                showNotification('⚠️ Open extension popup to save your data first!', 'warning');
                return;
            }

            if (currentQueueIndex >= fillQueue.length) {
                // Reset queue
                currentQueueIndex = 0;
                saveQueueIndex();
                updateFloatingButton();
                copyNextToClipboard();
                showNotification('🔄 Queue reset! First value copied to clipboard.', 'info');
            } else {
                // Copy current to clipboard
                copyNextToClipboard();
                showNotification('📋 Ready! Double-click on a field to fill.', 'info');
            }
        });

        document.body.appendChild(button);
    }

    // ====== Core Fill Logic ======

    /**
     * Copy the NEXT queue item to clipboard
     */
    async function copyNextToClipboard() {
        if (currentQueueIndex >= fillQueue.length) {
            console.log("[SFP v5] Queue complete, nothing more to copy");
            return false;
        }

        const nextItem = fillQueue[currentQueueIndex];

        try {
            await navigator.clipboard.writeText(nextItem.value);
            console.log("[SFP v5] Copied to clipboard:", nextItem.label, "=", nextItem.value);
            showClipboardReady(nextItem.value, nextItem.label);
            return true;
        } catch (error) {
            console.error("[SFP v5] Clipboard write failed:", error);
            // Fallback method
            const textarea = document.createElement('textarea');
            textarea.value = nextItem.value;
            textarea.style.cssText = 'position:fixed;left:-9999px;';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showClipboardReady(nextItem.value, nextItem.label);
            return true;
        }
    }

    /**
     * Fill the current field and advance queue
     */
    async function fillCurrentField(targetField) {
        if (isProcessing) return false;
        if (currentQueueIndex >= fillQueue.length) {
            showNotification('✅ All fields filled! Click button to reset.', 'success');
            return false;
        }

        isProcessing = true;

        try {
            const currentItem = fillQueue[currentQueueIndex];

            // Fill the field
            await fillField(targetField, currentItem.value);

            // Show success notification
            showNotification(`✓ Filled: ${currentItem.label}`, 'success', 1500);

            // Highlight the filled field
            targetField.classList.add('sfp-field-highlight');
            setTimeout(() => {
                targetField.classList.remove('sfp-field-highlight');
            }, CONFIG.HIGHLIGHT_DURATION);

            // Advance queue
            currentQueueIndex++;
            saveQueueIndex();
            updateFloatingButton();

            // Copy NEXT value to clipboard
            if (currentQueueIndex < fillQueue.length) {
                await new Promise(r => setTimeout(r, CONFIG.FILL_DELAY));
                await copyNextToClipboard();

                const nextItem = fillQueue[currentQueueIndex];
                showNotification(`📋 Next: ${nextItem.label} → Double-click to fill`, 'info');
            } else {
                showNotification('🎉 All fields filled!', 'success');
            }

            return true;

        } catch (error) {
            console.error("[SFP v5] Fill error:", error);
            showNotification('❌ Fill failed', 'warning');
            return false;
        } finally {
            isProcessing = false;
        }
    }

    /**
     * Fill a single field with value and trigger events
     */
    async function fillField(field, value) {
        const cleanValue = String(value).trim();

        // Handle contenteditable
        if (field.isContentEditable) {
            field.textContent = cleanValue;
            field.dispatchEvent(new InputEvent('input', { bubbles: true }));
            return;
        }

        // Handle select elements
        if (field.tagName.toLowerCase() === 'select') {
            const options = Array.from(field.options);
            const match = options.find(opt =>
                opt.value.toLowerCase() === cleanValue.toLowerCase() ||
                opt.textContent.toLowerCase().includes(cleanValue.toLowerCase())
            );
            if (match) {
                field.value = match.value;
            }
            field.dispatchEvent(new Event('change', { bubbles: true }));
            return;
        }

        // Set value
        field.value = cleanValue;

        // Trigger events for React/Vue/Angular compatibility
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        field.dispatchEvent(inputEvent);

        const changeEvent = new Event('change', { bubbles: true, cancelable: true });
        field.dispatchEvent(changeEvent);

        const blurEvent = new Event('blur', { bubbles: true, cancelable: true });
        field.dispatchEvent(blurEvent);

        // React-specific: Use native value setter
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
        )?.set;

        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(field, cleanValue);
            field.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // ====== Double-Click Handler ======
    async function handleDoubleClick(event) {
        if (event.button !== 0) return; // Only left click

        const target = event.target;

        if (!isTextInputElement(target)) return;
        if (!isVisible(target)) return;

        // Prevent default text selection on double-click
        event.preventDefault();

        console.log("[SFP v5] Double-click detected on field");

        // Ensure we have latest data
        if (!autofillData || fillQueue.length === 0) {
            await loadAutofillData();
        }

        if (fillQueue.length === 0) {
            showNotification('⚠️ No data saved! Open extension popup first.', 'warning');
            return;
        }

        // Fill the field
        await fillCurrentField(target);
    }

    // ====== Message Listener ======
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("[SFP v5] Message received:", message.action);

        if (message.action === 'getStatus') {
            sendResponse({
                queueLength: fillQueue.length,
                currentIndex: currentQueueIndex,
                remaining: fillQueue.length - currentQueueIndex
            });
            return false;
        }

        if (message.action === 'resetQueue') {
            currentQueueIndex = 0;
            saveQueueIndex();
            updateFloatingButton();
            copyNextToClipboard();
            sendResponse({ success: true });
            return false;
        }

        if (message.action === 'fillAll') {
            fillAllFields().then(sendResponse);
            return true;
        }
    });

    // ====== Fill All Fields at Once (Optional) ======
    async function fillAllFields() {
        if (isProcessing) return { success: false, count: 0 };
        isProcessing = true;

        const fields = getAllFillableFields();
        let filledCount = 0;

        for (const field of fields) {
            if (currentQueueIndex >= fillQueue.length) break;
            if (field.value && field.value.trim()) continue; // Skip non-empty

            const item = fillQueue[currentQueueIndex];
            await fillField(field, item.value);

            field.classList.add('sfp-field-highlight');
            setTimeout(() => field.classList.remove('sfp-field-highlight'), CONFIG.HIGHLIGHT_DURATION);

            currentQueueIndex++;
            filledCount++;

            await new Promise(r => setTimeout(r, 50));
        }

        saveQueueIndex();
        updateFloatingButton();
        isProcessing = false;

        showNotification(`✅ Filled ${filledCount} fields!`, 'success');
        return { success: true, count: filledCount };
    }

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

    // ====== Keyboard Shortcut ======
    document.addEventListener('keydown', async (e) => {
        // Ctrl+Shift+R - Reset queue
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            currentQueueIndex = 0;
            saveQueueIndex();
            updateFloatingButton();
            await copyNextToClipboard();
            showNotification('🔄 Queue reset!', 'info');
        }
    });

    // ====== Initialize ======
    async function init() {
        await loadAutofillData();

        if (hasFormElements()) {
            injectFloatingButton();

            // Copy first value to clipboard on page load
            if (fillQueue.length > 0 && currentQueueIndex < fillQueue.length) {
                await copyNextToClipboard();
            }
        }

        // Listen for double-clicks
        document.addEventListener('dblclick', handleDoubleClick, true);

        console.log("[SFP v5] Initialized - Queue:", fillQueue.length, "items");
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
