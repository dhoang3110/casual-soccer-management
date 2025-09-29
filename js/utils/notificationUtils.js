// Notification Utilities - Consistent user messaging
export class NotificationUtils {
    /**
     * Show success alert with consistent formatting
     */
    static showSuccess(message, title = 'Success') {
        const formattedMessage = `✅ ${title}\n\n${message}`;
        alert(formattedMessage);
    }

    /**
     * Show error alert with consistent formatting
     */
    static showError(message, title = 'Error') {
        const formattedMessage = `❌ ${title}\n\n${message}`;
        alert(formattedMessage);
    }

    /**
     * Show warning alert with consistent formatting
     */
    static showWarning(message, title = 'Warning') {
        const formattedMessage = `⚠️ ${title}\n\n${message}`;
        alert(formattedMessage);
    }

    /**
     * Show info alert with consistent formatting
     */
    static showInfo(message, title = 'Information') {
        const formattedMessage = `ℹ️ ${title}\n\n${message}`;
        alert(formattedMessage);
    }

    /**
     * Show confirmation dialog
     */
    static confirm(message, title = 'Confirm') {
        const formattedMessage = `❓ ${title}\n\n${message}`;
        return confirm(formattedMessage);
    }

    /**
     * Show access denied message
     */
    static showAccessDenied(action = 'perform this action') {
        this.showError(
            `Only administrators can ${action}.\n\nContact your Admin if you need access.`,
            'Access Denied'
        );
    }

    /**
     * Show form validation error
     */
    static showValidationError(message) {
        this.showError(message, 'Validation Error');
    }

    /**
     * Show network error
     */
    static showNetworkError(action = 'complete the request') {
        this.showError(
            `Unable to ${action} due to network issues.\n\nPlease check your connection and try again.`,
            'Network Error'
        );
    }

    /**
     * Show welcome message for new users
     */
    static showWelcome(userName, userType = 'user') {
        const welcomeMessage = userType === 'guest' 
            ? `Welcome, ${userName}!\n\nYou've successfully joined as a guest player. You can now sign up for games and participate in team activities.`
            : `Welcome back, ${userName}!\n\nYou can now access all features of the Soccer Team Manager.`;
        
        this.showSuccess(welcomeMessage, 'Welcome');
    }

    /**
     * Show loading state message
     */
    static showLoading(message = 'Please wait...') {
        // This could be enhanced with a proper loading modal
        console.log(`🔄 Loading: ${message}`);
    }

    /**
     * Show app not ready warning
     */
    static showAppNotReady() {
        this.showWarning(
            'The app is still loading. Please wait a moment and try again.',
            'App Loading'
        );
    }

    /**
     * Show duplicate entry error
     */
    static showDuplicateError(itemType, identifier) {
        this.showError(
            `A ${itemType} with ${identifier} already exists.\n\nPlease use a different value.`,
            'Duplicate Entry'
        );
    }

    /**
     * Show deletion confirmation
     */
    static confirmDeletion(itemType, itemName = '') {
        const name = itemName ? ` "${itemName}"` : '';
        return this.confirm(
            `Are you sure you want to delete this ${itemType}${name}?\n\nThis action cannot be undone.`,
            'Confirm Deletion'
        );
    }

    /**
     * Show bulk operation confirmation
     */
    static confirmBulkOperation(operation, count, itemType) {
        return this.confirm(
            `Are you sure you want to ${operation} ${count} ${itemType}${count > 1 ? 's' : ''}?\n\nThis action cannot be undone.`,
            `Confirm Bulk ${operation.charAt(0).toUpperCase() + operation.slice(1)}`
        );
    }

    /**
     * Show session expired message
     */
    static showSessionExpired() {
        this.showWarning(
            'Your session has expired or your access has been revoked.\n\nPlease log in again to continue.',
            'Session Expired'
        );
    }

    /**
     * Show maintenance message
     */
    static showMaintenance() {
        this.showInfo(
            'The system is currently under maintenance.\n\nPlease try again later.',
            'Maintenance Mode'
        );
    }

    /**
     * Custom formatted alert with emoji support
     */
    static customAlert(emoji, title, message) {
        const formattedMessage = `${emoji} ${title}\n\n${message}`;
        alert(formattedMessage);
    }

    /**
     * Show progress message (for multi-step operations)
     */
    static showProgress(step, total, message) {
        const progressMessage = `Step ${step} of ${total}: ${message}`;
        this.showInfo(progressMessage, 'Processing');
    }
}

// Export as default for easier importing
export default NotificationUtils;