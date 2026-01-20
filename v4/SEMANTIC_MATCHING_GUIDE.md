# Enhanced Semantic Field Detection - Implementation Guide

## Overview
This document describes the enhanced semantic field detection system that identifies and auto-fills fields even when their labels or names differ.

## Detection Strategy

The system uses a multi-layered approach to identify fields:

1. **Associated `<label>` text** - Primary source
2. **`name` attribute** - Common in forms
3. **`id` attribute** - Often descriptive
4. **`placeholder` text** - Hints about expected input
5. **`aria-label` attribute** - Accessibility labels
6. **`type` attribute** - HTML5 input types
7. **`autocomplete` attribute** - Browser hints

### Text Normalization

Before matching, all text is normalized:
- Convert to lowercase
- Trim whitespace
- Replace separators (`_`, `-`, `:`, `*`) with spaces
- Collapse multiple spaces into one

Example:
- `"First_Name"` → `"first name"`
- `"email-address"` → `"email address"`
- `"Full__Name"` → `"full name"`

## Field Identification & Mapping Rules

### 1. Full Name

**Match patterns:**
- `full name`, `fullname`, `complete name`
- `your name`, `applicant name`, `candidate name`
- `student name`, `person name`
- Generic `name` (if not first/last/middle/username)

**Exclusion patterns:**
- `first name`, `last name`, `middle name`
- `username`, `company name`, `file name`
- `domain name`, `host name`, `server name`

**Behavior:**
- Combines: First Name + Middle Name (if available) + Last Name
- Example: "John Michael Doe"
- Filters out empty values automatically

**Implementation:**
```javascript
if (matchesPattern(text, ['full name', 'fullname', 'complete name', 'your name'])) {
  const parts = [data.firstName, data.middleName, data.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '';
}
```

### 2. Email Address

**Match patterns:**
- `email`, `e mail`, `mail`
- `email address`, `mail address`
- `e mail address`
- `type="email"` (highest priority)
- `autocomplete="email"`

**Exclusion patterns:**
- `username`, `user name`
- `login`, `user id`

**Behavior:**
- Only fills valid email fields
- Prefers `type="email"` fields
- Excludes username/login fields

**Implementation:**
```javascript
if (fieldInfo.type === 'email' || 
    fieldInfo.autocomplete.includes('email') ||
    matchesPattern(text, ['email', 'e mail', 'mail address'])) {
  if (!matchesPattern(text, ['username', 'user name', 'login'])) {
    return data.email;
  }
}
```

### 3. Phone Number

**Match patterns:**
- `phone`, `phone number`, `mobile`
- `contact number`, `number`, `tel`
- `cell`, `telephone`
- `type="tel"`

**Detection strategy:**
- Identifies separate country code + number fields
- Detects combined number fields
- Handles alternate/secondary phone numbers

**Format detection:**
1. **Separate fields**: Country code in one field, number in another
2. **Combined field**: Full number with country code (E.164 format)

**Implementation:**
- Uses `isPhoneField()` to detect phone-related fields
- Uses `matchPhoneField()` to determine format and fill appropriately
- Supports both primary and alternate phone numbers

### 4. College / University / Institute

**Match patterns:**
- `college`, `university`, `institute`
- `institution`, `school name`
- `educational institution`, `alma mater`

**Exclusion patterns:**
- `high school`, `secondary school`

**Behavior:**
- Fills using the stored education profile (organization field)
- Distinguishes between educational and work organizations

**Implementation:**
```javascript
if (matchesPattern(text, ['college', 'university', 'institute', 'institution']) &&
    !matchesPattern(text, ['high school', 'secondary school'])) {
  return data.organization;
}
```

### 5. Passing Year

**Match patterns:**
- `passing year`, `graduation year`
- `year of passing`, `year of graduation`
- `completion year`, `passout year`
- `pass out year`, `graduated year`
- `graduating year`

**Exclusion patterns:**
- `birth year`, `dob`, `year of birth`
- `experience years`

**Behavior:**
- Fills numeric year only (e.g., "2024")
- Validates it's related to education, not birth year

**Implementation:**
```javascript
if (matchesPattern(text, ['passing year', 'graduation year', 'year of passing', 
    'completion year', 'passout year'])) {
  return data.passingYear;
}
```

### 6. Current Location

**Match patterns:**
- `current location`, `present location`
- `current address`, `present address`
- `location`, `current city`
- `area`, `locality` (short form)

**Exclusion patterns:**
- `permanent address`, `home address`
- `postal address`, `full address`

**Behavior:**
- Prefers **area + city** instead of full postal address
- Falls back to city + state if area not available
- Uses shorter format for location fields

**Format priority:**
1. Area + City: "Andheri West, Mumbai"
2. City + State: "Mumbai, Maharashtra"
3. City only: "Mumbai"
4. State only: "Maharashtra"

**Implementation:**
```javascript
if (matchesPattern(text, ['current location', 'present location']) &&
    !matchesPattern(text, ['permanent', 'home', 'postal'])) {
  if (data.area && data.city) {
    return `${data.area}, ${data.city}`;
  }
  if (data.city && data.state) {
    return `${data.city}, ${data.state}`;
  }
  return data.city || data.state || data.area || '';
}
```

## Priority Order

Fields are matched in this priority order:

1. **Phone Number** - Highest priority (complex detection)
2. **Email Address** - Type-based detection
3. **Name Fields** - First, Middle, Last, Full
4. **Date/Age** - Date of Birth, Age
5. **Nationality** - Citizenship information
6. **Address Components** - House, Building, Area, Landmark
7. **Location** - Current Location (special handling)
8. **Address** - Full address (fallback)
9. **City/State/Pincode** - Geographic data
10. **Professional** - Job Title, Organization
11. **Education** - College, Passing Year
12. **Social Links** - LinkedIn, Portfolio, GitHub
13. **Gender** - Select dropdowns

## Advanced Features

### Smart Exclusions

The system intelligently excludes fields that might match patterns but aren't the intended field:

- **Username vs Email**: Excludes username fields from email matching
- **Company vs College**: Distinguishes work from education
- **Birth Year vs Passing Year**: Prevents wrong year filling
- **Permanent vs Current**: Different address types

### Context-Aware Matching

Fields are matched based on context:

- **Single Name Field**: Automatically treated as Full Name
- **Short Address Fields**: Use area + city instead of full address
- **Generic "Location"**: Prefers city over full address
- **Year Fields**: Checks surrounding text for context

### Fallback Strategies

When primary matches fail:

1. **Full Address**: Combines structured fields (house, building, area, landmark)
2. **Location**: Falls back from area+city → city+state → city → state
3. **Name**: Generic "name" treated as full name if not specific

## Testing Recommendations

### Test Cases for Each Field Type

1. **Full Name**
   - Label: "Full Name", "Name", "Your Name"
   - Should combine: First + Middle + Last

2. **Email**
   - Label: "Email", "Email Address", "E-mail"
   - Type: `type="email"`
   - Should NOT fill: "Username", "Login"

3. **Phone**
   - Label: "Phone", "Mobile", "Contact Number"
   - Separate: Country Code + Number
   - Combined: Full number with country code

4. **College**
   - Label: "College", "University", "Institute"
   - Should NOT match: "High School"

5. **Passing Year**
   - Label: "Passing Year", "Graduation Year"
   - Should NOT fill: "Birth Year", "Year of Birth"

6. **Current Location**
   - Label: "Current Location", "Location"
   - Format: "Area, City" or "City, State"
   - Should NOT use full postal address

## Implementation Notes

### Code Structure

1. **normalizeText()** - Text preprocessing
2. **analyzeField()** - Field analysis and data extraction
3. **matchFieldToData()** - Pattern matching and value selection
4. **matchesPattern()** - Helper for pattern checking

### Performance Considerations

- Text normalization happens once per field
- Pattern matching uses simple string includes (fast)
- Priority ordering reduces unnecessary checks
- Exclusion patterns prevent false positives

### Maintenance

When adding new patterns:

1. Add to appropriate section in `matchFieldToData()`
2. Include both positive and negative patterns
3. Test with real-world forms
4. Document in this guide

## Common Form Variations

### Name Fields
- "Full Name" → Full name combination
- "Name" → Full name combination
- "First Name" → First name only
- "Last Name" → Last name only

### Email Fields
- "Email" → Email address
- "Email Address" → Email address
- "E-mail" → Email address
- "Mail" → Email address

### Phone Fields
- "Phone Number" → Phone (with country code handling)
- "Mobile" → Phone
- "Contact Number" → Phone
- "Telephone" → Phone

### Location Fields
- "Current Location" → Area + City
- "Location" → City + State
- "Address" → Full address
- "City" → City only

### Education Fields
- "College" → Organization
- "University" → Organization
- "Passing Year" → Year
- "Graduation Year" → Year

## Troubleshooting

### Field Not Filling

1. Check if field is visible and enabled
2. Verify field type isn't excluded (password, hidden, etc.)
3. Check if field already has a value
4. Review console for matching attempts

### Wrong Data Filling

1. Check exclusion patterns
2. Verify priority order
3. Review field label/name/id
4. Check for conflicting patterns

### Performance Issues

1. Reduce number of fields on page
2. Check for infinite loops in matching
3. Verify normalization isn't too expensive
4. Profile with browser dev tools

## Future Enhancements

Potential improvements:

1. **Machine Learning**: Train model on form patterns
2. **Visual Analysis**: Use field position/size for hints
3. **Form Context**: Analyze entire form structure
4. **User Feedback**: Learn from corrections
5. **Multi-language**: Support non-English forms

---

**Version**: 2.1.0  
**Last Updated**: December 2025  
**Status**: Enhanced semantic matching implemented ✓
