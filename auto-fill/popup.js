/**
 * Auto Form Fill Pro - Popup Script
 * Handles settings form for storing user data
 */

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
});

// Load saved settings
function loadSettings() {
    chrome.storage.local.get(['autofillData'], (result) => {
        if (result.autofillData) {
            const data = result.autofillData;

            document.getElementById('firstName').value = data.firstName || '';
            document.getElementById('lastName').value = data.lastName || '';
            document.getElementById('email').value = data.email || '';
            document.getElementById('countryCode').value = data.countryCode || '+91';
            document.getElementById('phone').value = data.phone || '';
            document.getElementById('address').value = data.address || '';
            document.getElementById('city').value = data.city || '';
            document.getElementById('state').value = data.state || '';
            document.getElementById('country').value = data.country || '';
            document.getElementById('pincode').value = data.pincode || '';
            document.getElementById('college').value = data.college || '';
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    document.getElementById('settingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
    });

    // Clear button
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Clear all saved data?')) {
            chrome.storage.local.remove(['autofillData'], () => {
                document.getElementById('settingsForm').reset();
                document.getElementById('countryCode').value = '+91';
                showStatus('Data cleared!', 'success');
            });
        }
    });

    // Auto-save on input change (debounced)
    let saveTimeout;
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                autoSave();
            }, 500);
        });
    });
}

// Collect form data
function collectFormData() {
    const countryCode = document.getElementById('countryCode').value.trim();
    const phone = document.getElementById('phone').value.trim();

    return {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        fullName: `${document.getElementById('firstName').value.trim()} ${document.getElementById('lastName').value.trim()}`.trim(),
        email: document.getElementById('email').value.trim(),
        countryCode: countryCode.startsWith('+') ? countryCode : '+' + countryCode,
        phone: phone,
        phoneWithCode: `${countryCode}${phone}`,
        address: document.getElementById('address').value.trim(),
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value.trim(),
        country: document.getElementById('country').value.trim(),
        pincode: document.getElementById('pincode').value.trim(),
        college: document.getElementById('college').value.trim(),
        // Full address for single-field forms
        fullAddress: [
            document.getElementById('address').value.trim(),
            document.getElementById('city').value.trim(),
            document.getElementById('state').value.trim(),
            document.getElementById('pincode').value.trim(),
            document.getElementById('country').value.trim()
        ].filter(Boolean).join(', ')
    };
}

// Save settings
function saveSettings() {
    const autofillData = collectFormData();

    chrome.storage.local.set({ autofillData }, () => {
        showStatus('✓ Saved! Use Ctrl+Shift+F to autofill', 'success');
    });
}

// Auto-save without notification
function autoSave() {
    const autofillData = collectFormData();
    chrome.storage.local.set({ autofillData });
}

// Show status message
function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;

    setTimeout(() => {
        statusEl.className = 'status';
    }, 3000);
}
