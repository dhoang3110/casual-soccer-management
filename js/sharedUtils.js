// Shared Utilities for Soccer Management App
// This file contains common functions to reduce code duplication

// DOM Utilities
window.DOMUtils = {
    /**
     * Safely get DOM element by ID
     */
    getElementById: function(id, required = true) {
        const element = document.getElementById(id);
        if (required && !element) {
            console.warn(`DOM element '${id}' not found`);
        }
        return element;
    },

    /**
     * Get multiple DOM elements by IDs
     */
    getElementsByIds: function(ids) {
        const elements = {};
        const missing = [];
        
        ids.forEach(id => {
            const element = document.getElementById(id);
            elements[id] = element;
            if (!element) {
                missing.push(id);
            }
        });
        
        return { elements, missing };
    },

    /**
     * Show/hide modal with overlay management
     */
    showModal: function(modalId, overlayId) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;
        
        if (overlayId) {
            const overlay = document.getElementById(overlayId);
            if (overlay) overlay.style.display = 'none';
        }
        
        modal.style.display = 'flex';
        return true;
    },

    hideModal: function(modalId, overlayId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
        
        if (overlayId) {
            const overlay = document.getElementById(overlayId);
            if (overlay) overlay.style.display = 'flex';
        }
    },

    /**
     * Focus with delay
     */
    focusWithDelay: function(element, delay = 100) {
        if (element && typeof element.focus === 'function') {
            setTimeout(() => element.focus(), delay);
        }
    }
};

// Validation Utilities
window.ValidationUtils = {
    /**
     * Validate name
     */
    validateName: function(name, minLength = 2) {
        if (!name || typeof name !== 'string') {
            return { isValid: false, message: 'Name is required' };
        }
        
        const trimmed = name.trim();
        if (trimmed.length < minLength) {
            return { 
                isValid: false, 
                message: `Name must be at least ${minLength} characters long` 
            };
        }
        
        return { isValid: true, message: '' };
    },

    /**
     * Validate phone number
     */
    validatePhone: function(phone, minDigits = 10) {
        if (!phone || typeof phone !== 'string') {
            return { isValid: false, message: 'Phone number is required' };
        }
        
        const normalized = this.normalizePhone(phone);
        if (normalized.length < minDigits) {
            return { 
                isValid: false, 
                message: `Please enter a valid phone number (at least ${minDigits} digits)` 
            };
        }
        
        return { isValid: true, message: '', normalizedPhone: normalized };
    },

    /**
     * Normalize phone number
     */
    normalizePhone: function(phone) {
        if (!phone) return '';
        return phone.replace(/\D/g, '');
    },

    /**
     * Format phone for display
     */
    formatPhone: function(phone) {
        const normalized = this.normalizePhone(phone);
        if (normalized.length === 10) {
            return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
        }
        return phone;
    },

    /**
     * Compare phone numbers
     */
    comparePhones: function(phone1, phone2) {
        return this.normalizePhone(phone1) === this.normalizePhone(phone2);
    },

    /**
     * Extract form values with validation
     */
    extractFormValues: function(elementIds) {
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
        
        return { values, missing };
    }
};

// Notification Utilities
window.NotificationUtils = {
    /**
     * Show success message
     */
    showSuccess: function(message, title = 'Success') {
        alert(`✅ ${title}\n\n${message}`);
    },

    /**
     * Show error message
     */
    showError: function(message, title = 'Error') {
        alert(`❌ ${title}\n\n${message}`);
    },

    /**
     * Show warning message
     */
    showWarning: function(message, title = 'Warning') {
        alert(`⚠️ ${title}\n\n${message}`);
    },

    /**
     * Show confirmation dialog
     */
    confirm: function(message, title = 'Confirm') {
        return confirm(`❓ ${title}\n\n${message}`);
    },

    /**
     * Show access denied message
     */
    showAccessDenied: function(action = 'perform this action') {
        this.showError(
            `Only administrators can ${action}.\n\nContact your Admin if you need access.`,
            'Access Denied'
        );
    },

    /**
     * Show app not ready message
     */
    showAppNotReady: function() {
        this.showWarning(
            'The app is still loading. Please wait a moment and try again.',
            'App Loading'
        );
    },

    /**
     * Show duplicate error
     */
    showDuplicateError: function(itemType, identifier) {
        this.showError(
            `A ${itemType} with ${identifier} already exists.\n\nPlease use a different value.`,
            'Duplicate Entry'
        );
    },

    /**
     * Confirm deletion
     */
    confirmDeletion: function(itemType, itemName = '') {
        const name = itemName ? ` "${itemName}"` : '';
        return this.confirm(
            `Are you sure you want to delete this ${itemType}${name}?\n\nThis action cannot be undone.`,
            'Confirm Deletion'
        );
    }
};

// App Utilities
window.AppUtils = {
    /**
     * Check if component is ready
     */
    checkAppReady: function(componentName, component) {
        if (!component || typeof component !== 'object') {
            console.error(`❌ ${componentName} not available`);
            window.NotificationUtils.showAppNotReady();
            return false;
        }
        return true;
    },

    /**
     * Check if method exists
     */
    checkMethod: function(component, methodName, componentName = 'component') {
        if (!component || typeof component[methodName] !== 'function') {
            console.error(`❌ ${methodName} method not available on ${componentName}`);
            window.NotificationUtils.showAppNotReady();
            return false;
        }
        return true;
    },

    /**
     * Generate unique ID
     */
    generateId: function(prefix = '') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
    },

    /**
     * Ensure data is array
     */
    ensureArray: function(data) {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') return Object.values(data);
        return [];
    },

    /**
     * Deep clone object (simple version)
     */
    deepClone: function(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = this.deepClone(obj[key]);
            }
        }
        return cloned;
    },

    /**
     * Format date for display
     */
    formatDate: function(date, options) {
        const defaultOptions = {
            weekday: 'long',
            month: 'short', 
            day: 'numeric'
        };
        const formatOptions = Object.assign(defaultOptions, options || {});
        
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        return date.toLocaleDateString('en-US', formatOptions);
    },

    /**
     * Get user display name based on provider
     */
    getUserDisplayName: function(user) {
        if (!user) return 'Unknown User';
        
        if (user.provider === 'admin' && user.name && user.name.toLowerCase().includes('dong')) {
            return 'Dong Hoang';
        }
        
        if (user.provider === 'google' || user.provider === 'facebook') {
            return 'Member';
        }
        
        if (user.phone && (user.provider === 'guest_casual' || user.provider === 'admin_casual')) {
            return window.ValidationUtils.formatPhone(user.phone);
        }
        
        return user.name || 'Guest User';
    },

    /**
     * Safe async execution with error handling
     */
    safeExecute: async function(fn, context = 'operation', errorMessage = null) {
        try {
            console.log(`🚀 Starting ${context}`);
            const result = await fn();
            console.log(`✅ Completed ${context}`);
            return result;
        } catch (error) {
            console.error(`❌ Failed ${context}:`, error);
            const message = errorMessage || `Failed to complete ${context}. Please try again.`;
            window.NotificationUtils.showError(message);
            throw error;
        }
    },

    /**
     * Check admin permission
     */
    checkAdminPermission: function(authManager) {
        if (!authManager || !authManager.isAdmin()) {
            window.NotificationUtils.showAccessDenied('perform this administrative action');
            return false;
        }
        return true;
    }
};

// Log Utilities
window.LogUtils = {
    /**
     * Standardized logging with emojis
     */
    error: function(context, message, data) {
        const args = data ? [message, data] : [message];
        console.error(`❌ [${context}] ${args[0]}`, ...(args.slice(1)));
    },

    warn: function(context, message, data) {
        const args = data ? [message, data] : [message];
        console.warn(`⚠️ [${context}] ${args[0]}`, ...(args.slice(1)));
    },

    info: function(context, message, data) {
        const args = data ? [message, data] : [message];
        console.log(`ℹ️ [${context}] ${args[0]}`, ...(args.slice(1)));
    },

    debug: function(context, message, data) {
        const args = data ? [message, data] : [message];
        console.log(`🔍 [${context}] ${args[0]}`, ...(args.slice(1)));
    },

    success: function(context, message, data) {
        const args = data ? [message, data] : [message];
        console.log(`✅ [${context}] ${args[0]}`, ...(args.slice(1)));
    },

    api: function(method, url, status, data) {
        const emoji = status >= 400 ? '❌' : status >= 200 ? '✅' : '🔄';
        const message = `${method.toUpperCase()} ${url}${status ? ` (${status})` : ''}`;
        const args = data ? [message, data] : [message];
        console.log(`${emoji} [API] ${args[0]}`, ...(args.slice(1)));
    }
};

console.log('✅ Shared utilities loaded successfully');