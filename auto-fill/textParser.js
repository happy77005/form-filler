/**
 * Text Parser Module
 * Parses copied text into structured field-value pairs using regex.
 * Supports multiple formats:
 * - "First Name*: John" (label with asterisk and colon)
 * - "Last Name: Doe" (label without asterisk)
 * - "Email - john@email.com" (label with dash separator)
 * - Multi-line parsing
 */

const TextParser = {
  /**
   * Main parsing function - extracts fields from copied text
   * @param {string} text - The copied text to parse
   * @returns {Array<{label: string, value: string, index: number}>}
   */
  parse(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const fields = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let index = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Pattern 1: "Label*: Value" or "Label: Value" or "Label - Value"
      // Matches: "First Name*: John", "Email: test@test.com", "Phone - 1234567890"
      const colonPattern = /^([A-Za-z\s\-_]+)[\*\s]*[:\-–—]\s*(.+)$/;
      const match = line.match(colonPattern);
      
      if (match) {
        const label = this.normalizeLabel(match[1]);
        const value = match[2].trim();
        
        if (label && value) {
          fields.push({ label, value, index: index++ });
        }
        continue;
      }

      // Pattern 2: Check if current line is a label and next line is value
      // Matches: "First Name*" followed by "John" on next line
      const labelOnlyPattern = /^([A-Za-z\s\-_]+)[\*\s]*$/;
      const labelMatch = line.match(labelOnlyPattern);
      
      if (labelMatch && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        // Check if next line doesn't look like a label
        if (!nextLine.match(labelOnlyPattern) && !nextLine.match(colonPattern)) {
          const label = this.normalizeLabel(labelMatch[1]);
          const value = nextLine.trim();
          
          if (label && value) {
            fields.push({ label, value, index: index++ });
            i++; // Skip next line since we consumed it as value
          }
        }
      }
    }

    return fields;
  },

  /**
   * Normalize a label string (trim, remove extra spaces)
   * @param {string} label
   * @returns {string}
   */
  normalizeLabel(label) {
    return label
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[\*\s]+$/, '') // Remove trailing asterisks and spaces
      .trim();
  },

  /**
   * Detect the type of field based on label text
   * @param {string} label
   * @returns {string} - Field type (firstName, lastName, email, phone, etc.)
   */
  detectFieldType(label) {
    const lowerLabel = label.toLowerCase();
    
    // Name fields
    if (lowerLabel.includes('first') && lowerLabel.includes('name')) return 'firstName';
    if (lowerLabel.includes('last') && lowerLabel.includes('name')) return 'lastName';
    if (lowerLabel.includes('middle') && lowerLabel.includes('name')) return 'middleName';
    if (lowerLabel.includes('full') && lowerLabel.includes('name')) return 'fullName';
    if (lowerLabel === 'name') return 'fullName';
    
    // Contact fields
    if (lowerLabel.includes('email') || lowerLabel.includes('e-mail')) return 'email';
    if (lowerLabel.includes('phone') || lowerLabel.includes('mobile') || lowerLabel.includes('cell')) return 'phone';
    
    // Address fields
    if (lowerLabel.includes('address') || lowerLabel.includes('street')) return 'address';
    if (lowerLabel.includes('city')) return 'city';
    if (lowerLabel.includes('state') || lowerLabel.includes('province')) return 'state';
    if (lowerLabel.includes('zip') || lowerLabel.includes('postal') || lowerLabel.includes('pincode')) return 'pincode';
    if (lowerLabel.includes('country')) return 'country';
    
    // Date fields
    if (lowerLabel.includes('birth') || lowerLabel.includes('dob')) return 'dateOfBirth';
    if (lowerLabel.includes('date')) return 'date';
    
    // Other common fields
    if (lowerLabel.includes('gender') || lowerLabel.includes('sex')) return 'gender';
    if (lowerLabel.includes('nationality')) return 'nationality';
    if (lowerLabel.includes('organization') || lowerLabel.includes('company') || lowerLabel.includes('college') || lowerLabel.includes('university')) return 'organization';
    if (lowerLabel.includes('qualification') || lowerLabel.includes('degree')) return 'qualification';
    if (lowerLabel.includes('linkedin')) return 'linkedin';
    if (lowerLabel.includes('github')) return 'github';
    if (lowerLabel.includes('portfolio') || lowerLabel.includes('website')) return 'portfolio';
    
    return 'text'; // Generic fallback
  },

  /**
   * Get a readable field label from parsed data
   * @param {string} label - Original label
   * @returns {string} - Cleaned display label
   */
  getDisplayLabel(label) {
    return label
      .replace(/[\*:]/g, '')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
};

// Export for use in content script
if (typeof window !== 'undefined') {
  window.TextParser = TextParser;
}
