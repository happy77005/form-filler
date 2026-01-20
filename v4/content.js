// Wait for page to fully load before injecting button
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init() {
  // Check if page has form elements before showing button
  if (hasFormElements()) {
    injectAutoFillButton();
  }
}

// Check if page contains fillable form elements
function hasFormElements() {
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])');
  const textareas = document.querySelectorAll('textarea');
  const selects = document.querySelectorAll('select');

  return inputs.length > 0 || textareas.length > 0 || selects.length > 0;
}

// Inject the floating Auto-Fill button
function injectAutoFillButton() {
  // Avoid duplicate buttons
  if (document.getElementById('autofill-floating-btn')) return;

  const button = document.createElement('button');
  button.id = 'autofill-floating-btn';
  button.innerHTML = '✨ Auto Fill';
  button.title = 'Auto-fill form fields with your saved data';

  button.addEventListener('click', handleAutoFill);

  document.body.appendChild(button);
}

// Main auto-fill handler
async function handleAutoFill() {
  const button = document.getElementById('autofill-floating-btn');

  // Prevent multiple clicks
  if (button.classList.contains('filling')) return;

  button.classList.add('filling');
  button.innerHTML = '⏳ Filling...';

  try {
    // Retrieve saved data from storage
    const result = await chrome.storage.local.get(['autofillData']);

    if (!result.autofillData) {
      alert('⚠️ No saved data found. Please configure your settings in the extension popup first.');
      resetButton(button);
      return;
    }

    const data = result.autofillData;
    let filledCount = 0;

    // Get all fillable form elements
    const fields = getAllFillableFields();

    // First pass: Identify phone field groups (country code + national number)
    const phoneFieldGroups = identifyPhoneFieldGroups(fields);
    const processedFields = new Set();

    // Fill phone field groups first
    phoneFieldGroups.forEach(group => {
      if (fillPhoneFieldGroup(group, data)) {
        filledCount += group.fields.length;
        group.fields.forEach(f => processedFields.add(f));
      }
    });

    // Second pass: Fill remaining fields
    fields.forEach(field => {
      if (processedFields.has(field)) return; // Skip already processed phone fields

      const fieldInfo = analyzeField(field);
      const value = matchFieldToData(fieldInfo, data);

      if (value && shouldFillField(field)) {
        fillField(field, value);
        filledCount++;
      }
    });

    // Show success feedback
    button.innerHTML = `✓ Filled ${filledCount} field${filledCount !== 1 ? 's' : ''}`;
    setTimeout(() => resetButton(button), 2000);

  } catch (error) {
    console.error('Auto-fill error:', error);
    alert('❌ An error occurred while auto-filling. Please try again.');
    resetButton(button);
  }
}

// Get all fillable form fields on the page
function getAllFillableFields() {
  const fields = [];

  // Get visible input fields (excluding unsafe types)
  const inputs = document.querySelectorAll('input');
  inputs.forEach(input => {
    if (isVisible(input) && !isExcludedInputType(input)) {
      fields.push(input);
    }
  });

  // Get visible textareas
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    if (isVisible(textarea)) {
      fields.push(textarea);
    }
  });

  // Get visible select dropdowns
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    if (isVisible(select)) {
      fields.push(select);
    }
  });

  return fields;
}

// Check if field type should be excluded for safety
function isExcludedInputType(input) {
  const excludedTypes = [
    'password', 'hidden', 'submit', 'button', 'reset',
    'file', 'image', 'checkbox', 'radio'
  ];

  const type = (input.type || 'text').toLowerCase();

  // Exclude password fields
  if (excludedTypes.includes(type)) return true;

  // Exclude OTP/verification code fields (common patterns)
  const name = (input.name || '').toLowerCase();
  const id = (input.id || '').toLowerCase();
  const placeholder = (input.placeholder || '').toLowerCase();

  const otpPatterns = ['otp', 'verification', 'verify', 'code', 'captcha', 'pin'];
  const hasOtpPattern = otpPatterns.some(pattern =>
    name.includes(pattern) || id.includes(pattern) || placeholder.includes(pattern)
  );

  return hasOtpPattern;
}

// Check if element is visible to user
function isVisible(el) {
  if (!el.offsetParent && el.offsetWidth === 0 && el.offsetHeight === 0) {
    return false;
  }

  const style = window.getComputedStyle(el);
  return style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0';
}

// Identify phone field groups (country code + national number pairs)
function identifyPhoneFieldGroups(fields) {
  const groups = [];
  const phoneFields = fields.filter(f => isPhoneField(analyzeField(f)));

  // Look for adjacent phone fields that might be a country code + national number pair
  for (let i = 0; i < phoneFields.length; i++) {
    const field1 = phoneFields[i];
    const info1 = analyzeField(field1);

    // Check if this is a country code field
    if (isCountryCodeField(info1)) {
      // Look for the next phone field that could be the national number
      for (let j = i + 1; j < phoneFields.length; j++) {
        const field2 = phoneFields[j];
        const info2 = analyzeField(field2);

        // Check if they're related (same form, nearby in DOM)
        if (areFieldsRelated(field1, field2) && !isCountryCodeField(info2)) {
          groups.push({
            type: 'separate',
            fields: [field1, field2],
            countryCodeField: field1,
            nationalField: field2
          });
          break;
        }
      }
    }
  }

  return groups;
}

// Check if a field is phone-related
function isPhoneField(fieldInfo) {
  const text = fieldInfo.allText;
  const type = fieldInfo.type;

  // Check type="tel"
  if (type === 'tel') return true;

  // Check for phone-related keywords
  const phonePatterns = ['phone', 'mobile', 'cell', 'tel', 'contact'];
  return phonePatterns.some(pattern => text.includes(pattern));
}

// Check if a field is specifically for country code
function isCountryCodeField(fieldInfo) {
  const text = fieldInfo.allText;
  const placeholder = fieldInfo.placeholder;
  const maxLength = fieldInfo.element.maxLength;

  // Look for country code indicators
  const hasCountryCodeKeyword = text.includes('country') ||
    text.includes('code') ||
    text.includes('dial');

  // Check if placeholder contains + symbol
  const hasPlus = placeholder.includes('+');

  // Check if maxlength is small (typically 3-5 for country codes)
  const hasSmallMaxLength = maxLength > 0 && maxLength <= 5;

  return hasCountryCodeKeyword || (hasPlus && hasSmallMaxLength);
}

// Check if two fields are related (same form, nearby in DOM)
function areFieldsRelated(field1, field2) {
  // Check if in same form
  const form1 = field1.closest('form');
  const form2 = field2.closest('form');

  if (form1 && form2 && form1 === form2) return true;

  // Check if in same parent container
  const parent1 = field1.parentElement;
  const parent2 = field2.parentElement;

  if (parent1 === parent2) return true;

  // Check if within reasonable DOM distance
  const allInputs = Array.from(document.querySelectorAll('input'));
  const index1 = allInputs.indexOf(field1);
  const index2 = allInputs.indexOf(field2);

  return Math.abs(index1 - index2) <= 3;
}

// Fill phone field group (country code + national number)
function fillPhoneFieldGroup(group, data) {
  if (!data.countryCode || !data.phoneNational) return false;

  const { countryCodeField, nationalField } = group;

  // Check if both fields should be filled
  if (!shouldFillField(countryCodeField) || !shouldFillField(nationalField)) {
    return false;
  }

  // Fill country code
  fillField(countryCodeField, data.countryCode);

  // Fill national number
  fillField(nationalField, data.phoneNational);

  return true;
}

// Normalize text for better matching (lowercase, trim, remove symbols)
function normalizeText(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[_\-:*]/g, ' ')  // Replace common separators with space
    .replace(/\s+/g, ' ')       // Collapse multiple spaces
    .trim();
}

// Analyze field to determine what type of data it expects
function analyzeField(field) {
  const maxLength = field.maxLength || 0;

  const info = {
    element: field,
    name: normalizeText(field.name || ''),
    id: normalizeText(field.id || ''),
    type: (field.type || 'text').toLowerCase(),
    placeholder: normalizeText(field.placeholder || ''),
    autocomplete: (field.autocomplete || '').toLowerCase(),
    label: normalizeText(findLabelText(field)),
    ariaLabel: normalizeText(field.getAttribute('aria-label') || ''),
    maxLength: maxLength
  };

  // Combine all text clues for matching (normalized)
  info.allText = normalizeText(`${info.name} ${info.id} ${info.placeholder} ${info.label} ${info.ariaLabel} ${info.autocomplete}`);

  return info;
}

// Find associated label text for a field
function findLabelText(field) {
  // Method 1: Label with 'for' attribute
  if (field.id) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    if (label) return label.textContent.trim();
  }

  // Method 2: Parent label
  const parentLabel = field.closest('label');
  if (parentLabel) {
    return parentLabel.textContent.replace(field.value, '').trim();
  }

  // Method 3: Previous sibling label
  let prev = field.previousElementSibling;
  while (prev) {
    if (prev.tagName === 'LABEL') {
      return prev.textContent.trim();
    }
    if (prev.tagName === 'DIV' || prev.tagName === 'SPAN') {
      const label = prev.querySelector('label');
      if (label) return label.textContent.trim();
    }
    prev = prev.previousElementSibling;
  }

  return '';
}

// Convert country name to nationality form
function convertToNationality(country) {
  if (!country) return '';

  const countryLower = country.toLowerCase().trim();

  // Special cases - exact matches
  const specialCases = {
    'india': 'Indian',
    'america': 'American',
    'united states': 'American',
    'usa': 'American',
    'us': 'American',
    'britain': 'British',
    'uk': 'British',
    'united kingdom': 'British',
    'england': 'English',
    'france': 'French',
    'spain': 'Spanish',
    'germany': 'German',
    'italy': 'Italian',
    'china': 'Chinese',
    'japan': 'Japanese',
    'korea': 'Korean',
    'south korea': 'Korean',
    'north korea': 'Korean',
    'russia': 'Russian',
    'canada': 'Canadian',
    'australia': 'Australian',
    'brazil': 'Brazilian',
    'mexico': 'Mexican',
    'argentina': 'Argentinian',
    'egypt': 'Egyptian',
    'greece': 'Greek',
    'turkey': 'Turkish',
    'iran': 'Iranian',
    'iraq': 'Iraqi',
    'israel': 'Israeli',
    'saudi arabia': 'Saudi',
    'uae': 'Emirati',
    'united arab emirates': 'Emirati',
    'pakistan': 'Pakistani',
    'bangladesh': 'Bangladeshi',
    'sri lanka': 'Sri Lankan',
    'nepal': 'Nepali',
    'thailand': 'Thai',
    'vietnam': 'Vietnamese',
    'philippines': 'Filipino',
    'indonesia': 'Indonesian',
    'malaysia': 'Malaysian',
    'singapore': 'Singaporean',
    'netherlands': 'Dutch',
    'holland': 'Dutch',
    'belgium': 'Belgian',
    'switzerland': 'Swiss',
    'sweden': 'Swedish',
    'norway': 'Norwegian',
    'denmark': 'Danish',
    'finland': 'Finnish',
    'poland': 'Polish',
    'portugal': 'Portuguese',
    'ireland': 'Irish',
    'scotland': 'Scottish',
    'wales': 'Welsh',
    'new zealand': 'New Zealander',
    'south africa': 'South African',
    'nigeria': 'Nigerian',
    'kenya': 'Kenyan',
    'ethiopia': 'Ethiopian',
    'ghana': 'Ghanaian'
  };

  // Check special cases first
  if (specialCases[countryLower]) {
    return specialCases[countryLower];
  }

  // If already ends with common nationality suffixes, return as is (capitalize first letter)
  if (countryLower.endsWith('an') || countryLower.endsWith('ian') ||
    countryLower.endsWith('ese') || countryLower.endsWith('ish') ||
    countryLower.endsWith('i')) {
    return country.charAt(0).toUpperCase() + country.slice(1);
  }

  // Default rule: add "an" suffix for most countries
  // Capitalize first letter
  const capitalized = country.charAt(0).toUpperCase() + country.slice(1);

  // If ends with 'a', replace with 'an' (e.g., "India" -> "Indian")
  if (countryLower.endsWith('a')) {
    return capitalized.slice(0, -1) + 'an';
  }

  // Otherwise just add 'an'
  return capitalized + 'an';
}

// Match field to appropriate data value using intelligent pattern matching
function matchFieldToData(fieldInfo, data) {
  const text = fieldInfo.allText;

  // === PHONE NUMBER HANDLING (ENHANCED) ===
  // Check if this is a phone field
  if (isPhoneField(fieldInfo)) {
    return matchPhoneField(fieldInfo, data);
  }

  // First Name matching patterns
  if (matchesPattern(text, ['first', 'fname', 'firstname', 'given', 'forename']) &&
    !matchesPattern(text, ['last', 'sur'])) {
    return data.firstName;
  }

  // Middle Name matching patterns
  if (matchesPattern(text, ['middle', 'mname', 'middlename'])) {
    return data.middleName;
  }

  // Last Name matching patterns
  if (matchesPattern(text, ['last', 'lname', 'lastname', 'surname', 'family'])) {
    return data.lastName;
  }

  // Full Name (Task 3 - combine first, middle, last if field expects full name)
  if (matchesPattern(text, ['full name', 'fullname', 'complete name', 'your name', 'applicant name', 'candidate name', 'student name', 'person name']) &&
    !matchesPattern(text, ['first', 'last', 'middle', 'user', 'company'])) {
    const parts = [data.firstName, data.middleName, data.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '';
  }

  // Generic "name" field - also treat as full name if not specifically first/last/middle
  if (matchesPattern(text, ['name']) &&
    !matchesPattern(text, ['first', 'last', 'middle', 'user', 'company', 'organization', 'file', 'domain', 'host', 'server', 'database'])) {
    const parts = [data.firstName, data.middleName, data.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : '';
  }

  // Date of Birth matching patterns
  if (matchesPattern(text, ['dob', 'birth', 'birthdate', 'dateofbirth', 'date of birth']) ||
    (fieldInfo.type === 'date' && matchesPattern(text, ['birth']))) {
    return data.dateOfBirth;
  }

  // Age matching patterns
  if (matchesPattern(text, ['age']) && !matchesPattern(text, ['page', 'stage', 'average'])) {
    return data.age;
  }

  // Nationality matching patterns
  // Automatically converts country name to nationality (e.g., "India" -> "Indian")
  if (matchesPattern(text, ['nationality', 'citizen', 'citizenship', 'country of citizenship'])) {
    return convertToNationality(data.nationality);
  }

  // === EMAIL ADDRESS - Enhanced Detection ===
  // Match: email, mail, email address (prefer type="email")
  if (fieldInfo.type === 'email' ||
    fieldInfo.autocomplete.includes('email') ||
    matchesPattern(text, ['email', 'e mail', 'mail address', 'email address', 'e mail address'])) {
    // Exclude username/login fields
    if (!matchesPattern(text, ['username', 'user name', 'login', 'user id'])) {
      return data.email;
    }
  }

  // === STRUCTURED ADDRESS FIELDS (Task 6) ===

  // House/Flat Number
  if (matchesPattern(text, ['house', 'flat', 'apartment', 'apt', 'unit', 'door', 'plot']) &&
    matchesPattern(text, ['no', 'number', '#'])) {
    return data.houseNo;
  }

  // Building/Street
  if (matchesPattern(text, ['building', 'street', 'block']) &&
    !matchesPattern(text, ['city', 'state', 'pin'])) {
    return data.building;
  }

  // Area/Locality
  if (matchesPattern(text, ['area', 'locality', 'sector', 'colony', 'neighborhood', 'neighbourhood'])) {
    return data.area;
  }

  // Landmark
  if (matchesPattern(text, ['landmark', 'near', 'nearby'])) {
    return data.landmark;
  }

  // Generic Address matching patterns (fallback - combine structured fields)
  if (matchesPattern(text, ['address', 'addr', 'residence']) &&
    !matchesPattern(text, ['email', 'mail', 'city', 'state', 'zip', 'postal', 'pin'])) {
    // Combine structured address fields
    const addressParts = [
      data.houseNo,
      data.building,
      data.area,
      data.landmark
    ].filter(Boolean);
    return addressParts.length > 0 ? addressParts.join(', ') : '';
  }

  // City matching patterns
  if (matchesPattern(text, ['city', 'town', 'municipality']) ||
    fieldInfo.autocomplete.includes('city')) {
    return data.city;
  }

  // === CURRENT LOCATION - Enhanced Detection ===
  // Match: current location, location, area (prefer area + city over full address)
  if (matchesPattern(text, ['current location', 'present location', 'current address', 'present address']) &&
    !matchesPattern(text, ['permanent', 'home', 'postal'])) {
    // Prefer area + city for short location fields
    if (data.area && data.city) {
      return `${data.area}, ${data.city}`;
    }
    // Fallback to city + state
    if (data.city && data.state) {
      return `${data.city}, ${data.state}`;
    }
    return data.city || data.state || data.area || '';
  }

  // Generic "location" field - shorter format
  if (matchesPattern(text, ['location', 'current city']) &&
    !matchesPattern(text, ['permanent', 'home', 'full address', 'complete address'])) {
    if (data.city && data.state) {
      return `${data.city}, ${data.state}`;
    }
    return data.city || data.state || '';
  }

  // State matching patterns
  if (matchesPattern(text, ['state', 'province', 'region']) ||
    fieldInfo.autocomplete.includes('state') ||
    fieldInfo.autocomplete.includes('province')) {
    return data.state;
  }

  // Pincode/ZIP matching patterns
  if (matchesPattern(text, ['zip', 'postal', 'pincode', 'pin code', 'postcode', 'zipcode', 'pin']) ||
    fieldInfo.autocomplete.includes('postal')) {
    return data.pincode;
  }

  // Job Title / Designation matching patterns
  if (matchesPattern(text, ['job', 'title', 'designation', 'position', 'role', 'occupation']) &&
    !matchesPattern(text, ['college', 'university', 'school'])) {
    return data.jobTitle;
  }

  // === COLLEGE / UNIVERSITY / INSTITUTE - Enhanced Detection ===
  // Match: college, university, institute (educational institutions)
  if (matchesPattern(text, ['college', 'university', 'institute', 'institution', 'school name', 'educational institution', 'alma mater']) &&
    !matchesPattern(text, ['high school', 'secondary school'])) {
    return data.organization;
  }

  // Organization matching patterns (for work/company)
  if (matchesPattern(text, ['organization', 'organisation', 'company', 'employer', 'firm', 'workplace']) &&
    !matchesPattern(text, ['college', 'university', 'school'])) {
    return data.organization;
  }

  // === PASSING YEAR - Enhanced Detection ===
  // Match: passing year, graduation year, year of passing (numeric year only)
  if (matchesPattern(text, ['passing year', 'graduation year', 'year of passing', 'year of graduation', 'completion year', 'passout year', 'pass out year', 'graduated year', 'graduating year'])) {
    return data.passingYear;
  }

  // Generic year field (be careful with context)
  if (matchesPattern(text, ['year']) &&
    matchesPattern(text, ['passing', 'graduation', 'graduated', 'completion', 'passout', 'pass out']) &&
    !matchesPattern(text, ['birth', 'dob', 'experience'])) {
    return data.passingYear;
  }

  // === EDUCATIONAL QUALIFICATION - Detection ===
  // Match: qualification, degree, education level
  if (matchesPattern(text, ['qualification', 'educational qualification', 'education qualification', 'degree', 'education level', 'highest qualification', 'academic qualification', 'education', 'course']) &&
    !matchesPattern(text, ['year', 'college', 'university', 'school name'])) {
    return data.qualification;
  }

  // LinkedIn URL matching patterns
  if (matchesPattern(text, ['linkedin', 'linked in', 'linkedin profile', 'linkedin url']) ||
    (fieldInfo.type === 'url' && matchesPattern(text, ['linkedin']))) {
    return data.linkedinUrl;
  }

  // Portfolio URL matching patterns
  if (matchesPattern(text, ['portfolio', 'website', 'personal site', 'web site']) &&
    !matchesPattern(text, ['company', 'organization'])) {
    return data.portfolioUrl;
  }

  // GitHub URL matching patterns
  if (matchesPattern(text, ['github', 'git hub', 'github profile', 'github url'])) {
    return data.githubUrl;
  }

  // Gender matching patterns (for select dropdowns)
  if (matchesPattern(text, ['gender', 'sex']) && fieldInfo.element.tagName === 'SELECT') {
    return matchGenderOption(fieldInfo.element, data.gender);
  }

  return null;
}

// Enhanced phone field matching with E.164 support
function matchPhoneField(fieldInfo, data) {
  const text = fieldInfo.allText;
  const placeholder = fieldInfo.placeholder;
  const maxLength = fieldInfo.maxLength;

  // Skip if this is an alternate/secondary phone field
  const isAlternate = matchesPattern(text, ['alternate', 'alternative', 'alt', 'secondary', 'second', 'other']);

  // Determine if this is a combined field (expects country code + number)
  const isCombinedField =
    maxLength >= 12 || // Long enough for full international number
    matchesPattern(text, ['with country', 'including country', 'international']) ||
    placeholder.includes('+') ||
    fieldInfo.autocomplete === 'tel';

  // Determine if this is a country code only field
  if (isCountryCodeField(fieldInfo)) {
    return isAlternate ? data.altCountryCode : data.countryCode;
  }

  // If combined field, return E.164 format
  if (isCombinedField) {
    const countryCode = isAlternate ? data.altCountryCode : data.countryCode;
    const national = isAlternate ? data.altPhoneNational : data.phoneNational;

    if (countryCode && national) {
      // Generate E.164 format: +919876543210
      const e164 = countryCode + national;
      return e164;
    }
  }

  // Otherwise, return national number only
  return isAlternate ? data.altPhoneNational : data.phoneNational;
}

// Helper function to check if text matches any pattern
function matchesPattern(text, patterns) {
  return patterns.some(pattern => text.includes(pattern));
}

// Match saved gender value to select dropdown options
function matchGenderOption(selectElement, savedGender) {
  if (!savedGender) return null;

  const options = Array.from(selectElement.options);

  // Try exact match first
  const exactMatch = options.find(opt =>
    opt.value.toLowerCase() === savedGender.toLowerCase()
  );
  if (exactMatch) return exactMatch.value;

  // Try partial match in option text
  const textMatch = options.find(opt =>
    opt.textContent.toLowerCase().includes(savedGender.toLowerCase())
  );
  if (textMatch) return textMatch.value;

  return null;
}

// Check if field should be filled (only fill empty fields)
function shouldFillField(field) {
  // Don't fill if field already has a value (not even partial)
  if (field.value && field.value.trim() !== '') {
    return false;
  }

  // Don't fill if field is disabled or readonly
  if (field.disabled || field.readOnly) {
    return false;
  }

  return true;
}

// Fill field and trigger necessary events for frameworks like React/Vue
function fillField(field, value) {
  // Strip formatting for phone numbers before filling
  const cleanValue = String(value).replace(/[\s\-\(\)]/g, '');

  // Set the value
  field.value = cleanValue;

  // Add visual feedback
  field.classList.add('autofill-highlight');
  setTimeout(() => field.classList.remove('autofill-highlight'), 600);

  // Trigger events for JavaScript frameworks
  // Input event (for real-time validation)
  const inputEvent = new Event('input', { bubbles: true, cancelable: true });
  field.dispatchEvent(inputEvent);

  // Change event (for form state management)
  const changeEvent = new Event('change', { bubbles: true, cancelable: true });
  field.dispatchEvent(changeEvent);

  // Blur event (for validation on field exit)
  const blurEvent = new Event('blur', { bubbles: true, cancelable: true });
  field.dispatchEvent(blurEvent);

  // For React: set native value setter to trigger React's change detection
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(field, cleanValue);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Reset button to original state
function resetButton(button) {
  button.classList.remove('filling');
  button.innerHTML = '✨ Auto Fill';
}