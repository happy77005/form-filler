/**
 * Form Fill Helper v6 - Content Script
 * 
 * Simple floating panel that shows saved data with copy buttons and drag-drop
 * - Toggle button shows/hides panel
 * - Each field has a copy button
 * - Values can be dragged and dropped into form fields
 */

(function () {
    'use strict';

    let panelVisible = false;
    let autofillData = null;
    let toastElement = null;

    // Field display order and labels
    const FIELD_CONFIG = [
        { section: 'Personal' },
        { key: 'firstName', label: 'First Name' },
        { key: 'middleName', label: 'Middle Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'dateOfBirth', label: 'Date of Birth' },
        { key: 'age', label: 'Age' },
        { key: 'gender', label: 'Gender' },
        { key: 'nationality', label: 'Nationality' },

        { section: 'Contact' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone', compute: (d) => d.phoneNational ? (d.countryCode || '+91') + d.phoneNational : '' },

        { section: 'Address' },
        { key: 'houseNo', label: 'House No' },
        { key: 'building', label: 'Building' },
        { key: 'area', label: 'Area' },
        { key: 'landmark', label: 'Landmark' },
        { key: 'city', label: 'City' },
        { key: 'state', label: 'State' },
        { key: 'pincode', label: 'Pincode' },

        { section: 'Education' },
        { key: 'qualification', label: 'Qualification' },
        { key: 'organization', label: 'Organization' },
        { key: 'startingYear', label: 'Starting Year' },
        { key: 'passingYear', label: 'Passing Year' },

        { section: 'Links' },
        { key: 'linkedinUrl', label: 'LinkedIn' },
        { key: 'portfolioUrl', label: 'Portfolio' },
        { key: 'githubUrl', label: 'GitHub' }
    ];

    // ====== Load Data ======
    function loadData() {
        return new Promise(resolve => {
            chrome.storage.local.get(['autofillData'], result => {
                autofillData = result.autofillData || {};
                resolve(autofillData);
            });
        });
    }

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.autofillData) {
            autofillData = changes.autofillData.newValue || {};
            if (panelVisible) {
                renderPanelContent();
            }
        }
    });

    // ====== Toast Notification ======
    function showToast(message) {
        if (!toastElement) {
            toastElement = document.createElement('div');
            toastElement.className = 'ffh-toast';
            document.documentElement.appendChild(toastElement);
        }
        toastElement.textContent = message;
        toastElement.classList.add('visible', 'success');

        setTimeout(() => {
            toastElement.classList.remove('visible');
        }, 1500);
    }

    // ====== Copy to Clipboard ======
    async function copyToClipboard(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
            showToast('✓ Copied!');

            // Visual feedback on button
            const originalText = btn.textContent;
            btn.textContent = '✓';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove('copied');
            }, 1000);
        } catch (error) {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.cssText = 'position:fixed;left:-9999px;';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('✓ Copied!');
        }
    }

    // ====== Create Panel ======
    function createPanel() {
        const panel = document.createElement('div');
        panel.id = 'ffh-panel';
        panel.innerHTML = `
            <div class="ffh-header">📋 Form Fill Helper</div>
            <div class="ffh-body" id="ffh-body"></div>
        `;
        document.documentElement.appendChild(panel);
        return panel;
    }

    // ====== Render Panel Content ======
    function renderPanelContent() {
        const body = document.getElementById('ffh-body');
        if (!body) return;

        const data = autofillData || {};
        let hasData = false;
        let html = '';

        FIELD_CONFIG.forEach(item => {
            if (item.section) {
                html += `<div class="ffh-section">${item.section}</div>`;
                return;
            }

            let value = item.compute ? item.compute(data) : data[item.key];
            if (value && String(value).trim()) {
                hasData = true;
                const displayValue = String(value).trim();
                html += `
                    <div class="ffh-field" draggable="true" data-value="${displayValue.replace(/"/g, '&quot;')}">
                        <span class="ffh-field-label">${item.label}</span>
                        <span class="ffh-field-value" title="Drag to fill or click Copy">${displayValue}</span>
                        <button class="ffh-copy-btn" data-value="${displayValue.replace(/"/g, '&quot;')}">Copy</button>
                    </div>
                `;
            }
        });

        if (!hasData) {
            html = `
                <div class="ffh-empty">
                    <p>📝 No data saved yet</p>
                    <p>Click the extension icon to add your details</p>
                </div>
            `;
        }

        body.innerHTML = html;

        // Add copy button handlers
        body.querySelectorAll('.ffh-copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(btn.dataset.value, btn);
            });
        });

        // Add drag handlers
        body.querySelectorAll('.ffh-field[draggable="true"]').forEach(field => {
            field.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', field.dataset.value);
                e.dataTransfer.effectAllowed = 'copy';
                field.classList.add('dragging');
            });

            field.addEventListener('dragend', () => {
                field.classList.remove('dragging');
            });
        });
    }

    // ====== Toggle Panel ======
    function togglePanel() {
        const panel = document.getElementById('ffh-panel') || createPanel();
        const btn = document.getElementById('ffh-toggle-btn');

        panelVisible = !panelVisible;

        if (panelVisible) {
            renderPanelContent();
            panel.classList.add('visible');
            btn.classList.add('active');
            btn.textContent = '✕';
        } else {
            panel.classList.remove('visible');
            btn.classList.remove('active');
            btn.textContent = '📋';
        }
    }

    // ====== Create Toggle Button ======
    function createToggleButton() {
        if (document.getElementById('ffh-toggle-btn')) return;

        const btn = document.createElement('button');
        btn.id = 'ffh-toggle-btn';
        btn.textContent = '📋';
        btn.title = 'Open Form Fill Helper';
        btn.addEventListener('click', togglePanel);
        document.body.appendChild(btn);
    }

    // ====== Initialize ======
    async function init() {
        await loadData();
        createToggleButton();
        console.log('[FFH v6] Initialized');
    }

    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
