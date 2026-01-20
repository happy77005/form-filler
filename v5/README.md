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
| **Visual Feedback** | Fields highlight when filled |
| **Queue Preview** | Hover over the floating button to see the fill queue |
| **Persistent State** | Queue position is saved across page reloads |

## 🔧 Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `v5` folder
5. The extension icon will appear in your toolbar

## 📋 Fill Order

The extension fills fields in this order:
1. First Name → Middle Name → Last Name
2. Email → Phone
3. Date of Birth → Age → Gender → Nationality
4. House No → Building → Area → Landmark → City → State → Pincode
5. Qualification → Organization → Passing Year
6. LinkedIn → Portfolio → GitHub

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Double-click` | Fill current field & advance |
| `Ctrl+Shift+R` | Reset queue to start |

## 🔄 Resetting the Queue

- Click the floating button when all fields are filled
- Or use `Ctrl+Shift+R` on any page
- Or click "Reset Queue" in the popup

## 📁 Files

- `manifest.json` - Extension configuration
- `content.js` - Core sequential fill logic
- `content.css` - UI styles for button, notifications
- `popup.html` - Settings popup UI
- `popup.js` - Popup data management
- `states.json` - Indian states for autocomplete

## 🐛 Troubleshooting

**Fields not filling?**
- Make sure you've saved data in the popup first
- Check that the field is not disabled or readonly
- Try refreshing the page

**Clipboard not working?**
- Some browsers require clipboard permission
- Try clicking once on the page first

---

**Version:** 5.0.0  
**Compatibility:** Chrome/Edge (Manifest V3)
