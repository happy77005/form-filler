// Load saved data when popup opens
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initializeAutocomplete();

  // Auto-calculate age when date of birth changes
  document.getElementById('dateOfBirth').addEventListener('change', calculateAge);

  // Handle form submission
  document.getElementById('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
  });

  // Handle clear button
  document.getElementById('clearBtn').addEventListener('click', clearSettings);

  // Auto-persist data on input change (Task 5)
  setupAutoPersist();

  // Set default country code if empty
  setDefaultCountryCode();
});

// Set default +91 country code (Task 7)
function setDefaultCountryCode() {
  const countryCodeInput = document.getElementById('countryCode');
  const altCountryCodeInput = document.getElementById('altCountryCode');

  if (!countryCodeInput.value) {
    countryCodeInput.value = '+91';
  }
  if (!altCountryCodeInput.value) {
    altCountryCodeInput.value = '+91';
  }
}

// Auto-persist data on input change (Task 5)
function setupAutoPersist() {
  const form = document.getElementById('settingsForm');
  const inputs = form.querySelectorAll('input, select');

  inputs.forEach(input => {
    // Debounce auto-save to avoid excessive writes
    let timeout;
    input.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        autoSaveSettings();
      }, 500); // Save 500ms after user stops typing
    });

    input.addEventListener('change', () => {
      clearTimeout(timeout);
      autoSaveSettings();
    });
  });
}

// Auto-save settings without showing status message
function autoSaveSettings() {
  const autofillData = collectFormData();
  chrome.storage.local.set({ autofillData });
}

// Initialize state autocomplete (Task 1)
function initializeAutocomplete() {
  const stateInput = document.getElementById('state');
  const suggestionsDiv = document.getElementById('stateSuggestions');

  // Load states from states.json
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

        // Filter states that match the input
        const matches = states.filter(state =>
          state.toLowerCase().includes(value)
        );

        if (matches.length > 0) {
          suggestionsDiv.innerHTML = matches
            .map(state => `<div class="autocomplete-suggestion">${state}</div>`)
            .join('');
          suggestionsDiv.classList.add('active');

          // Add click handlers to suggestions
          suggestionsDiv.querySelectorAll('.autocomplete-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
              stateInput.value = suggestion.textContent;
              suggestionsDiv.classList.remove('active');
              autoSaveSettings(); // Auto-save when state is selected
            });
          });
        } else {
          suggestionsDiv.classList.remove('active');
        }
      });

      // Close suggestions when clicking outside
      document.addEventListener('click', (e) => {
        if (!stateInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
          suggestionsDiv.classList.remove('active');
        }
      });

      // Keyboard navigation for suggestions
      stateInput.addEventListener('keydown', (e) => {
        const suggestions = suggestionsDiv.querySelectorAll('.autocomplete-suggestion');
        const selected = suggestionsDiv.querySelector('.autocomplete-suggestion.selected');

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (!selected) {
            suggestions[0]?.classList.add('selected');
          } else {
            selected.classList.remove('selected');
            const next = selected.nextElementSibling;
            if (next) {
              next.classList.add('selected');
              next.scrollIntoView({ block: 'nearest' });
            } else {
              suggestions[0]?.classList.add('selected');
            }
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (selected) {
            selected.classList.remove('selected');
            const prev = selected.previousElementSibling;
            if (prev) {
              prev.classList.add('selected');
              prev.scrollIntoView({ block: 'nearest' });
            } else {
              suggestions[suggestions.length - 1]?.classList.add('selected');
            }
          }
        } else if (e.key === 'Enter') {
          if (selected) {
            e.preventDefault();
            stateInput.value = selected.textContent;
            suggestionsDiv.classList.remove('active');
            autoSaveSettings();
          }
        } else if (e.key === 'Escape') {
          suggestionsDiv.classList.remove('active');
        }
      });
    })
    .catch(error => {
      console.error('Error loading states:', error);
    });
}

// Calculate age from date of birth
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

  // Adjust age if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  ageInput.value = age >= 0 ? age : '';
}

// Load settings from chrome.storage.local
function loadSettings() {
  chrome.storage.local.get(['autofillData'], (result) => {
    if (result.autofillData) {
      const data = result.autofillData;

      // Personal Information
      document.getElementById('firstName').value = data.firstName || '';
      document.getElementById('middleName').value = data.middleName || '';
      document.getElementById('lastName').value = data.lastName || '';
      document.getElementById('dateOfBirth').value = data.dateOfBirth || '';
      document.getElementById('gender').value = data.gender || '';
      document.getElementById('nationality').value = data.nationality || '';

      // Calculate age if DOB exists
      if (data.dateOfBirth) {
        calculateAge();
      }

      // Contact Information
      document.getElementById('email').value = data.email || '';
      document.getElementById('countryCode').value = data.countryCode || '+91';
      document.getElementById('phoneNational').value = data.phoneNational || '';
      document.getElementById('altCountryCode').value = data.altCountryCode || '+91';
      document.getElementById('altPhoneNational').value = data.altPhoneNational || '';

      // Address Information (Task 6 - Structured)
      document.getElementById('houseNo').value = data.houseNo || '';
      document.getElementById('building').value = data.building || '';
      document.getElementById('area').value = data.area || '';
      document.getElementById('landmark').value = data.landmark || '';
      document.getElementById('city').value = data.city || '';
      document.getElementById('state').value = data.state || '';
      document.getElementById('pincode').value = data.pincode || '';

      // Professional Information
      document.getElementById('jobTitle').value = data.jobTitle || '';
      document.getElementById('organization').value = data.organization || '';
      document.getElementById('qualification').value = data.qualification || '';
      document.getElementById('passingYear').value = data.passingYear || '';

      // Social & Professional Links
      document.getElementById('linkedinUrl').value = data.linkedinUrl || '';
      document.getElementById('portfolioUrl').value = data.portfolioUrl || '';
      document.getElementById('githubUrl').value = data.githubUrl || '';
    }
  });
}

// Normalize phone number (remove spaces, dashes, parentheses)
function normalizePhone(phone) {
  return phone.replace(/[\s\-\(\)]/g, '');
}

// Collect form data
function collectFormData() {
  return {
    // Personal Information
    firstName: document.getElementById('firstName').value.trim(),
    middleName: document.getElementById('middleName').value.trim(),
    lastName: document.getElementById('lastName').value.trim(),
    dateOfBirth: document.getElementById('dateOfBirth').value,
    age: document.getElementById('age').value,
    gender: document.getElementById('gender').value,
    nationality: document.getElementById('nationality').value.trim(),

    // Contact Information (stored in normalized format)
    email: document.getElementById('email').value.trim(),
    countryCode: normalizePhone(document.getElementById('countryCode').value.trim() || '+91'),
    phoneNational: normalizePhone(document.getElementById('phoneNational').value.trim()),
    altCountryCode: normalizePhone(document.getElementById('altCountryCode').value.trim() || '+91'),
    altPhoneNational: normalizePhone(document.getElementById('altPhoneNational').value.trim()),

    // Address Information (Task 6 - Structured)
    houseNo: document.getElementById('houseNo').value.trim(),
    building: document.getElementById('building').value.trim(),
    area: document.getElementById('area').value.trim(),
    landmark: document.getElementById('landmark').value.trim(),
    city: document.getElementById('city').value.trim(),
    state: document.getElementById('state').value.trim(),
    pincode: document.getElementById('pincode').value.trim(),

    // Professional Information
    jobTitle: document.getElementById('jobTitle').value.trim(),
    organization: document.getElementById('organization').value.trim(),
    qualification: document.getElementById('qualification').value.trim(),
    passingYear: document.getElementById('passingYear').value.trim(),

    // Social & Professional Links
    linkedinUrl: document.getElementById('linkedinUrl').value.trim(),
    portfolioUrl: document.getElementById('portfolioUrl').value.trim(),
    githubUrl: document.getElementById('githubUrl').value.trim()
  };
}

// Save settings to chrome.storage.local
function saveSettings() {
  const autofillData = collectFormData();

  // Validate country code format
  if (autofillData.countryCode && !autofillData.countryCode.startsWith('+')) {
    autofillData.countryCode = '+' + autofillData.countryCode;
  }
  if (autofillData.altCountryCode && !autofillData.altCountryCode.startsWith('+')) {
    autofillData.altCountryCode = '+' + autofillData.altCountryCode;
  }

  chrome.storage.local.set({ autofillData }, () => {
    showStatus('Settings saved successfully! ✓', 'success');
  });
}

// Clear all settings
function clearSettings() {
  if (confirm('Are you sure you want to clear all saved data?')) {
    chrome.storage.local.remove(['autofillData'], () => {
      // Clear form fields
      document.getElementById('settingsForm').reset();
      // Reset default country codes
      document.getElementById('countryCode').value = '+91';
      document.getElementById('altCountryCode').value = '+91';
      showStatus('All data cleared successfully! ✓', 'success');
    });
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;

  // Hide status after 3 seconds
  setTimeout(() => {
    statusEl.className = 'status';
  }, 3000);
}