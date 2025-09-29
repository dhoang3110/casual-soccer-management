// DOM Utility Functions - Shared across the application
export class DOMUtils {
    /**
     * Safely get DOM element by ID with optional validation
     */
    static getElementById(id, required = true) {
        const element = document.getElementById(id);
        if (required && !element) {
            console.warn(`Required DOM element with ID '${id}' not found`);
        }
        return element;
    }

    /**
     * Get multiple DOM elements by their IDs
     */
    static getElementsByIds(ids, required = true) {
        const elements = {};
        const missing = [];

        ids.forEach(id => {
            const element = document.getElementById(id);
            elements[id] = element;
            if (required && !element) {
                missing.push(id);
            }
        });

        if (required && missing.length > 0) {
            console.warn(`Required DOM elements not found: ${missing.join(', ')}`);
        }

        return elements;
    }

    /**
     * Set element display style with optional fade effect
     */
    static setDisplay(element, display, fade = false) {
        if (!element) return;

        if (fade && display === 'none') {
            element.style.opacity = '0';
            element.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                element.style.display = display;
            }, 300);
        } else {
            element.style.display = display;
            if (fade && display !== 'none') {
                element.style.opacity = '0';
                element.style.transition = 'opacity 0.3s';
                setTimeout(() => {
                    element.style.opacity = '1';
                }, 10);
            }
        }
    }

    /**
     * Toggle element visibility
     */
    static toggle(element, force = null) {
        if (!element) return;
        
        if (force !== null) {
            element.style.display = force ? 'block' : 'none';
        } else {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    }

    /**
     * Clear form inputs with validation
     */
    static clearForm(formId) {
        const form = document.getElementById(formId);
        if (!form) {
            console.warn(`Form with ID '${formId}' not found`);
            return;
        }

        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
        });
    }

    /**
     * Focus on element with delay
     */
    static focusWithDelay(element, delay = 100) {
        if (!element) return;
        setTimeout(() => element.focus(), delay);
    }

    /**
     * Get form data as object
     */
    static getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};

        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        return data;
    }

    /**
     * Show modal with overlay management
     */
    static showModal(modalId, overlayId = null) {
        const modal = document.getElementById(modalId);
        if (!modal) return false;

        if (overlayId) {
            const overlay = document.getElementById(overlayId);
            if (overlay) {
                overlay.style.display = 'none';
            }
        }

        modal.style.display = 'flex';
        return true;
    }

    /**
     * Hide modal with overlay management
     */
    static hideModal(modalId, overlayId = null) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }

        if (overlayId) {
            const overlay = document.getElementById(overlayId);
            if (overlay) {
                overlay.style.display = 'flex';
            }
        }
    }
}

// Export as default for easier importing
export default DOMUtils;