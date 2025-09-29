# Environment Configuration System

## Overview

Your Soccer Team Management application now has a comprehensive environment configuration system that allows you to easily deploy to different environments (development, testing, production) without hardcoding URLs or API keys.

## Architecture

The system consists of three main files:

### 1. `.env.js` - Environment-Specific Configuration
Contains actual configuration values for each environment:
- Development (localhost)
- Testing (staging/preview URLs)
- Production (your live domain)

### 2. `js/config/appConfig.js` - Configuration Manager
Provides:
- Automatic environment detection
- Centralized configuration access
- Environment-aware logging utilities
- Manual environment override capability

### 3. `index.html` - Configuration Loading
Loads configuration scripts in the correct order before your application starts.

## How It Works

### Automatic Environment Detection
The system automatically detects the current environment based on:
- **Development**: `localhost` or `127.0.0.1` or `file://`
- **Testing**: Contains keywords like `preview`, `staging`, `test`, `dev`
- **Production**: All other domains

### Configuration Access
All configuration is available through `window.APP_CONFIG`:

```javascript
// Get server URLs
const backendUrl = window.APP_CONFIG.SERVER.BACKEND_URL;
const frontendUrl = window.APP_CONFIG.SERVER.FRONTEND_URL;

// Get authentication settings
const googleClientId = window.APP_CONFIG.AUTH.GOOGLE_CLIENT_ID;
const facebookAppId = window.APP_CONFIG.AUTH.FACEBOOK_APP_ID;

// Check feature flags
const debugMode = window.APP_CONFIG.FEATURES.DEBUG_MODE;
const autoLogin = window.APP_CONFIG.FEATURES.AUTO_LOGIN;
```

### Environment-Aware Logging
Use `window.ENV_UTILS.log()` for smart logging:
- **Development**: Full console logging
- **Testing**: Limited logging with prefixes
- **Production**: Error-only logging

```javascript
// Instead of console.log()
window.ENV_UTILS.log('User logged in:', userData);

// For errors (always shown)
window.ENV_UTILS.error('Login failed:', error);
```

## File Updates Made

### Updated Files to Use Environment Configuration:

1. **`js/dataSync.js`**
   - Uses `APP_CONFIG.SERVER.BACKEND_URL` instead of hardcoded localhost:3000
   - Uses environment-aware logging

2. **`js/auth.js`**
   - Uses `APP_CONFIG.AUTH.GOOGLE_CLIENT_ID` for Google OAuth
   - Uses `APP_CONFIG.AUTH.FACEBOOK_APP_ID` for Facebook login
   - Uses environment-aware logging throughout

3. **`index.html`**
   - Loads configuration scripts before application scripts
   - Ensures proper initialization order

## Configuration Examples

### For Local Development
```javascript
// In .env.js
DEVELOPMENT: {
    SERVER: {
        BACKEND_URL: 'http://localhost:3000',
        FRONTEND_URL: 'http://localhost:8000'
    },
    // ... other settings
}
```

### For Netlify Production
```javascript
// In .env.js
PRODUCTION: {
    SERVER: {
        BACKEND_URL: 'https://your-api-domain.com',
        FRONTEND_URL: 'https://your-app.netlify.app'
    },
    AUTH: {
        GOOGLE_CLIENT_ID: 'your-production-google-client-id.apps.googleusercontent.com',
        FACEBOOK_APP_ID: 'your-production-facebook-app-id'
    },
    // ... other settings
}
```

## Deployment Steps

### 1. Configure Your Production Settings
Edit `.env.js` and update the PRODUCTION section:
- Set your actual Netlify domain
- Add your production Google OAuth client ID
- Add your production Facebook App ID
- Configure any other production-specific settings

### 2. Google Cloud Console Setup
Add your production domain to:
- **Authorized JavaScript Origins**: `https://your-app.netlify.app`
- **Authorized Redirect URIs**: `https://your-app.netlify.app`

### 3. Facebook Developer Console Setup
Add your production domain to your Facebook App's allowed domains.

### 4. Deploy to Netlify
The `netlify.toml` file is already configured with:
- Proper routing for single-page application
- Security headers
- Cache optimization
- Environment-specific redirects

## Manual Environment Override

For testing or debugging, you can manually set the environment:

```javascript
// Before your app loads, set:
window.FORCE_ENVIRONMENT = 'TESTING';
// or
window.FORCE_ENVIRONMENT = 'PRODUCTION';
```

## Environment Detection Logic

The system checks in this order:
1. Manual override (`window.FORCE_ENVIRONMENT`)
2. URL-based detection:
   - Development: localhost, 127.0.0.1, file://
   - Testing: URLs containing preview, staging, test, dev
   - Production: Everything else

## Benefits

1. **Easy Deployment**: No code changes needed between environments
2. **Security**: Sensitive keys can be configured per environment
3. **Debugging**: Environment-aware logging reduces production noise
4. **Flexibility**: Easy to add new environments or configuration options
5. **Maintainability**: Centralized configuration management

## Testing the Configuration

1. **Local Testing**: Start your local server - should detect DEVELOPMENT
2. **Netlify Deploy Preview**: Should detect TESTING environment
3. **Production**: Your live domain should detect PRODUCTION

Check the browser console on startup to see:
```
🔧 Environment detected: DEVELOPMENT
📊 Configuration loaded for: DEVELOPMENT
🚀 App ready in DEVELOPMENT mode
```

## Next Steps

1. **Customize `.env.js`** with your actual production URLs and API keys
2. **Test locally** to ensure everything works
3. **Deploy to Netlify** and verify environment detection
4. **Configure OAuth** providers with your production domains

Your application is now production-ready with professional environment management! 🚀