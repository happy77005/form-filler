# Nationality Auto-Conversion Feature

## Overview
The extension now automatically converts country names to their proper nationality forms when filling nationality fields.

## How It Works

When a form has a "Nationality" field, the extension:
1. Detects the field using patterns: `nationality`, `citizen`, `citizenship`, `country of citizenship`
2. Takes the stored country name (e.g., "India")
3. Converts it to nationality form (e.g., "Indian")
4. Fills the field with the converted value

## Conversion Rules

### 1. Special Cases (60+ Countries)
Exact matches for common countries with irregular nationality forms:

| Country | Nationality |
|---------|-------------|
| India | Indian |
| USA / America / United States | American |
| UK / Britain / United Kingdom | British |
| England | English |
| France | French |
| Spain | Spanish |
| Germany | German |
| Italy | Italian |
| China | Chinese |
| Japan | Japanese |
| Korea | Korean |
| Russia | Russian |
| Canada | Canadian |
| Australia | Australian |
| Brazil | Brazilian |
| Mexico | Mexican |
| Greece | Greek |
| Turkey | Turkish |
| Pakistan | Pakistani |
| Bangladesh | Bangladeshi |
| Sri Lanka | Sri Lankan |
| Nepal | Nepali |
| Thailand | Thai |
| Vietnam | Vietnamese |
| Philippines | Filipino |
| Indonesia | Indonesian |
| Malaysia | Malaysian |
| Singapore | Singaporean |
| Netherlands / Holland | Dutch |
| Belgium | Belgian |
| Switzerland | Swiss |
| Sweden | Swedish |
| Norway | Norwegian |
| Denmark | Danish |
| Finland | Finnish |
| Poland | Polish |
| Portugal | Portuguese |
| Ireland | Irish |
| Scotland | Scottish |
| Wales | Welsh |
| New Zealand | New Zealander |
| South Africa | South African |
| Nigeria | Nigerian |
| Kenya | Kenyan |
| Ethiopia | Ethiopian |
| Ghana | Ghanaian |

### 2. Already Nationality Form
If the stored value already ends with nationality suffixes, it's returned as-is (with proper capitalization):
- Ends with `an`: American, Indian, etc.
- Ends with `ian`: Italian, Brazilian, etc.
- Ends with `ese`: Chinese, Japanese, etc.
- Ends with `ish`: British, Spanish, etc.
- Ends with `i`: Pakistani, Nepali, etc.

### 3. Default Rules

#### Rule A: Countries ending with 'a'
Replace 'a' with 'an':
- India → Indian
- China → Chinese (handled by special case)
- Korea → Korean
- Australia → Australian

#### Rule B: Other countries
Add 'an' suffix:
- Jordan → Jordanian
- Cuba → Cuban
- Panama → Panamanian

## Examples

### Example 1: India
**Stored Value:** "India"  
**Form Field:** "Nationality"  
**Filled Value:** "Indian"

### Example 2: United States
**Stored Value:** "USA" or "United States" or "America"  
**Form Field:** "Nationality"  
**Filled Value:** "American"

### Example 3: United Kingdom
**Stored Value:** "UK" or "Britain" or "United Kingdom"  
**Form Field:** "Nationality"  
**Filled Value:** "British"

### Example 4: Already Nationality
**Stored Value:** "Indian"  
**Form Field:** "Nationality"  
**Filled Value:** "Indian" (unchanged)

### Example 5: Unknown Country
**Stored Value:** "Atlantis"  
**Form Field:** "Nationality"  
**Filled Value:** "Atlantisan" (default rule: add 'an')

## Usage

### In Extension Settings
1. Enter your country name in the "Nationality" field
2. You can enter either:
   - Country name: "India", "USA", "UK"
   - Nationality form: "Indian", "American", "British"
3. The extension will automatically convert when filling forms

### Supported Input Formats
- Full country names: "India", "United States", "United Kingdom"
- Common abbreviations: "USA", "UK", "UAE"
- Informal names: "America", "Britain", "Holland"
- Already nationality: "Indian", "American", "British"

## Field Detection

The conversion is triggered when the field matches any of these patterns:
- `nationality`
- `citizen`
- `citizenship`
- `country of citizenship`

## Technical Details

### Function: `convertToNationality(country)`

**Parameters:**
- `country` (string): Country name or nationality

**Returns:**
- (string): Proper nationality form

**Logic Flow:**
1. Check if empty → return empty string
2. Normalize to lowercase
3. Check special cases dictionary → return if found
4. Check if already nationality form → return capitalized
5. Apply default rules:
   - If ends with 'a' → replace with 'an'
   - Otherwise → add 'an'

### Code Location
File: `content.js`  
Function: `convertToNationality()`  
Line: ~340-434

## Limitations

### Not Covered
Some rare or complex cases may not be handled:
- Very obscure countries
- Historical countries
- Disputed territories
- Some special cases with irregular forms

### Workaround
If your nationality isn't converting correctly:
1. Enter the nationality form directly (e.g., "Indian" instead of "India")
2. The extension will detect it's already in nationality form
3. It will be used as-is

## Adding New Countries

To add support for a new country:

1. Open `content.js`
2. Find the `convertToNationality()` function
3. Add entry to `specialCases` object:
```javascript
'country name': 'Nationality Form',
```

Example:
```javascript
'morocco': 'Moroccan',
'peru': 'Peruvian',
```

## Testing

### Test Cases

1. **Common Countries**
   - Input: "India" → Output: "Indian" ✓
   - Input: "USA" → Output: "American" ✓
   - Input: "UK" → Output: "British" ✓

2. **Already Nationality**
   - Input: "Indian" → Output: "Indian" ✓
   - Input: "American" → Output: "American" ✓

3. **Default Rules**
   - Input: "Albania" → Output: "Albanian" ✓
   - Input: "Jordan" → Output: "Jordanian" ✓

4. **Special Cases**
   - Input: "Netherlands" → Output: "Dutch" ✓
   - Input: "Philippines" → Output: "Filipino" ✓

## Benefits

1. **User Convenience**: Enter country name once, works everywhere
2. **Flexibility**: Accepts both country and nationality forms
3. **Accuracy**: Handles irregular forms correctly
4. **Coverage**: 60+ countries with special handling
5. **Fallback**: Default rules for unlisted countries

## Future Enhancements

Potential improvements:
- [ ] Support for dual nationalities
- [ ] Regional variations (e.g., "Texan" for Texas)
- [ ] Historical nationalities
- [ ] Ethnic groups vs citizenship
- [ ] Multi-language support

---

**Version:** 2.2.0  
**Feature Added:** December 2025  
**Status:** Active ✓  
**Coverage:** 60+ countries with special cases
