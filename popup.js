/**
 * Auto Form Fill - Popup Script
 * Displays parsed fields and provides controls for form filling
 */

document.addEventListener('DOMContentLoaded', () => {
    loadParsedData();
    setupEventListeners();
});

function loadParsedData() {
    chrome.storage.local.get(['parsedFields', 'currentFillIndex'], (result) => {
        const fields = result.parsedFields || [];
        const fillIndex = result.currentFillIndex || 0;

        updateUI(fields, fillIndex);
    });
}

function updateUI(fields, fillIndex) {
    const fieldCount = document.getElementById('fieldCount');
    const fillProgress = document.getElementById('fillProgress');
    const fieldsContainer = document.getElementById('fieldsContainer');
    const emptyState = document.getElementById('emptyState');
    const fillBtn = document.getElementById('fillBtn');

    fieldCount.textContent = fields.length;
    fillProgress.textContent = fillIndex;

    if (fields.length === 0) {
        emptyState.style.display = 'block';
        fillBtn.disabled = true;
        return;
    }

    emptyState.style.display = 'none';
    fillBtn.disabled = false;

    // Render fields
    fieldsContainer.innerHTML = fields.map((field, index) => `
    <div class="field-item ${index < fillIndex ? 'filled' : ''}">
      <div class="field-index">${index + 1}</div>
      <div class="field-content">
        <div class="field-label">${escapeHtml(field.label)}</div>
        <div class="field-value">${escapeHtml(field.value)}</div>
      </div>
    </div>
  `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function setupEventListeners() {
    // Fill button - sends message to content script
    document.getElementById('fillBtn').addEventListener('click', async () => {
        const btn = document.getElementById('fillBtn');
        btn.textContent = '⏳ Filling...';
        btn.disabled = true;

        try {
            // Get active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab) {
                showStatus('No active tab found', 'error');
                return;
            }

            // Send message to content script to fill
            chrome.tabs.sendMessage(tab.id, { action: 'fillAllFields' }, (response) => {
                if (chrome.runtime.lastError) {
                    showStatus('Please navigate to a form page', 'error');
                } else if (response && response.success) {
                    showStatus(`Filled ${response.filledCount} fields!`, 'success');
                    loadParsedData(); // Refresh
                } else {
                    showStatus('No fields to fill', 'error');
                }

                btn.textContent = '✨ Fill Active Form';
                btn.disabled = false;
            });
        } catch (error) {
            console.error('Fill error:', error);
            showStatus('Error filling form', 'error');
            btn.textContent = '✨ Fill Active Form';
            btn.disabled = false;
        }
    });

    // Clear button
    document.getElementById('clearBtn').addEventListener('click', () => {
        if (confirm('Clear all parsed data?')) {
            chrome.storage.local.remove(['parsedFields', 'currentFillIndex', 'lastCopiedText'], () => {
                loadParsedData();
                showStatus('Data cleared', 'success');
            });
        }
    });
}

function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;

    setTimeout(() => {
        statusEl.className = 'status';
    }, 3000);
}
