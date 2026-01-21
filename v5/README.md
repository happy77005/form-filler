# Sequential Form Fill Pro v5

**Double-click to fill form fields sequentially with automatic clipboard advancement.**

## 🎯 How It Works

1. **Save Your Data** - Open the extension popup and fill in your personal details
2. **Visit a Form** - Navigate to any webpage with a form
3. **Double-Click** - Double-click on the first form field to fill it
4. **Auto-Advance** - The extension automatically copies the next value to your clipboard
5. **Repeat** - Double-click the next field, and so on until complete!

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **Sequential Fill** | Fields are filled in a predefined order |
| **Clipboard Auto-Advance** | After each fill, the next value is copied to clipboard |
| **🆕 Scan Form** | Detect field order from any form by selecting text |
| **Import/Export** | Export data as JSON, import from JSON |
| **Visual Feedback** | Fields highlight when filled |
| **Queue Preview** | Hover over the floating button to see the fill queue |

## 🔍 Scan Form (Custom Order)

For forms that don't match the default fill order:

1. Click the **"🔍 Scan Form"** button
2. **Select text** containing the form's field labels (drag to highlight)
3. Extension **detects** field names like "First Name", "Email", etc.
4. Click **"Apply Order"** to set custom fill sequence
5. Now double-click fills in YOUR form's order!

**Example text to select:**
```
First Name . Required
Last Name . Required  
Personal Email Address . Required
Cellular Number . Required
```

## 🔧 Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `v5` folder
5. The extension icon will appear in your toolbar

## 📋 Default Fill Order

1. First Name → Middle Name → Last Name
2. Email → Phone
3. Date of Birth → Age → Gender → Nationality
4. Address fields (House No, Building, Area, City, State, Pincode)
5. Education (Qualification, Organization, Starting Year, Passing Year)
6. Links (LinkedIn, Portfolio, GitHub)

## ⌨️ Shortcuts

| Action | Method |
|--------|--------|
| Fill field | `Double-click` on any form field |
| Reset queue | `Ctrl+Shift+R` or click floating button |
| Scan form | Click "🔍 Scan Form" button |

## 📦 Import/Export

- **Export**: Downloads your data as a JSON file
- **Import**: Paste JSON data to restore settings

---

**Version:** 5.1.0  
**Compatibility:** Chrome/Edge (Manifest V3)

