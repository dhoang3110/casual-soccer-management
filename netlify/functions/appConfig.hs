// js/config/appConfig.js
window.getEnvironment = () => {
    if (window.location.hostname.includes('netlify.app') || window.location.hostname.includes('netlify.com')) {
        return 'netlify';
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'development';
    }
    return 'production';
};

window.APP_CONFIG = {
    ENVIRONMENTS: {
        development: {
            BASE_URL: 'http://localhost:8000',
            API_URL: 'http://localhost:3000/api',
            DEBUG: true,
            LOGGING: true
        },
        netlify: {
            BASE_URL: window.location.origin,
            API_URL: '/.netlify/functions', // Netlify Functions endpoint
            DEBUG: false,
            LOGGING: false
        },
        production: {
            BASE_URL: window.location.origin,
            API_URL: '/.netlify/functions',
            DEBUG: false,
            LOGGING: false
        }
    },
    get ENVIRONMENT() {
        return this.ENVIRONMENTS[window.getEnvironment()];
    }
};