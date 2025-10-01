// js/config/appConfig.js

// Environment detection
window.getEnvironment = () => {
    // Check for forced environment from .env.js
    if (window.ENV_CONFIG && window.ENV_CONFIG.FORCE_ENVIRONMENT) {
        return window.ENV_CONFIG.FORCE_ENVIRONMENT;
    }
    
    // Check if we're on Netlify
    if (window.location.hostname.includes('netlify.app') || window.location.hostname.includes('netlify.com')) {
        return 'production';
    }
    
    // Check for custom production domain (not localhost)
    if (window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1' && 
        !window.location.hostname.includes('localhost')) {
        return 'production';
    }
    
    // Check for testing environment
    if (window.location.port === '8080' || 
        window.location.search.includes('env=test') ||
        window.location.hostname.includes('staging')) {
        return 'testing';
    }
    
    // Default to development
    return 'development';
};

const ENVIRONMENT = window.getEnvironment();

// Get environment-specific URLs from .env.js
const getEnvironmentUrls = (env) => {
    const envConfig = window.ENV_CONFIG;
    if (envConfig && envConfig[env.toUpperCase()]) {
        return envConfig[env.toUpperCase()];
    }
    
    // Fallback defaults
    const defaults = {
        development: {
            DOMAIN: 'http://localhost',
            API_BASE: 'http://localhost:3000'
        },
        testing: {
            DOMAIN: 'http://localhost',
            API_BASE: 'http://localhost:3001'
        },
        production: {
            DOMAIN: window.location.origin,
            API_BASE: window.location.origin + '/api'
        }
    };
    
    return defaults[env] || defaults.development;
};

// Environment-specific configurations
const ENVIRONMENTS = {
    development: {
        BASE_URL: `http://localhost`,
        FRONTEND_PORT: 8000,
        BACKEND_PORT: 3000,
        API_URL: 'http://localhost:3000',
        DEBUG: true,
        LOGGING: true
    },
    testing: {
        BASE_URL: `http://localhost`,
        FRONTEND_PORT: 8080,
        BACKEND_PORT: 3001,
        API_URL: 'http://localhost:3001',
        DEBUG: true,
        LOGGING: true
    },
    production: {
        BASE_URL: window.location.origin,
        FRONTEND_PORT: 80,
        BACKEND_PORT: 443,
        API_URL: `${window.location.origin}/api`,
        DEBUG: false,
        LOGGING: false
    }
};

window.APP_CONFIG = {
    // Current environment
    ENVIRONMENT,
    
    // Server Configuration (environment-specific)
    SERVER: {
        ...ENVIRONMENTS[ENVIRONMENT],
        FRONTEND_URL: ENVIRONMENT === 'production' 
            ? window.location.origin 
            : `${ENVIRONMENTS[ENVIRONMENT].BASE_URL}:${ENVIRONMENTS[ENVIRONMENT].FRONTEND_PORT}`,
        BACKEND_URL: ENVIRONMENT === 'production'
            ? `${window.location.origin}/api`
            : `${ENVIRONMENTS[ENVIRONMENT].BASE_URL}:${ENVIRONMENTS[ENVIRONMENT].BACKEND_PORT}`
    },

    // Skill System Configuration
    SKILL_LEVELS: {
        EXCELLENT: { label: 'Excellent', points: 4, description: 'Pro level, very experienced' },
        GOOD: { label: 'Good', points: 3, description: 'Solid player, good technique' },
        AVERAGE: { label: 'Average', points: 2, description: 'Decent player, some experience' },
        BASIC: { label: 'Basic', points: 1, description: 'Beginner, learning the game' }
    },

    // Position Configuration
    POSITIONS: {
        GOALKEEPER: 'Goalkeeper',
        DEFENDER: 'Defender',
        MIDFIELDER: 'Midfielder',
        FORWARD: 'Forward',
        ANY: 'Any Position'
    },

    // Team Generation Settings
    TEAM_GENERATION: {
        MIN_PLAYERS: 2,
        MAX_SKILL_DIFFERENCE: 4,
        POSITION_WEIGHT: 0.6,
        SKILL_WEIGHT: 0.4
    },

    // UI Configuration
    UI: {
        ANIMATION_DURATION: 300,
        TOAST_DURATION: 3000,
        AUTO_SAVE_INTERVAL: 30000
    },

    // Authentication Configuration
    AUTH: {
        // Get Google Client ID from environment config or use fallback
        GOOGLE_CLIENT_ID: (function() {
            const envUrls = getEnvironmentUrls(ENVIRONMENT);
            return envUrls.GOOGLE_CLIENT_ID || '660296369599-2t5u6qmve8q8tpkoh4o9uau9i6e4pmbj.apps.googleusercontent.com';
        })(),
        
        // Get Facebook App ID from environment config or use fallback
        FACEBOOK_APP_ID: (function() {
            const envUrls = getEnvironmentUrls(ENVIRONMENT);
            return envUrls.FACEBOOK_APP_ID || '799762102527678';
        })(),
        
        // Get Facebook Config ID from environment config
        FACEBOOK_CONFIG_ID: (function() {
            const envUrls = getEnvironmentUrls(ENVIRONMENT);
            return envUrls.FACEBOOK_CONFIG_ID || '787457504132502';
        })(),
        
        SCOPES: ['profile', 'email', 'openid']
    },

    // File paths (environment-aware)
    PATHS: {
        DATA: ENVIRONMENT === 'production' ? '/data' : '/data',
        SCRIPTS: ENVIRONMENT === 'production' ? '/scripts' : '/scripts',
        ASSETS: ENVIRONMENT === 'production' ? '/assets' : '/assets'
    },

    // Feature flags
    FEATURES: {
        ENABLE_CONSOLE_LOGS: ENVIRONMENTS[ENVIRONMENT].LOGGING,
        ENABLE_DEBUG_MODE: ENVIRONMENTS[ENVIRONMENT].DEBUG,
        ENABLE_ANALYTICS: ENVIRONMENT === 'production',
        ENABLE_ERROR_REPORTING: ENVIRONMENT === 'production'
    }
};

// Utility functions
window.ENV_UTILS = {
    isDevelopment: () => ENVIRONMENT === 'development',
    isTesting: () => ENVIRONMENT === 'testing',
    isProduction: () => ENVIRONMENT === 'production',
    
    log: (...args) => {
        if (window.APP_CONFIG.FEATURES.ENABLE_CONSOLE_LOGS) {
            console.log(`[${ENVIRONMENT.toUpperCase()}]`, ...args);
        }
    },
    
    warn: (...args) => {
        if (window.APP_CONFIG.FEATURES.ENABLE_CONSOLE_LOGS) {
            console.warn(`[${ENVIRONMENT.toUpperCase()}]`, ...args);
        }
    },
    
    error: (...args) => {
        if (window.APP_CONFIG.FEATURES.ENABLE_CONSOLE_LOGS) {
            console.error(`[${ENVIRONMENT.toUpperCase()}]`, ...args);
        }
    },

    getApiUrl: (endpoint = '') => {
        return `${window.APP_CONFIG.SERVER.API_URL}${endpoint}`;
    },

    getCurrentUrl: () => {
        return window.location.href;
    },

    getEnvironmentInfo: () => {
        return {
            environment: ENVIRONMENT,
            hostname: window.location.hostname,
            port: window.location.port,
            protocol: window.location.protocol,
            baseUrl: window.APP_CONFIG.SERVER.BASE_URL,
            apiUrl: window.APP_CONFIG.SERVER.API_URL
        };
    }
};

// Make environment information easily accessible
window.ENVIRONMENT = ENVIRONMENT;