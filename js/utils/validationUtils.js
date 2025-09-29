// Form Validation Utilities - Shared validation logic
export class ValidationUtils {
    /**
     * Validate name input
     */
    static validateName(name, minLength = 2) {
        if (!name || typeof name !== 'string') {
            return { isValid: false, message: 'Name is required' };
        }

        const trimmedName = name.trim();
        if (trimmedName.length < minLength) {
            return { 
                isValid: false, 
                message: `Name must be at least ${minLength} characters long` 
            };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Validate phone number with normalization
     */
    static validatePhone(phone, minDigits = 10) {
        if (!phone || typeof phone !== 'string') {
            return { isValid: false, message: 'Phone number is required' };
        }

        const normalizedPhone = this.normalizePhone(phone);
        if (normalizedPhone.length < minDigits) {
            return { 
                isValid: false, 
                message: `Please enter a valid phone number (at least ${minDigits} digits)` 
            };
        }

        return { isValid: true, message: '', normalizedPhone };
    }

    /**
     * Normalize phone number by removing non-digits
     */
    static normalizePhone(phone) {
        if (!phone) return '';
        return phone.replace(/\D/g, '');
    }

    /**
     * Format phone for display
     */
    static formatPhone(phone) {
        const normalized = this.normalizePhone(phone);
        if (normalized.length === 10) {
            return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
        }
        return phone; // Return original if not standard format
    }

    /**
     * Validate email format
     */
    static validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return { isValid: false, message: 'Email is required' };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const trimmedEmail = email.trim().toLowerCase();
        
        if (!emailRegex.test(trimmedEmail)) {
            return { isValid: false, message: 'Please enter a valid email address' };
        }

        return { isValid: true, message: '', normalizedEmail: trimmedEmail };
    }

    /**
     * Validate array selection (for positions, skills, etc.)
     */
    static validateSelection(selection, minItems = 1, itemName = 'item') {
        if (!Array.isArray(selection) || selection.length < minItems) {
            return { 
                isValid: false, 
                message: `Please select at least ${minItems} ${itemName}${minItems > 1 ? 's' : ''}` 
            };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Validate skill level
     */
    static validateSkillLevel(skillLevel) {
        const validSkills = ['excellent', 'good', 'average', 'basic'];
        
        if (!skillLevel || !validSkills.includes(skillLevel)) {
            return { isValid: false, message: 'Please select a valid skill level' };
        }

        return { isValid: true, message: '' };
    }

    /**
     * Generic form validation helper
     */
    static validateForm(formData, rules) {
        const errors = {};
        let isValid = true;

        Object.keys(rules).forEach(field => {
            const rule = rules[field];
            const value = formData[field];
            
            if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
                errors[field] = `${rule.label || field} is required`;
                isValid = false;
                return;
            }

            if (rule.validator && value) {
                const result = rule.validator(value);
                if (!result.isValid) {
                    errors[field] = result.message;
                    isValid = false;
                }
            }
        });

        return { isValid, errors };
    }

    /**
     * Show validation errors to user
     */
    static showValidationError(message, field = null) {
        console.log(`❌ Validation failed${field ? ` for ${field}` : ''}: ${message}`);
        alert(message);
        
        // Try to focus on the problematic field
        if (field) {
            const element = document.getElementById(field);
            if (element && typeof element.focus === 'function') {
                setTimeout(() => element.focus(), 100);
            }
        }
    }

    /**
     * Extract form values with trimming
     */
    static extractFormValues(elementIds) {
        const values = {};
        const missing = [];

        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                missing.push(id);
                return;
            }

            if (element.type === 'checkbox') {
                values[id] = element.checked;
            } else if (element.tagName === 'SELECT' && element.multiple) {
                values[id] = Array.from(element.selectedOptions).map(option => option.value);
            } else {
                values[id] = element.value ? element.value.trim() : '';
            }
        });

        if (missing.length > 0) {
            console.warn(`Form elements not found: ${missing.join(', ')}`);
        }

        return { values, missing };
    }

    /**
     * Check for duplicate values in array of objects
     */
    static checkDuplicates(items, keyField, newValue, caseSensitive = false) {
        if (!Array.isArray(items)) return false;

        const compareValue = caseSensitive ? newValue : newValue.toLowerCase();
        
        return items.some(item => {
            const itemValue = item[keyField];
            if (!itemValue) return false;
            
            const compareItemValue = caseSensitive ? itemValue : itemValue.toLowerCase();
            return compareItemValue === compareValue;
        });
    }
}

// Export as default for easier importing
export default ValidationUtils;