// js/core/ErrorHandler.js
export class AppError extends Error {
    constructor(message, code = 'GENERIC_ERROR', statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.timestamp = new Date().toISOString();
    }
}

export class ValidationError extends AppError {
    constructor(message, field = null) {
        super(message, 'VALIDATION_ERROR', 400);
        this.field = field;
    }
}

export class NetworkError extends AppError {
    constructor(message, url = null) {
        super(message, 'NETWORK_ERROR', 503);
        this.url = url;
    }
}

export class AuthenticationError extends AppError {
    constructor(message) {
        super(message, 'AUTH_ERROR', 401);
    }
}

export class ErrorHandler {
    constructor() {
        this.errorQueue = [];
        this.maxErrors = 50;
        this.setupGlobalErrorHandling();
    }

    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(new AppError(
                `Unhandled Promise Rejection: ${event.reason}`,
                'UNHANDLED_PROMISE'
            ));
        });

        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError(new AppError(
                `JavaScript Error: ${event.message}`,
                'JAVASCRIPT_ERROR'
            ));
        });
    }

    handleError(error) {
        // Log error
        console.error('Application Error:', error);

        // Add to error queue
        this.errorQueue.push({
            error,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });

        // Maintain queue size
        if (this.errorQueue.length > this.maxErrors) {
            this.errorQueue.shift();
        }

        // Show user-friendly message
        this.showUserError(error);

        // Report to monitoring service (if available)
        this.reportError(error);
    }

    showUserError(error) {
        const userMessage = this.getUserFriendlyMessage(error);
        
        // Show toast notification or modal
        this.showToast(userMessage, 'error');
    }

    getUserFriendlyMessage(error) {
        const messages = {
            'NETWORK_ERROR': 'Connection problem. Please check your internet and try again.',
            'VALIDATION_ERROR': 'Please check your input and try again.',
            'AUTH_ERROR': 'Authentication failed. Please log in again.',
            'TEAM_GENERATION_ERROR': 'Unable to generate teams. Please try again.',
            'DATA_SYNC_ERROR': 'Failed to save data. Your changes may be lost.'
        };

        return messages[error.code] || 'Something went wrong. Please try again.';
    }

    showToast(message, type = 'info') {
        // Implementation for toast notifications
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    reportError(error) {
        // Send to monitoring service like Sentry, LogRocket, etc.
        // This is where you'd integrate with external services
        if (window.Sentry) {
            window.Sentry.captureException(error);
        }
    }

    getErrorHistory() {
        return [...this.errorQueue];
    }

    clearErrorHistory() {
        this.errorQueue = [];
    }
}

// Export singleton
export const errorHandler = new ErrorHandler();