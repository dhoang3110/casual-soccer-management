// Logging Utilities - Centralized logging with consistent formatting
export class LogUtils {
    static LOG_LEVELS = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    };

    static currentLevel = LogUtils.LOG_LEVELS.DEBUG; // Default to show all logs

    /**
     * Set the global log level
     */
    static setLogLevel(level) {
        this.currentLevel = level;
    }

    /**
     * Check if log level should be displayed
     */
    static shouldLog(level) {
        return level <= this.currentLevel;
    }

    /**
     * Format message with emoji and context
     */
    static formatMessage(emoji, context, message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        let formattedMessage = `${emoji} [${timestamp}] ${context}: ${message}`;
        
        if (data) {
            return [formattedMessage, data];
        }
        return formattedMessage;
    }

    /**
     * Error logging
     */
    static error(context, message, data = null) {
        if (!this.shouldLog(this.LOG_LEVELS.ERROR)) return;
        
        const formatted = this.formatMessage('❌', context, message, data);
        if (Array.isArray(formatted)) {
            console.error(...formatted);
        } else {
            console.error(formatted);
        }
    }

    /**
     * Warning logging
     */
    static warn(context, message, data = null) {
        if (!this.shouldLog(this.LOG_LEVELS.WARN)) return;
        
        const formatted = this.formatMessage('⚠️', context, message, data);
        if (Array.isArray(formatted)) {
            console.warn(...formatted);
        } else {
            console.warn(formatted);
        }
    }

    /**
     * Info logging
     */
    static info(context, message, data = null) {
        if (!this.shouldLog(this.LOG_LEVELS.INFO)) return;
        
        const formatted = this.formatMessage('ℹ️', context, message, data);
        if (Array.isArray(formatted)) {
            console.log(...formatted);
        } else {
            console.log(formatted);
        }
    }

    /**
     * Debug logging
     */
    static debug(context, message, data = null) {
        if (!this.shouldLog(this.LOG_LEVELS.DEBUG)) return;
        
        const formatted = this.formatMessage('🔍', context, message, data);
        if (Array.isArray(formatted)) {
            console.log(...formatted);
        } else {
            console.log(formatted);
        }
    }

    /**
     * Success logging
     */
    static success(context, message, data = null) {
        if (!this.shouldLog(this.LOG_LEVELS.INFO)) return;
        
        const formatted = this.formatMessage('✅', context, message, data);
        if (Array.isArray(formatted)) {
            console.log(...formatted);
        } else {
            console.log(formatted);
        }
    }

    /**
     * Process start logging
     */
    static start(context, message, data = null) {
        if (!this.shouldLog(this.LOG_LEVELS.INFO)) return;
        
        const formatted = this.formatMessage('🚀', context, message, data);
        if (Array.isArray(formatted)) {
            console.log(...formatted);
        } else {
            console.log(formatted);
        }
    }

    /**
     * API call logging
     */
    static api(method, url, status = null, data = null) {
        if (!this.shouldLog(this.LOG_LEVELS.DEBUG)) return;
        
        const statusEmoji = status >= 400 ? '❌' : status >= 200 ? '✅' : '🔄';
        const message = `${method.toUpperCase()} ${url}${status ? ` (${status})` : ''}`;
        
        const formatted = this.formatMessage(statusEmoji, 'API', message, data);
        if (Array.isArray(formatted)) {
            console.log(...formatted);
        } else {
            console.log(formatted);
        }
    }

    /**
     * Authentication logging
     */
    static auth(message, data = null) {
        const formatted = this.formatMessage('🔐', 'AUTH', message, data);
        if (Array.isArray(formatted)) {
            console.log(...formatted);
        } else {
            console.log(formatted);
        }
    }

    /**
     * Data operation logging
     */
    static data(operation, message, data = null) {
        const emoji = {
            'save': '💾',
            'load': '📖',
            'delete': '🗑️',
            'sync': '🔄',
            'validate': '✅'
        }[operation] || '📊';
        
        const formatted = this.formatMessage(emoji, 'DATA', message, data);
        if (Array.isArray(formatted)) {
            console.log(...formatted);
        } else {
            console.log(formatted);
        }
    }

    /**
     * UI operation logging
     */
    static ui(action, message, data = null) {
        const emoji = {
            'show': '👁️',
            'hide': '🙈',
            'click': '👆',
            'focus': '🎯',
            'validate': '✅'
        }[action] || '🖥️';
        
        const formatted = this.formatMessage(emoji, 'UI', message, data);
        if (Array.isArray(formatted)) {
            console.log(...formatted);
        } else {
            console.log(formatted);
        }
    }

    /**
     * Group related logs together
     */
    static group(label, callback) {
        console.group(`🔍 ${label}`);
        try {
            callback();
        } finally {
            console.groupEnd();
        }
    }

    /**
     * Performance timing
     */
    static time(label) {
        console.time(`⏱️ ${label}`);
    }

    static timeEnd(label) {
        console.timeEnd(`⏱️ ${label}`);
    }
}

// Export as default for easier importing
export default LogUtils;