# Google Forms Auto-Fill Field Mapping

## Overview
This document explains how the extension fills Google Forms fields in top-to-bottom order, matching each field to the appropriate stored data.

## Your Scenario - Field Mapping

### Google Form Fields → Extension Data

| Google Form Field | Extension Matches | Filled With | Source Field |
|-------------------|-------------------|-------------|--------------|
| **Full Name** * | `full name`, `name` | First + Middle + Last | firstName + middleName + lastName |
| **Email** * | `email`, `mail`, type="email" | Email address | email |
| **Phone number** * | `phone`, `mobile`, `contact` | Country code + Number | countryCode + phoneNational |
| **College/University** * | `college`, `university`, `institute` | College name | organization |
| **Educational qualification** * | `qualification`, `degree`, `education` | Degree/Course | qualification |
| **Passing Year** * | `passing year`, `graduation year` | Year | passingYear |
| **Current Location** * | `current location`, `location` | Area + City or City + State | area + city OR city + state |

## How It Works

### 1. **Scanning Process**
The extension scans fields in **top-to-bottom order** as they appear in the DOM:
```javascript
// Get all fillable form elements
const fields = getAllFillableFields();

// Process each field in order
fields.forEach(field => {
  const fieldInfo = analyzeField(field);
  const value = matchFieldToData(fieldInfo, data);
  if (value && shouldFillField(field)) {
    fillField(field, value);
  }
});
```

### 2. **Field Analysis**
For each field, the extension analyzes:
- Label text
- Field name attribute
- Field ID
- Placeholder text
- ARIA label
- Input type
- Autocomplete attribute

### 3. **Pattern Matching**
Fields are matched using normalized text patterns (case-insensitive, symbol-removed).

## Detailed Field Mapping

### 1. Full Name
**Google Form Label:** "Full Name"

**Detection Patterns:**
- `full name`, `fullname`, `complete name`
- `your name`, `applicant name`, `student name`
- Generic `name` (if not first/last/middle)

**Filling Logic:**
```javascript
const parts = [firstName, middleName, lastName].filter(Boolean);
return parts.join(' '); // "John Michael Doe"
```

**Example:**
- Stored: firstName="John", middleName="Michael", lastName="Doe"
- Filled: "John Michael Doe"

---

### 2. Email
**Google Form Label:** "Email"

**Detection Patterns:**
- `email`, `e mail`, `mail`
- `email address`, `mail address`
- `type="email"` (highest priority)

**Exclusions:**
- `username`, `login`, `user id`

**Filling Logic:**
```javascript
if (type === 'email' || matches 'email') {
  if (!matches 'username') {
    return email; // "john.doe@example.com"
  }
}
```

**Example:**
- Stored: email="john.doe@example.com"
- Filled: "john.doe@example.com"

---

### 3. Phone Number
**Google Form Label:** "Phone number"

**Detection Patterns:**
- `phone`, `phone number`, `mobile`
- `contact number`, `telephone`, `tel`
- `type="tel"`

**Filling Logic:**
```javascript
// For combined phone fields
if (isCombinedField) {
  return countryCode + phoneNational; // "+919876543210"
}
// For separate fields
// Country code field gets: "+91"
// Number field gets: "9876543210"
```

**Example:**
- Stored: countryCode="+91", phoneNational="9876543210"
- Filled: "+919876543210" (combined) OR separate fields

---

### 4. College/University
**Google Form Label:** "College/University"

**Detection Patterns:**
- `college`, `university`, `institute`
- `institution`, `school name`
- `educational institution`, `alma mater`

**Exclusions:**
- `high school`, `secondary school`

**Filling Logic:**
```javascript
if (matches 'college' || 'university' || 'institute') {
  if (!matches 'high school') {
    return organization; // "Harvard University"
  }
}
```

**Example:**
- Stored: organization="Harvard University"
- Filled: "Harvard University"

---

### 5. Educational Qualification
**Google Form Label:** "Educational qualification"

**Detection Patterns:**
- `qualification`, `educational qualification`
- `degree`, `education level`
- `highest qualification`, `academic qualification`
- `education`, `course`

**Exclusions:**
- `year`, `college`, `university`, `school name`

**Filling Logic:**
```javascript
if (matches 'qualification' || 'degree' || 'education') {
  if (!matches 'year' || 'college') {
    return qualification; // "B.Tech"
  }
}
```

**Example:**
- Stored: qualification="B.Tech"
- Filled: "B.Tech"

**Common Values:**
- "B.Tech", "B.E.", "B.Sc", "B.Com", "B.A."
- "M.Tech", "M.E.", "M.Sc", "M.Com", "M.A.", "MBA"
- "Ph.D.", "Diploma", "12th", "10th"

---

### 6. Passing Year
**Google Form Label:** "Passing Year"

**Detection Patterns:**
- `passing year`, `graduation year`
- `year of passing`, `year of graduation`
- `completion year`, `passout year`
- `graduated year`, `graduating year`

**Exclusions:**
- `birth`, `dob`, `experience`

**Filling Logic:**
```javascript
if (matches 'passing year' || 'graduation year') {
  if (!matches 'birth' || 'dob') {
    return passingYear; // "2024"
  }
}
```

**Example:**
- Stored: passingYear="2024"
- Filled: "2024"

---

### 7. Current Location
**Google Form Label:** "Current Location"

**Detection Patterns:**
- `current location`, `present location`
- `current address`, `present address`
- `location`, `current city`

**Exclusions:**
- `permanent`, `home`, `postal`

**Filling Logic:**
```javascript
if (matches 'current location') {
  // Priority 1: Area + City
  if (area && city) {
    return `${area}, ${city}`; // "Andheri West, Mumbai"
  }
  // Priority 2: City + State
  if (city && state) {
    return `${city}, ${state}`; // "Mumbai, Maharashtra"
  }
  // Priority 3: City or State
  return city || state;
}
```

**Example:**
- Stored: area="Andheri West", city="Mumbai", state="Maharashtra"
- Filled: "Andheri West, Mumbai"

## Extension Settings Required

To fill all these fields, configure in extension popup:

### Personal Information
- ✅ First Name: "John"
- ✅ Middle Name: "Michael" (optional)
- ✅ Last Name: "Doe"

### Contact Information
- ✅ Email: "john.doe@example.com"
- ✅ Country Code: "+91"
- ✅ Phone Number: "9876543210"

### Address Information
- ✅ Area/Locality: "Andheri West"
- ✅ City: "Mumbai"
- ✅ State: "Maharashtra"

### Professional Information
- ✅ College/University: "Harvard University"
- ✅ Educational Qualification: "B.Tech"
- ✅ Passing Year: "2024"

## Filling Order

The extension fills fields in **DOM order** (top to bottom):

1. **Full Name** → "John Michael Doe"
2. **Email** → "john.doe@example.com"
3. **Phone number** → "+919876543210"
4. **College/University** → "Harvard University"
5. **Educational qualification** → "B.Tech"
6. **Passing Year** → "2024"
7. **Current Location** → "Andheri West, Mumbai"

## Google Forms Specific Features

### Required Fields (*)
- Extension detects and fills required fields
- Red asterisks in Google Forms indicate required fields
- Extension fills all matched fields regardless of required status

### Field Types
Google Forms uses various input types:
- **Text inputs:** Full Name, College, Qualification
- **Email inputs:** Email (type="email")
- **Tel inputs:** Phone number (type="tel")
- **Number inputs:** Passing Year (sometimes)

### Validation
- Extension fills valid data
- Google Forms validates after filling
- Email format: Validated by browser
- Phone format: Depends on form settings

## Troubleshooting

### Field Not Filling?

**Check:**
1. Is the field visible and enabled?
2. Is the data saved in extension settings?
3. Does the field label match detection patterns?
4. Is the field already filled?

**Debug:**
- Open browser console (F12)
- Look for "Auto-fill error" messages
- Check which fields were detected

### Wrong Data Filled?

**Possible Causes:**
1. Field label is ambiguous
2. Multiple patterns match
3. Exclusion pattern triggered

**Solution:**
- Check field label text
- Verify stored data in extension
- Report issue with field details

### Field Skipped?

**Reasons:**
1. Field type excluded (password, hidden, etc.)
2. Field already has value
3. Field is disabled/readonly
4. Pattern not recognized

**Fix:**
- Clear existing field value
- Enable the field
- Add new pattern to extension

## Testing Your Setup

### Step-by-Step Test

1. **Configure Extension:**
   - Open extension popup
   - Fill all required fields
   - Click "Save Settings"

2. **Open Google Form:**
   - Navigate to your Google Form
   - Click the "✨ Auto Fill" button

3. **Verify Filling:**
   - Check each field filled correctly
   - Verify order (top to bottom)
   - Confirm data accuracy

4. **Submit Test:**
   - Review all fields
   - Submit form
   - Check for validation errors

### Expected Results

✅ All 7 fields filled correctly  
✅ Filled in top-to-bottom order  
✅ No validation errors  
✅ Data matches extension settings  
✅ Required fields marked with * are filled  

## Advanced Features

### Smart Detection
- Handles variations in field labels
- Case-insensitive matching
- Symbol normalization (_, -, :, *)

### Exclusion Logic
- Prevents wrong field matching
- Context-aware filling
- Priority-based selection

### Format Handling
- Phone: Combined or separate
- Name: Full or split
- Location: Short or detailed

## Future Enhancements

Planned improvements:
- [ ] Dropdown selection for qualification
- [ ] Multiple phone number formats
- [ ] International address formats
- [ ] Custom field mapping
- [ ] Form-specific profiles

---

**Version:** 2.2.0  
**Last Updated:** December 2025  
**Status:** Fully Functional ✓  
**Google Forms Compatible:** Yes ✓
