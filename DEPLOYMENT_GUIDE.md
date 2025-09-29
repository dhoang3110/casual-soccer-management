# Environment Configuration Guide

This guide helps you configure the Soccer Team Manager app for different environments (development, testing, production).

## Quick Setup for Netlify Deployment

### 1. Update Environment Configuration

Edit `.env.js` in the root folder:

```javascript
window.ENV_CONFIG = {
    // Set this to force a specific environment (optional)
    FORCE_ENVIRONMENT: null, // or 'production' for production

    // Production URLs - UPDATE THESE FOR YOUR DEPLOYMENT
    PRODUCTION: {
        // Your Netlify domain (replace with your actual domain)
        DOMAIN: 'https://your-soccer-app.netlify.app',
        
        // API endpoints (if you have a separate backend)
        API_BASE: 'https://your-soccer-app.netlify.app',
        
        // Google OAuth Client ID for production
        GOOGLE_CLIENT_ID: 'your-production-google-client-id.googleusercontent.com'
    },

    // Development URLs (for local development)
    DEVELOPMENT: {
        DOMAIN: 'http://localhost',
        API_BASE: 'http://localhost:3000',
        GOOGLE_CLIENT_ID: 'your-development-google-client-id.googleusercontent.com'
    }
};
```

### 2. Environment Detection

The app automatically detects the environment based on:

- **Production**: When hostname contains 'netlify.app', 'netlify.com', or is not localhost
- **Development**: When running on localhost or 127.0.0.1
- **Testing**: When running on port 8080 or hostname contains 'staging'

### 3. Configuration Usage

The app uses these configurations for:

- **API URLs**: Server endpoints for data storage
- **Google OAuth**: Authentication with environment-specific client IDs  
- **Logging**: Debug logs enabled in development, disabled in production
- **Feature Flags**: Different features enabled per environment

## Configuration Examples

### For Netlify Deployment:

```javascript
window.ENV_CONFIG = {
    PRODUCTION: {
        DOMAIN: 'https://my-soccer-team.netlify.app',
        API_BASE: 'https://my-soccer-team.netlify.app',
        GOOGLE_CLIENT_ID: '123456789-abcdefghijklmnop.apps.googleusercontent.com'
    }
};
```

### For Custom Domain:

```javascript
window.ENV_CONFIG = {
    PRODUCTION: {
        DOMAIN: 'https://soccer.mycompany.com',
        API_BASE: 'https://api.mycompany.com',
        GOOGLE_CLIENT_ID: '123456789-production-id.apps.googleusercontent.com'
    }
};
```

### For Testing/Staging:

```javascript
window.ENV_CONFIG = {
    FORCE_ENVIRONMENT: 'testing',
    TESTING: {
        DOMAIN: 'https://staging-soccer.netlify.app',
        API_BASE: 'https://staging-api.netlify.app',
        GOOGLE_CLIENT_ID: '123456789-staging-id.apps.googleusercontent.com'
    }
};
```

## Files to Update for Deployment

1. **`.env.js`** - Main environment configuration
2. **`js/config/appConfig.js`** - Application configuration (usually no changes needed)

## Environment Variables Available

After configuration, these are available in your app:

- `window.APP_CONFIG.SERVER.FRONTEND_URL` - Frontend URL
- `window.APP_CONFIG.SERVER.BACKEND_URL` - API URL  
- `window.APP_CONFIG.ENVIRONMENT` - Current environment
- `window.ENV_UTILS.log()` - Environment-aware logging
- `window.ENV_UTILS.getApiUrl()` - Get API endpoint URLs

## Testing Your Configuration

1. Deploy to Netlify
2. Open browser developer console
3. Check: `console.log(window.APP_CONFIG)`
4. Verify environment is detected correctly
5. Test API calls and authentication

## Common Issues

**Issue**: Wrong environment detected
**Solution**: Set `FORCE_ENVIRONMENT` in `.env.js`

**Issue**: API calls failing
**Solution**: Check `API_BASE` URL in production config

**Issue**: Google OAuth not working
**Solution**: Verify `GOOGLE_CLIENT_ID` and domain settings

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Console Logs | ✅ Enabled | ❌ Disabled |
| Debug Mode | ✅ Enabled | ❌ Disabled |
| API URL | localhost:3000 | Your domain |
| Error Details | ✅ Detailed | ❌ Generic |