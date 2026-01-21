/**
 * Form Fill Helper v6 - Popup Script
 * Simple data management - save/load user details
 */

document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initializeAutocomplete();

    // Auto-calculate age when DOB changes
    document.getElementById('dateOfBirth').addEventListener('change', calculateAge);

    // Handle form submission
    document.getElementById('settingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
    });

    // Handle clear button
    document.getElementById('clearBtn').addEventListener('click', clearSettings);

    // Import/Export handlers
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', showImportUI);
    document.getElementById('cancelImport').addEventListener('click', hideImportUI);
    document.getElementById('confirmImport').addEventListener('click', applyImportedData);

    // Auto-persist on input change
    setupAutoPersist();

    // Set default country code
    setDefaultCountryCode();
});

// Set default +91 country code
function setDefaultCountryCode() {
    const countryCodeInput = document.getElementById('countryCode');
    if (!countryCodeInput.value) {
        countryCodeInput.value = '+91';
    }
}

// Auto-persist on input change
function setupAutoPersist() {
    const form = document.getElementById('settingsForm');
    const inputs = form.querySelectorAll('input, select');

    inputs.forEach(input => {
        let timeout;
        input.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                autoSaveSettings();
            }, 500);
        });

        input.addEventListener('change', () => {
            clearTimeout(timeout);
            autoSaveSettings();
        });
    });
}

// Auto-save without status message
function autoSaveSettings() {
    const autofillData = collectFormData();
    chrome.storage.local.set({ autofillData });
}


// Initialize state autocomplete
function initializeAutocomplete() {
    const stateInput = document.getElementById('state');
    const suggestionsDiv = document.getElementById('stateSuggestions');

    fetch(chrome.runtime.getURL('states.json'))
        .then(response => response.json())
        .then(data => {
            const states = data.states;

            stateInput.addEventListener('input', () => {
                const value = stateInput.value.toLowerCase().trim();

                if (value.length === 0) {
                    suggestionsDiv.classList.remove('active');
                    return;
                }

                const matches = states.filter(state =>
                    state.toLowerCase().includes(value)
                );

                if (matches.length > 0) {
                    suggestionsDiv.innerHTML = matches
                        .map(state => `<div class="autocomplete-suggestion">${state}</div>`)
                        .join('');
                    suggestionsDiv.classList.add('active');

                    suggestionsDiv.querySelectorAll('.autocomplete-suggestion').forEach(suggestion => {
                        suggestion.addEventListener('click', () => {
                            stateInput.value = suggestion.textContent;
                            suggestionsDiv.classList.remove('active');
                            autoSaveSettings();
                        });
                    });
                } else {
                    suggestionsDiv.classList.remove('active');
                }
            });

            document.addEventListener('click', (e) => {
                if (!stateInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
                    suggestionsDiv.classList.remove('active');
                }
            });

            // Keyboard navigation
            stateInput.addEventListener('keydown', (e) => {
                const suggestions = suggestionsDiv.querySelectorAll('.autocomplete-suggestion');
                const selected = suggestionsDiv.querySelector('.autocomplete-suggestion.selected');

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (!selected) {
                        suggestions[0]?.classList.add('selected');
                    } else {
                        selected.classList.remove('selected');
                        (selected.nextElementSibling || suggestions[0])?.classList.add('selected');
                    }
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (selected) {
                        selected.classList.remove('selected');
                        (selected.previousElementSibling || suggestions[suggestions.length - 1])?.classList.add('selected');
                    }
                } else if (e.key === 'Enter' && selected) {
                    e.preventDefault();
                    stateInput.value = selected.textContent;
                    suggestionsDiv.classList.remove('active');
                    autoSaveSettings();
                } else if (e.key === 'Escape') {
                    suggestionsDiv.classList.remove('active');
                }
            });
        })
        .catch(error => console.error('Error loading states:', error));
}

// Calculate age from DOB
function calculateAge() {
    const dobInput = document.getElementById('dateOfBirth');
    const ageInput = document.getElementById('age');

    if (!dobInput.value) {
        ageInput.value = '';
        return;
    }

    const dob = new Date(dobInput.value);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    ageInput.value = age >= 0 ? age : '';
}

// Load settings
function loadSettings() {
    chrome.storage.local.get(['autofillData'], (result) => {
        if (result.autofillData) {
            const data = result.autofillData;

            // Personal
            document.getElementById('firstName').value = data.firstName || '';
            document.getElementById('middleName').value = data.middleName || '';
            document.getElementById('lastName').value = data.lastName || '';
            document.getElementById('dateOfBirth').value = data.dateOfBirth || '';
            document.getElementById('gender').value = data.gender || '';
            document.getElementById('nationality').value = data.nationality || '';

            if (data.dateOfBirth) calculateAge();

            // Contact
            document.getElementById('email').value = data.email || '';
            document.getElementById('countryCode').value = data.countryCode || '+91';
            document.getElementById('phoneNational').value = data.phoneNational || '';

            // Address
            document.getElementById('houseNo').value = data.houseNo || '';
            document.getElementById('building').value = data.building || '';
            document.getElementById('area').value = data.area || '';
            document.getElementById('landmark').value = data.landmark || '';
            document.getElementById('city').value = data.city || '';
            document.getElementById('state').value = data.state || '';
            document.getElementById('pincode').value = data.pincode || '';

            // Professional
            document.getElementById('qualification').value = data.qualification || '';
            document.getElementById('organization').value = data.organization || '';
            document.getElementById('startingYear').value = data.startingYear || '';
            document.getElementById('passingYear').value = data.passingYear || '';

            // Links
            document.getElementById('linkedinUrl').value = data.linkedinUrl || '';
            document.getElementById('portfolioUrl').value = data.portfolioUrl || '';
            document.getElementById('githubUrl').value = data.githubUrl || '';
        }
    });
}

// Normalize phone
function normalizePhone(phone) {
    return phone.replace(/[\s\-\(\)]/g, '');
}

// Collect form data
function collectFormData() {
    return {
        firstName: document.getElementById('firstName').value.trim(),
        middleName: document.getElementById('middleName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        dateOfBirth: document.getElementById('dateOfBirth').value,
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        nationality: document.getElementById('nationality').value.trim(),
        email: document.getElementById('email').value.trim(),
        countryCode: normalizePhone(document.getElementById('countryCode').value.trim() || '+91'),
        phoneNational: normalizePhone(document.getElementById('phoneNational').value.trim()),
        houseNo: document.getElementById('houseNo').value.trim(),
        building: document.getElementById('building').value.trim(),
        area: document.getElementById('area').value.trim(),
        landmark: document.getElementById('landmark').value.trim(),
        city: document.getElementById('city').value.trim(),
        state: document.getElementById('state').value.trim(),
        pincode: document.getElementById('pincode').value.trim(),
        qualification: document.getElementById('qualification').value.trim(),
        organization: document.getElementById('organization').value.trim(),
        startingYear: document.getElementById('startingYear').value.trim(),
        passingYear: document.getElementById('passingYear').value.trim(),
        linkedinUrl: document.getElementById('linkedinUrl').value.trim(),
        portfolioUrl: document.getElementById('portfolioUrl').value.trim(),
        githubUrl: document.getElementById('githubUrl').value.trim()
    };
}

// Save settings
function saveSettings() {
    const autofillData = collectFormData();

    // Ensure country code starts with +
    if (autofillData.countryCode && !autofillData.countryCode.startsWith('+')) {
        autofillData.countryCode = '+' + autofillData.countryCode;
    }

    // Reset queue index when saving new data
    chrome.storage.local.set({
        autofillData,
        currentQueueIndex: 0
    }, () => {
        showStatus('✓ Data saved!', 'success');
    });
}

// Clear settings
function clearSettings() {
    if (confirm('Clear all saved data?')) {
        chrome.storage.local.remove(['autofillData', 'currentQueueIndex'], () => {
            document.getElementById('settingsForm').reset();
            document.getElementById('countryCode').value = '+91';
            showStatus('✓ All data cleared.', 'success');
        });
    }
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

// ====== Import/Export Functions ======

// Export data as JSON file download
function exportData() {
    const data = collectFormData();

    // Check if there's data to export
    const hasData = Object.values(data).some(v => v && String(v).trim());
    if (!hasData) {
        showStatus('No data to export!', 'error');
        return;
    }

    // Create JSON blob
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `formfill-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus('✓ Data exported!', 'success');
}

// Show import UI
function showImportUI() {
    document.getElementById('importTextarea').classList.add('visible');
    document.getElementById('importActions').classList.add('visible');
    document.getElementById('importTextarea').value = '';
    document.getElementById('importTextarea').focus();
}

// Hide import UI
function hideImportUI() {
    document.getElementById('importTextarea').classList.remove('visible');
    document.getElementById('importActions').classList.remove('visible');
    document.getElementById('importTextarea').value = '';
}

// Apply imported JSON data
function applyImportedData() {
    const textarea = document.getElementById('importTextarea');
    const jsonStr = textarea.value.trim();

    if (!jsonStr) {
        showStatus('Please paste JSON data first!', 'error');
        return;
    }

    try {
        const data = JSON.parse(jsonStr);

        // Validate it's an object
        if (typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('Invalid format');
        }

        // Apply data to form fields
        const fieldMappings = [
            'firstName', 'middleName', 'lastName', 'dateOfBirth', 'gender', 'nationality',
            'email', 'countryCode', 'phoneNational',
            'houseNo', 'building', 'area', 'landmark', 'city', 'state', 'pincode',
            'qualification', 'organization', 'startingYear', 'passingYear',
            'linkedinUrl', 'portfolioUrl', 'githubUrl'
        ];

        fieldMappings.forEach(field => {
            const el = document.getElementById(field);
            if (el && data[field] !== undefined) {
                el.value = data[field];
            }
        });

        // Recalculate age if DOB was imported
        if (data.dateOfBirth) {
            calculateAge();
        }

        // Save to storage
        saveSettings();

        // Hide import UI
        hideImportUI();

        showStatus('✓ Data imported successfully!', 'success');

    } catch (error) {
        console.error('Import error:', error);
        showStatus('Invalid JSON format!', 'error');
    }
}
