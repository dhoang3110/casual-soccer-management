// .env.js - Environment Configuration
// This file can be customized for different deployment environments
// IMPORTANT: Update the PRODUCTION settings below for your Netlify deployment

window.ENV_CONFIG = {
    // Environment override (optional)
    // Set this to force a specific environment: 'development', 'testing', 'production'
    // Leave as null for automatic detection
    FORCE_ENVIRONMENT: null,

    // 🚀 PRODUCTION SETTINGS - UPDATE THESE FOR YOUR NETLIFY DEPLOYMENT
    PRODUCTION: {
        // Your Netlify domain - REPLACE WITH YOUR ACTUAL DOMAIN
        DOMAIN: 'https://your-soccer-app.netlify.app',
        
        // API endpoints for production - typically same as domain for static hosting
        API_BASE: 'https://your-soccer-app.netlify.app',
        
        // Google OAuth Client ID for production - GET FROM GOOGLE CONSOLE
        GOOGLE_CLIENT_ID: 'your-production-google-client-id.apps.googleusercontent.com'
    },

    // 🧪 TESTING/STAGING SETTINGS (optional)
    TESTING: {
        DOMAIN: 'https://staging-soccer-app.netlify.app',
        API_BASE: 'https://staging-soccer-app.netlify.app',
        GOOGLE_CLIENT_ID: 'your-testing-google-client-id.apps.googleusercontent.com'
    },

    // 💻 DEVELOPMENT SETTINGS (for local development)
    DEVELOPMENT: {
        DOMAIN: 'http://localhost',
        API_BASE: 'http://localhost:3000',
        GOOGLE_CLIENT_ID: 'your-development-google-client-id.apps.googleusercontent.com'
    },

    // 🎛️ FEATURE TOGGLES
    FEATURES: {
        // Analytics (Google Analytics, etc.)
        ANALYTICS: {
            development: false,
            testing: false,
            production: true
        },
        
        // Debug mode (detailed error messages, etc.)
        DEBUG_MODE: {
            development: true,
            testing: true,
            production: false
        },

        // Console logging (for debugging)
        CONSOLE_LOGGING: {
            development: true,
            testing: true,
            production: false
        }
    }
};

// 📝 QUICK SETUP CHECKLIST:
// 1. Replace 'your-soccer-app.netlify.app' with your actual Netlify domain
// 2. Get Google OAuth Client ID from Google Cloud Console
// 3. Add your domain to Google OAuth authorized domains
// 4. Deploy to Netlify
// 5. Test in browser console: window.APP_CONFIG