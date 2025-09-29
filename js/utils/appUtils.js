// Shared Application Utilities - Common functions used across the app
import DOMUtils from './domUtils.js';
import ValidationUtils from './validationUtils.js';
import LogUtils from './logUtils.js';
import NotificationUtils from './notificationUtils.js';

export class AppUtils {
    /**
     * Check if app component is ready
     */
    static checkAppReady(componentName, component) {
        if (!component || typeof component !== 'object') {
            LogUtils.error('APP', `${componentName} not available`);
            NotificationUtils.showAppNotReady();
            return false;
        }
        return true;
    }

    /**
     * Check if method exists on component
     */
    static checkMethod(component, methodName, componentName = 'component') {
        if (!component || typeof component[methodName] !== 'function') {
            LogUtils.error('APP', `${methodName} method not available on ${componentName}`);
            NotificationUtils.showAppNotReady();
            return false;
        }
        return true;
    }

    /**
     * Safe method execution with error handling
     */
    static async safeExecute(fn, context = 'operation', errorMessage = null) {
        try {
            LogUtils.start('APP', `Starting ${context}`);
            const result = await fn();
            LogUtils.success('APP', `Completed ${context}`);
            return result;
        } catch (error) {
            LogUtils.error('APP', `Failed ${context}`, error);
            const message = errorMessage || `Failed to complete ${context}. Please try again.`;
            NotificationUtils.showError(message);
            throw error;
        }
    }

    /**
     * Debounce function calls
     */
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function calls
     */
    static throttle(func, limit = 100) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    /**
     * Format date for display
     */
    static formatDate(date, options = {}) {
        const defaultOptions = {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        };
        const formatOptions = { ...defaultOptions, ...options };
        
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        return date.toLocaleDateString('en-US', formatOptions);
    }

    /**
     * Generate unique ID
     */
    static generateId(prefix = '') {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
    }

    /**
     * Deep clone object
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    /**
     * Convert array-like server response to array
     */
    static ensureArray(data) {
        if (Array.isArray(data)) {
            return data;
        }
        if (data && typeof data === 'object') {
            return Object.values(data);
        }
        return [];
    }

    /**
     * Clean and normalize string input
     */
    static normalizeString(str) {
        if (!str || typeof str !== 'string') return '';
        return str.trim().replace(/\s+/g, ' ');
    }

    /**
     * Format skill level information
     */
    static getSkillInfo(skillLevel) {
        const SKILL_LEVELS = {
            'excellent': { label: 'Excellent', points: 4, description: 'Pro level, very experienced' },
            'good': { label: 'Good', points: 3, description: 'Solid player, good technique' },
            'average': { label: 'Average', points: 2, description: 'Decent player, some experience' },
            'basic': { label: 'Basic', points: 1, description: 'Beginner, learning the game' }
        };
        
        return SKILL_LEVELS[skillLevel] || SKILL_LEVELS['average'];
    }

    /**
     * Get skill points for calculations
     */
    static getSkillPoints(skillLevel) {
        return this.getSkillInfo(skillLevel).points;
    }

    /**
     * Generate avatar URL for users without profile pictures  
     */
    static generateAvatar(name, backgroundColor = 'random') {
        const encodedName = encodeURIComponent(name);
        const colors = ['28a745', '007bff', '6f42c1', 'fd7e14', '20c997', 'e83e8c'];
        const bgColor = backgroundColor === 'random' 
            ? colors[Math.floor(Math.random() * colors.length)]
            : backgroundColor;
            
        return `https://ui-avatars.com/api/?name=${encodedName}&background=${bgColor}&color=fff&bold=true`;
    }

    /**
     * Compare phone numbers for equality
     */
    static comparePhones(phone1, phone2) {
        const normalize = (phone) => phone ? phone.replace(/\D/g, '') : '';
        return normalize(phone1) === normalize(phone2);
    }

    /**
     * Validate form data with common rules
     */
    static validatePlayerForm(formData) {
        const rules = {
            name: {
                required: true,
                label: 'Name',
                validator: (value) => ValidationUtils.validateName(value)
            },
            phone: {
                required: true,
                label: 'Phone',
                validator: (value) => ValidationUtils.validatePhone(value)
            },
            skill: {
                required: true,
                label: 'Skill Level',
                validator: (value) => ValidationUtils.validateSkillLevel(value)
            },
            positions: {
                required: true,
                label: 'Position',
                validator: (value) => ValidationUtils.validateSelection(value, 1, 'position')
            }
        };

        return ValidationUtils.validateForm(formData, rules);
    }

    /**
     * Handle common form submission pattern
     */
    static async handleFormSubmission(formId, validationRules, submitHandler) {
        const { values, missing } = ValidationUtils.extractFormValues(
            Object.keys(validationRules)
        );

        if (missing.length > 0) {
            NotificationUtils.showError('Form elements not found. Please refresh and try again.');
            return false;
        }

        const validation = ValidationUtils.validateForm(values, validationRules);
        if (!validation.isValid) {
            const firstError = Object.values(validation.errors)[0];
            ValidationUtils.showValidationError(firstError);
            return false;
        }

        try {
            await submitHandler(values);
            return true;
        } catch (error) {
            LogUtils.error('FORM', 'Submission failed', error);
            NotificationUtils.showError(error.message || 'Submission failed. Please try again.');
            return false;
        }
    }

    /**
     * Clear form and focus on first input
     */
    static resetForm(formId, firstInputId = null) {
        DOMUtils.clearForm(formId);
        
        if (firstInputId) {
            const firstInput = document.getElementById(firstInputId);
            if (firstInput) {
                DOMUtils.focusWithDelay(firstInput);
            }
        }
    }

    /**
     * Check admin permissions
     */
    static checkAdminPermission(authManager) {
        if (!authManager || !authManager.isAdmin()) {
            NotificationUtils.showAccessDenied('perform this administrative action');
            return false;
        }
        return true;
    }

    /**
     * Format user display name with status
     */
    static getUserDisplayName(user) {
        if (!user) return 'Unknown User';
        
        if (user.provider === 'admin' && user.name?.toLowerCase().includes('dong')) {
            return 'Dong Hoang';
        }
        
        if (user.provider === 'google' || user.provider === 'facebook') {
            return 'Member';
        }
        
        if (user.phone && (user.provider === 'guest_casual' || user.provider === 'admin_casual')) {
            return ValidationUtils.formatPhone(user.phone);
        }
        
        return user.name || 'Guest User';
    }

    /**
     * Check if user has access to feature
     */
    static checkFeatureAccess(authManager, feature) {
        if (!authManager || !authManager.isAuthenticated()) {
            return false;
        }

        const user = authManager.getCurrentUser();
        
        // Admin has access to everything
        if (user.role === 'administrator') {
            return true;
        }

        // Feature-specific access rules
        const accessRules = {
            'players': ['administrator'],
            'signup': ['administrator', 'user', 'guest'],
            'teams': ['administrator', 'user'],
            'admin': ['administrator']
        };

        const requiredRoles = accessRules[feature] || ['user'];
        const userRole = user.role || (user.provider === 'guest' ? 'guest' : 'user');
        
        return requiredRoles.includes(userRole);
    }
}

// Export utilities for global access
export { DOMUtils, ValidationUtils, LogUtils, NotificationUtils };
export default AppUtils;