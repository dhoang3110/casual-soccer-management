// Authentication Module for Soccer Team Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authCallbacks = [];
        this.registeredUsers = {};
        this.dataSync = window.dataSync;
        console.log('AuthManager: dataSync service available:', !!this.dataSync);
        this.init().catch(error => {
            console.error('AuthManager initialization error:', error);
        });
    }

    async init() {
        console.log('AuthManager initializing...');
        this.initializeFacebook();
        this.initializeGoogle();
        this.setupEventListeners();
        
        // Check data version and clear localStorage if needed
        await this.checkDataVersion();
        
        // Check for force logout parameter
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('logout') === 'true') {
            console.log('Force logout requested via URL parameter');
            await this.clearAllSessions();
            // Remove the parameter from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return; // Skip session check
        }
        
        // Check for force clear localStorage parameter
        if (urlParams.get('cleardata') === 'true') {
            console.log('Force localStorage clear requested via URL parameter');
            await this.forceClearLocalStorage();
            // Remove the parameter from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            alert('🗑️ All local data cleared!\n\nPlease log in again.');
            return; // Skip session check
        }
        
        await this.checkExistingSession();
        
        // Start periodic session validation (check every 30 seconds)
        this.startSessionValidation();
        
        // Debug: Check what APIs are available
        setTimeout(() => {
            console.log('Google APIs check:');
            console.log('- window.google:', typeof window.google);
            console.log('- google.accounts:', typeof window.google?.accounts);
            
            // Check Facebook configuration
            this.checkFacebookConfig();
            console.log('- google.accounts.oauth2:', typeof window.google?.accounts?.oauth2);
            
            // Show configuration help
            console.log('\n=== Google Cloud Console Configuration ===');
            console.log('Current URL:', window.location.origin);
            console.log('Add these to Authorized JavaScript Origins:');
            console.log('- http://localhost:8000');
            console.log('- http://127.0.0.1:8000');
            console.log('- ' + window.location.origin);
            console.log('\nAdd these to Authorized Redirect URIs:');
            console.log('- http://localhost:8000');
            console.log('- http://127.0.0.1:8000');
            console.log('- ' + window.location.origin);
            console.log('- http://localhost:8000/');
            console.log('- http://127.0.0.1:8000/');
            console.log('- ' + window.location.origin + '/');
        }, 2000);
    }

    // Initialize Facebook SDK
    initializeFacebook() {
        window.fbAsyncInit = () => {
            console.log('Initializing Facebook SDK...');
            
            // Configuration - Choose ONE of these methods:
            const useConfigurationId = false; // Set to true to use Configuration ID
            
            // Get Facebook App ID from environment configuration
            const facebookAppId = '799762102527678'; // Simple hardcoded value
            
            if (useConfigurationId) {
                // Method 1: Using Configuration ID (newer approach)
                FB.init({
                    appId: facebookAppId,
                    cookie: true,
                    xfbml: true,
                    version: 'v19.0'
                });
                
                // Store configuration ID for login
                this.facebookConfigId = '787457504132502'; // Replace with actual Configuration ID
                console.log('Facebook SDK initialized with Configuration ID:', this.facebookConfigId);
            } else {
                // Method 2: Traditional App ID approach
                FB.init({
                    appId: facebookAppId,
                    cookie: true,
                    xfbml: true,
                    version: 'v19.0'
                });
                console.log('Facebook SDK initialized with App ID');
            }
            
            // Check login status
            FB.getLoginStatus((response) => {
                console.log('Facebook login status:', response);
                if (response.status === 'connected') {
                    console.log('User is already logged into Facebook');
                    // Could auto-login here if desired
                }
            });
            
            console.log('Facebook SDK initialized');
        };
        
        // Debug Facebook SDK loading
        setTimeout(() => {
            console.log('\n=== Facebook SDK Check ===');
            console.log('- window.FB:', typeof window.FB);
            console.log('- FB.login:', typeof window.FB?.login);
            console.log('- FB.api:', typeof window.FB?.api);
            
            if (!window.FB) {
                console.log('Facebook SDK not loaded. Check:');
                console.log('1. Internet connection');
                console.log('2. Ad blockers or privacy extensions');
                console.log('3. Corporate firewall blocking Facebook');
            }
        }, 3000);
    }

    // Initialize Google Identity Services
    initializeGoogle() {
        // Wait for Google Identity Services to load
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            console.log('Google Identity Services loaded and ready');
            console.log('Available Google services:', Object.keys(google.accounts));
            
            // Pre-initialize the OAuth2 client for better reliability
            try {
                this.googleTokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: '660296369599-2t5u6qmve8q8tpkoh4o9uau9i6e4pmbj.apps.googleusercontent.com',
                    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
                    callback: '', // Will be set when login is called
                });
                console.log('Google OAuth2 client pre-initialized');
            } catch (error) {
                console.error('Error pre-initializing Google OAuth2 client:', error);
            }
        } else {
            // Wait a bit and try again
            console.log('Waiting for Google Identity Services to load...');
            setTimeout(() => this.initializeGoogle(), 100);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Use immediate setup if DOM is already loaded, otherwise wait
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.attachEventListeners());
        } else {
            this.attachEventListeners();
        }
    }

    attachEventListeners() {
        console.log('Attaching event listeners...');
        
        // Google login button
        const googleBtn = document.getElementById('googleLoginBtn');
        if (googleBtn) {
            console.log('Google login button found, attaching listener');
            googleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loginWithGoogle();
            });
        } else {
            console.log('Google login button not found');
        }

        // Facebook login button
        const facebookBtn = document.getElementById('facebookLoginBtn');
        if (facebookBtn) {
            console.log('Facebook login button found, attaching listener');
            facebookBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.loginWithFacebook();
            });
        } else {
            console.log('Facebook login button not found');
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            console.log('Logout button found, attaching listener');
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.logout();
            });
        } else {
            console.log('Logout button not found (this is normal on first load)');
        }

        // Admin login button
        const adminLoginBtn = document.getElementById('adminLoginBtn');
        if (adminLoginBtn) {
            console.log('Admin login button found, attaching listener');
            adminLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleAdminLogin();
            });
        }
        
        // Test server connection button (development only)
        const testServerBtn = document.getElementById('testServerBtn');
        if (testServerBtn) {
            console.log('Test server button found, attaching listener');
            testServerBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.testServerConnection();
            });
        }

        // Guest login button
        const guestLoginBtn = document.getElementById('guestLoginBtn');
        if (guestLoginBtn) {
            console.log('Guest login button found, attaching listener');
            guestLoginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔍 Guest login button clicked via event listener');
                this.showGuestLoginModal();
            });
        } else {
            console.log('Guest login button not found during event listener attachment');
        }

        // Guest login form
        const guestLoginForm = document.getElementById('guestLoginForm');
        if (guestLoginForm) {
            guestLoginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleGuestLogin();
            });
        }

        // Cancel guest login button
        const cancelGuestLogin = document.getElementById('cancelGuestLogin');
        if (cancelGuestLogin) {
            cancelGuestLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.hideGuestLoginModal();
            });
        }
    }

    // Google login handler
    loginWithGoogle() {
        console.log('Google login button clicked');
        
        if (this.googleTokenClient) {
            try {
                console.log('Using pre-initialized Google OAuth2 client...');
                
                // Update the callback for this login attempt
                this.googleTokenClient.callback = (tokenResponse) => {
                    console.log('Token response received:', tokenResponse);
                    if (tokenResponse.error) {
                        console.error('OAuth error:', tokenResponse.error);
                        this.handleAuthError('Google OAuth failed', tokenResponse.error);
                    } else {
                        this.handleGoogleTokenResponse(tokenResponse);
                    }
                };
                
                // Request access token (this will open the popup)
                this.googleTokenClient.requestAccessToken({
                    prompt: '',
                    hint: ''
                });
                
            } catch (error) {
                console.error('Google login error with pre-initialized client:', error);
                this.fallbackGoogleLogin();
            }
        } else {
            console.log('No pre-initialized client, trying direct initialization...');
            this.fallbackGoogleLogin();
        }
    }

    // Fallback Google login method
    fallbackGoogleLogin() {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            try {
                console.log('Initializing Google OAuth2 popup (fallback)...');
                
                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: '660296369599-2t5u6qmve8q8tpkoh4o9uau9i6e4pmbj.apps.googleusercontent.com',
                    scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                    callback: (tokenResponse) => {
                        console.log('Token response received (fallback):', tokenResponse);
                        if (tokenResponse.error) {
                            console.error('OAuth error:', tokenResponse.error);
                            // Show user-friendly error message
                            alert('Google login failed. Please check the console for details and ensure your Google Cloud Console is configured correctly.');
                            console.log('Falling back to demo login...');
                            this.handleDemoLogin('google');
                        } else {
                            this.handleGoogleTokenResponse(tokenResponse);
                        }
                    }
                });
                
                // Request access token with simplified options
                tokenClient.requestAccessToken({
                    prompt: '', // Remove 'consent' which might cause issues
                    hint: '',
                    hosted_domain: ''
                });
                
            } catch (error) {
                console.error('Google fallback login error:', error);
                console.log('Using demo login...');
                this.handleDemoLogin('google');
            }
        } else {
            console.log('Google OAuth2 not available - using demo login');
            this.handleDemoLogin('google');
        }
    }

    // Handle Google credential response (JWT token)
    async handleGoogleCredentialResponse(response) {
        console.log('Google credential response received');
        try {
            // Decode the JWT token
            const payload = this.parseJwt(response.credential);
            console.log('Google user payload:', payload);
            
            // SIMPLIFIED FLOW: Check if user email is authorized in members.json
            const isAuthorized = await this.checkMemberAuthorization(payload.email);
            
            if (!isAuthorized) {
                console.log('User email not authorized:', payload.email);
                // Store user info for the payment modal
                this.pendingUser = {
                    id: payload.sub,
                    name: payload.name,
                    email: payload.email,
                    picture: payload.picture,
                    provider: 'google'
                };
                this.showMembershipModal(payload);
                return;
            }
            
            // User is authorized - proceed with login
            console.log('User email authorized:', payload.email);
            this.currentUser = {
                id: payload.sub,
                name: payload.name,
                email: payload.email,
                picture: payload.picture,
                provider: 'google'
            };
            
            // Update user database and login
            await this.updateGlobalUserDatabase();
            await this.saveSession();
            this.showMainApp();
            
        } catch (error) {
            console.error('Error processing Google credential:', error);
            this.handleAuthError('Failed to process Google login', error);
        }
    }

    // Handle Google token response (OAuth2)
    async handleGoogleTokenResponse(tokenResponse) {
        console.log('Processing Google token response...');
        try {
            console.log('Making API call to get user info...');
            
            // Get user info using the access token
            const response = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${tokenResponse.access_token}`,
                    'Accept': 'application/json'
                }
            });
            
            console.log('API response status:', response.status);
            
            if (response.ok) {
                const userInfo = await response.json();
                console.log('Google user info received:', userInfo);
                
                // SIMPLIFIED FLOW: Check if user email is authorized in members.json
                const isAuthorized = await this.checkMemberAuthorization(userInfo.email);
                
                if (!isAuthorized) {
                    console.log('User email not authorized:', userInfo.email);
                    // Store user info for the payment modal
                    this.pendingUser = {
                        id: `google_${userInfo.email}`,
                        googleId: userInfo.id,
                        name: userInfo.name || userInfo.given_name + ' ' + userInfo.family_name,
                        email: userInfo.email,
                        picture: userInfo.picture,
                        provider: 'google'
                    };
                    this.showMembershipModal(userInfo);
                    return;
                }
                
                // User is authorized - proceed with login
                console.log('User email authorized:', userInfo.email);
                this.currentUser = {
                    id: `google_${userInfo.email}`,  // Use consistent ID format
                    googleId: userInfo.id,           // Store original Google ID
                    name: userInfo.name || userInfo.given_name + ' ' + userInfo.family_name,
                    email: userInfo.email,
                    picture: userInfo.picture,
                    provider: 'google'
                };
                
                console.log('Current user set with standardized ID:', this.currentUser);
                // Update user database and login
                await this.updateGlobalUserDatabase();
                await this.saveSession();
                this.showMainApp();
            } else {
                const errorText = await response.text();
                console.error('API response error:', errorText);
                throw new Error(`Failed to fetch user info: ${response.status} ${errorText}`);
            }
        } catch (error) {
            console.error('Error processing Google token:', error);
            this.handleAuthError('Failed to get Google user info', error);
        }
    }

    // Legacy Google user handler (kept for compatibility)
    handleGoogleUser(googleUser) {
        const profile = googleUser.getBasicProfile();
        this.currentUser = {
            id: profile.getId(),
            name: profile.getName(),
            email: profile.getEmail(),
            picture: profile.getImageUrl(),
            provider: 'google'
        };
        this.showMainApp();
    }

    // Facebook login handler
    loginWithFacebook() {
        console.log('Starting Facebook login...');
        
        // Check if FB SDK is loaded
        if (!window.FB || typeof FB.login !== 'function') {
            console.error('Facebook SDK not loaded properly');
            this.handleAuthError('Facebook SDK not loaded. Please check your internet connection and try again.');
            return;
        }

        console.log('Facebook SDK available, initiating login...');

        // Show loading state
        const facebookButton = document.getElementById('facebook-login');
        if (facebookButton) {
            facebookButton.textContent = 'Connecting to Facebook...';
            facebookButton.disabled = true;
        }

        // Choose login method based on configuration
        if (this.facebookConfigId) {
            // Method 1: Using Configuration ID
            console.log('Using Facebook Configuration ID login:', this.facebookConfigId);
            FB.login((response) => {
                this.handleFacebookLoginResponse(response, facebookButton);
            }, {
                config_id: this.facebookConfigId,
                // Configuration ID handles scopes automatically
            });
        } else {
            // Method 2: Traditional scope-based login
            console.log('Using traditional Facebook login with scopes');
            FB.login((response) => {
                this.handleFacebookLoginResponse(response, facebookButton);
            }, {
                scope: 'public_profile'
            });
        }
    }

    // Handle Facebook login response (shared by both methods)
    handleFacebookLoginResponse(response, facebookButton) {
        console.log('Facebook login response:', response);
        
        // Reset button state
        if (facebookButton) {
            facebookButton.textContent = 'Continue with Facebook';
            facebookButton.disabled = false;
        }
        
        if (response.authResponse) {
            console.log('Facebook login successful, getting user info...');
            FB.api('/me', {fields: 'name,picture'}, (userInfo) => {
                console.log('Facebook user info received:', userInfo);
                this.handleFacebookUser(userInfo);
            });
        } else {
            console.log('Facebook login failed or cancelled:', response);
            console.log('Facebook error details:', response.error_description || response.error_reason);
            console.log('Facebook response status:', response.status);
            
            // Handle different types of login failures - NO BYPASS ALLOWED
            if (response.error_description && response.error_description.includes('app isn\'t available')) {
                console.error('Facebook app configuration issue');
                this.handleAuthError('Facebook app is not properly configured. Please check the developer console settings and ensure:\n' +
                                   '1. App ID is correct\n' +
                                   '2. Valid OAuth Redirect URIs include http://localhost:8000/\n' +
                                   '3. Client OAuth Login is enabled\n' +
                                   '4. App is in Development mode');
                return;
            } else if (response.status === 'not_authorized') {
                console.error('Facebook login denied by user');
                this.handleAuthError('Facebook login was denied. You must authorize the app to continue. Please try again and click "Continue" in the Facebook popup.');
                return;
            } else if (response.status === 'unknown' || !response.status) {
                // User cancelled, popup blocked, or other issues
                console.error('Facebook login cancelled or blocked');
                
                // Check if it might be a popup blocker issue
                const isPopupBlocked = !response.status && !response.error_description;
                if (isPopupBlocked) {
                    console.error('Popup blocker detected');
                    this.handleAuthError('Facebook login popup was blocked. Please:\n' +
                                       '1. Allow popups for this website\n' +
                                       '2. Check your browser settings\n' +
                                       '3. Try again after enabling popups');
                } else {
                    // User explicitly cancelled
                    console.error('User cancelled Facebook login');
                    this.handleAuthError('Facebook login was cancelled. You must complete the Facebook login to continue.');
                }
                return;
            } else {
                // Unknown error
                console.error('Unknown Facebook login error:', response);
                this.handleAuthError('Facebook login failed with an unknown error. Please:\n' +
                                   '1. Check your internet connection\n' +
                                   '2. Try refreshing the page\n' +
                                   '3. Ensure Facebook is accessible');
                return;
            }
        }
    }

    async handleFacebookUser(response) {
        console.log('Processing Facebook user data:', response);
        
        try {
            this.currentUser = {
                id: response.id,
                name: response.name,
                email: response.email || `fb_user_${response.id}@facebook.local`, // Fallback email
                picture: response.picture?.data?.url || '',
                provider: 'facebook'
            };
            
            // Update global user database and save session
            await this.updateGlobalUserDatabase();
            await this.saveSession();
            
            console.log('Facebook user logged in successfully:', this.currentUser.name);
            this.showMainApp();
        } catch (error) {
            console.error('Error processing Facebook user data:', error);
            this.handleAuthError('Failed to process Facebook login data. Please try again.');
        }
    }

    // Demo login for testing without OAuth setup
    async handleDemoLogin(provider) {
        console.log(`Demo login with ${provider}`);
        
        const demoUsers = {
            google: {
                id: 'demo_google_123',
                name: 'Demo User (Google)',
                email: 'demouser@gmail.com',
                picture: 'https://ui-avatars.com/api/?name=Demo+User&background=4285f4&color=fff',
                provider: 'google'
            },
            facebook: {
                id: 'demo_facebook_456',
                name: 'Demo User (Facebook)',
                email: 'demouser@facebook.com',
                picture: 'https://ui-avatars.com/api/?name=Demo+User&background=1877f2&color=fff',
                provider: 'facebook'
            }
        };

        this.currentUser = demoUsers[provider];
        console.log('Demo user created:', this.currentUser);
        
        // Update global user database and save session
        await this.updateGlobalUserDatabase();
        await this.saveSession();
        
        // Show success message with better explanation
        const message = `🎯 Demo Login Successful!\n\n` +
                       `Welcome ${this.currentUser.name}!\n\n` +
                       `You can now use all features of the Soccer Team Manager app.\n` +
                       `This demo login works exactly like the real ${provider} login.\n\n` +
                       `Click OK to continue to the main app.`;
        alert(message);
        
        this.showMainApp();
    }

    // Admin login with password authentication - TEMPORARILY DISABLED FOR TESTING
    async handleAdminLogin() {
        console.log('Admin login requested - PASSWORD CHECK TEMPORARILY DISABLED');
        
        // TEMPORARILY SKIP PASSWORD CHECK FOR QUICK TESTING
        console.log('🚀 Bypassing password check for quick admin access...');
        
        // Create admin user directly
        this.currentUser = {
            id: 'admin_001',
            name: 'Admin (Quick Access)',
            email: 'admin@soccermanager.local',
            picture: 'https://ui-avatars.com/api/?name=Admin&background=dc3545&color=fff&bold=true',
            provider: 'admin',
            role: 'administrator',
            positions: ['any'],
            skillLevel: 'average',
            skillInfo: {
                label: 'Average',
                points: 2,
                description: 'Decent player, some experience'
            }
        };
        
        // Update global user database and save session
        await this.updateGlobalUserDatabase();
        await this.saveSession();
        
        console.log('✅ Admin user created with quick access:', this.currentUser);
        
        // Go directly to main app
        this.showMainApp();
        
        /* ORIGINAL PASSWORD CHECK CODE - TEMPORARILY COMMENTED OUT
        // Show password prompt
        const password = prompt('🔐 Admin Access Required\n\nEnter admin password:');
        
        // Check if user cancelled
        if (password === null) {
            console.log('Admin login cancelled');
            return;
        }
        
        // Validate password (you can change this password)
        if (password === 'admin123' || password === '1234567890') {
            console.log('Admin password correct, logging in...');
            
            // Create admin user
            this.currentUser = {
                id: 'admin_001',
                name: 'Admin',
                email: 'admin@soccermanager.local',
                picture: 'https://ui-avatars.com/api/?name=Admin&background=dc3545&color=fff&bold=true',
                provider: 'admin',
                role: 'administrator',
                positions: ['any'],
                skillLevel: 'average',
                skillInfo: {
                    label: 'Average',
                    points: 2,
                    description: 'Decent player, some experience'
                }
            };
            
            // Update global user database and save session
            await this.updateGlobalUserDatabase();
            await this.saveSession();
            
            console.log('Admin user created:', this.currentUser);
            
            // Go directly to main app without showing success message
            this.showMainApp();
        } else {
            console.log('Invalid admin password');
            
            // Show error for wrong password
            alert('❌ Access Denied!\n\nIncorrect admin password.\n\nPlease contact the Admin if you need access.');
            
            // Optional: Add attempt logging or lockout here
            console.warn('Failed admin login attempt with password:', password);
        }
        */
    }

    // Guest Login Methods
    showGuestLoginModal() {
        console.log('Showing guest login modal');
        const loginOverlay = document.getElementById('loginOverlay');
        const guestModal = document.getElementById('guestLoginModal');
        
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (guestModal) guestModal.style.display = 'flex';
        
        // Focus on name input
        const nameInput = document.getElementById('guestName');
        if (nameInput) {
            setTimeout(() => nameInput.focus(), 100);
        }
    }

    hideGuestLoginModal() {
        console.log('Hiding guest login modal');
        const guestModal = document.getElementById('guestLoginModal');
        const loginOverlay = document.getElementById('loginOverlay');
        
        if (guestModal) guestModal.style.display = 'none';
        if (loginOverlay) loginOverlay.style.display = 'flex';
        
        // Clear form
        this.clearGuestLoginForm();
    }

    clearGuestLoginForm() {
        const nameInput = document.getElementById('guestName');
        const skillSelect = document.getElementById('guestSkillLevel');
        const positionsSelect = document.getElementById('guestPositions');
        
        if (nameInput) nameInput.value = '';
        if (skillSelect) skillSelect.selectedIndex = 0;
        if (positionsSelect) {
            Array.from(positionsSelect.options).forEach(option => {
                option.selected = option.value === 'any';
            });
        }
    }

    async handleGuestLogin() {
        console.log('Processing guest login...');
        
        const nameInput = document.getElementById('guestName');
        const phoneInput = document.getElementById('guestPhone');
        const skillSelect = document.getElementById('guestSkillLevel');
        const positionsSelect = document.getElementById('guestPositions');
        
        if (!nameInput || !skillSelect || !positionsSelect) {
            console.error('Guest login form elements not found');
            alert('❌ Form error. Please refresh and try again.');
            return;
        }
        
        const name = nameInput.value.trim();
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const skill = skillSelect.value;
        const selectedPositions = Array.from(positionsSelect.selectedOptions).map(option => option.value);
        
        // Validation
        if (!name) {
            alert('Please enter your name');
            nameInput.focus();
            return;
        }
        
        if (name.length < 2) {
            alert('Name must be at least 2 characters long');
            nameInput.focus();
            return;
        }
        
        if (!skill) {
            alert('Please select your skill level');
            skillSelect.focus();
            return;
        }
        
        if (selectedPositions.length === 0) {
            alert('Please select at least one position');
            positionsSelect.focus();
            return;
        }
        
        // Validate phone using shared utility
        const phoneValidation = window.ValidationUtils.validatePhone(phone);
        if (!phoneValidation.isValid) {
            window.NotificationUtils.showValidationError(phoneValidation.message);
            phoneInput.focus();
            return;
        }
        
        try {
            // Check if phone number already exists (for returning guests)
            const existingGuest = await this.checkExistingGuestByPhone(phone);
            if (existingGuest) {
                // Login existing guest
                this.currentUser = existingGuest;
                const guestModal = document.getElementById('guestLoginModal');
                if (guestModal) guestModal.style.display = 'none';
                
                alert(`✅ Welcome back, ${existingGuest.name}!\n\nLogged in successfully with your phone number.`);
                await this.showMainApp();
                return;
            }
            
            // Check if name already exists for new registrations
            await this.validateGuestName(name);
            
            // Check if phone number is already registered
            await this.validateGuestPhone(phone);
            
            // Create guest user
            const guestUser = await this.createGuestUser(name, skill, selectedPositions, phone);
            
            // Set as current user
            this.currentUser = guestUser;
            
            // Save to system using the same method as admin-added casuals
            if (window.app && typeof window.app.saveCasualUser === 'function') {
                await window.app.saveCasualUser(guestUser);
            } else {
                await this.saveGuestUser(guestUser);
            }
            
            // Hide modal and show success
            const guestModal = document.getElementById('guestLoginModal');
            if (guestModal) guestModal.style.display = 'none';
            
            // Show success message
            alert(`✅ Welcome, ${name}!\n\nYou've successfully joined as a guest player. You can now sign up for games and participate in team activities.`);
            
        // Show main app
        await this.showMainApp();
        
        // Debug: Ensure logout is working for guests
        console.log('🔍 Guest login completed, checking logout button...');
        setTimeout(() => {
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                console.log('✅ Logout button found after guest login');
                console.log('Button style display:', logoutBtn.style.display);
                console.log('Button visibility:', getComputedStyle(logoutBtn).visibility);
            } else {
                console.log('❌ Logout button NOT found after guest login');
            }
        }, 500);        } catch (error) {
            console.error('Error creating guest user:', error);
            alert(`❌ Error: ${error.message}`);
        }
    }

    async checkExistingGuestByPhone(phone) {
        if (!phone || phone.trim() === '') {
            return null;
        }

        const cleanPhone = phone.replace(/\s+/g, '').replace(/[-()]/g, '');
        
        // Check against server users first
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const usersObj = await response.json();
                const users = Object.values(usersObj);
                const existingGuest = users.find(user => {
                    // Check for guest providers (both guest_casual and admin_casual)
                    const isGuestUser = user.provider === 'guest_casual' || user.provider === 'admin_casual' || user.provider === 'guest' || user.provider === 'admin';
                    if (!isGuestUser || !user.phone) {
                        return false;
                    }
                    
                    const userCleanPhone = user.phone.replace(/\s+/g, '').replace(/[-()]/g, '');
                    return userCleanPhone === cleanPhone;
                });
                
                if (existingGuest) {
                    console.log(`✅ Found existing guest by phone: ${existingGuest.name} (${existingGuest.phone})`);
                    return existingGuest;
                }
            }
        } catch (error) {
            console.log('Could not check server users, checking local data...', error.message);
        }
        
        // Check against local storage
        const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        const localGuest = Object.values(existingUsers).find(user => {
            const isGuestUser = user.provider === 'guest_casual' || user.provider === 'admin_casual' || user.provider === 'guest' || user.provider === 'admin';
            if (!isGuestUser || !user.phone) {
                return false;
            }
            
            const userCleanPhone = user.phone.replace(/\s+/g, '').replace(/[-()]/g, '');
            return userCleanPhone === cleanPhone;
        });
        
        if (localGuest) {
            console.log(`✅ Found existing guest in local storage: ${localGuest.name} (${localGuest.phone})`);
        } else {
            console.log(`❌ No existing guest found for phone: ${phone}`);
        }
        
        return localGuest;
    }

    async validateGuestName(name) {
        // Check against existing registered users
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const usersObj = await response.json();
                const users = Object.values(usersObj);
                const existingUser = users.find(user => 
                    (user.name || '').toLowerCase() === name.toLowerCase() ||
                    (user.displayName || '').toLowerCase() === name.toLowerCase()
                );
                
                if (existingUser) {
                    // Generate suggested alternatives
                    const suggestions = [
                        `${name}2`,
                        `${name}_new`,
                        `${name}${new Date().getFullYear()}`,
                        `${name}_${Math.floor(Math.random() * 100)}`
                    ];
                    throw new Error(`❌ A player named "${name}" already exists. Try: ${suggestions.slice(0, 2).join(', ')}`);
                }
            }
        } catch (error) {
            if (error.message.includes('already exists')) {
                throw error; // Re-throw the validation error
            }
            console.log('Could not validate against server users, checking local data...', error.message);
        }
        
        // Check against local storage
        const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        const existingNames = Object.values(existingUsers).map(user => (user.name || '').toLowerCase());
        
        if (existingNames.includes(name.toLowerCase())) {
            // Generate suggested alternatives
            const suggestions = [
                `${name}2`,
                `${name}_new`,
                `${name}${new Date().getFullYear()}`,
                `${name}_${Math.floor(Math.random() * 100)}`
            ];
            throw new Error(`❌ A player named "${name}" already exists. Try: ${suggestions.slice(0, 2).join(', ')}`);
        }
    }

    async validateGuestPhone(phone) {
        // Skip validation if no phone number provided
        if (!phone || phone.trim() === '') {
            return;
        }

        const cleanPhone = phone.replace(/\s+/g, '').replace(/[-()]/g, '');
        
        // Check against existing users in the server
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const usersObj = await response.json();
                const users = Object.values(usersObj);
                const existingUser = users.find(user => {
                    if (!user.phone) return false;
                    const userCleanPhone = user.phone.replace(/\s+/g, '').replace(/[-()]/g, '');
                    return userCleanPhone === cleanPhone;
                });
                
                if (existingUser) {
                    throw new Error(`📱 Phone number "${phone}" is already registered to "${existingUser.name}". Please use a different phone number or contact admin if this is your number.`);
                }
            }
        } catch (error) {
            if (error.message.includes('already registered')) {
                throw error; // Re-throw the validation error
            }
            console.log('Could not validate against server users, checking local data...', error.message);
        }
        
        // Check against local storage
        const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        const existingPhones = Object.values(existingUsers)
            .filter(user => user.phone)
            .map(user => user.phone.replace(/\s+/g, '').replace(/[-()]/g, ''));
        
        if (existingPhones.includes(cleanPhone)) {
            const existingUser = Object.values(existingUsers).find(user => {
                if (!user.phone) return false;
                const userCleanPhone = user.phone.replace(/\s+/g, '').replace(/[-()]/g, '');
                return userCleanPhone === cleanPhone;
            });
            throw new Error(`📱 Phone number "${phone}" is already registered to "${existingUser?.name || 'another user'}". Please use a different phone number.`);
        }

        // Also check members.json for phone numbers
        try {
            const membersResponse = await fetch('/api/members');
            if (membersResponse.ok) {
                const members = await membersResponse.json();
                const existingMember = Object.values(members).find(member => {
                    if (!member.phone) return false;
                    const memberCleanPhone = member.phone.replace(/\s+/g, '').replace(/[-()]/g, '');
                    return memberCleanPhone === cleanPhone;
                });
                
                if (existingMember) {
                    throw new Error(`📱 Phone number "${phone}" is already registered to member "${existingMember.name}". Please use a different phone number or contact admin if this is your number.`);
                }
            }
        } catch (error) {
            if (error.message.includes('already registered')) {
                throw error; // Re-throw the validation error
            }
            console.log('Could not validate against members data...', error.message);
        }
    }

    createGuestUser(name, skill, positions, phone = '') {
        const userId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const skillInfo = window.getSkillInfo ? window.getSkillInfo(skill) : {
            label: skill.charAt(0).toUpperCase() + skill.slice(1),
            points: { excellent: 4, good: 3, average: 2, basic: 1 }[skill] || 2,
            description: 'Self-assessed skill level'
        };
        
        // Use same structure as admin-added casual players
        return {
            id: userId,
            name: name,
            email: `${name.toLowerCase().replace(/\s+/g, '.')}@guest.local`,
            phone: phone,
            provider: 'guest_casual',
            role: 'player',
            skillLevel: skill,
            skillInfo: skillInfo,
            positions: positions,
            addedBy: 'self',
            dateAdded: new Date().toISOString(),
            status: 'activated',
            firstLoginDate: new Date().toISOString(),
            lastLoginDate: new Date().toISOString(),
            profileComplete: true,
            lastActive: Date.now(),
            isProfileComplete: true,
            sessionActive: true,
            loggedOut: false,
            picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=28a745&color=fff&bold=true`
        };
    }

    async saveGuestUser(guestUser) {
        // Save to local storage
        const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
        existingUsers[guestUser.id] = guestUser;
        localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
        
        // Try to save to server if available
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(guestUser)
            });
            
            if (response.ok) {
                console.log('Guest user saved to server successfully');
            } else {
                console.log('Could not save to server, using local storage only');
            }
        } catch (error) {
            console.log('Server not available, using local storage only');
        }
        
        // Update global user database
        await this.updateGlobalUserDatabase();
        
        // Save session
        await this.saveSession();
        
        console.log('Guest user created and saved:', guestUser);
    }

    // Show main application after successful login
    async showMainApp() {
        console.log('Showing main app for user:', this.currentUser.name);
        
        // Check if user profile is complete (skip for admin)
        if (this.currentUser.role !== 'administrator' && !this.isUserProfileComplete()) {
            console.log('User profile incomplete, showing profile setup');
            this.showUserProfileSetup();
            return;
        }
        
        const loginOverlay = document.getElementById('loginOverlay');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const userAvatar = document.getElementById('userAvatar');
        const userPhone = document.getElementById('userPhone');

        if (loginOverlay) {
            loginOverlay.style.display = 'none';
            console.log('Login overlay hidden');
        }
        if (userInfo) {
            userInfo.style.display = 'flex';
            console.log('User info shown');
        }
        if (userName) {
            // Show badge for different user types
            if (this.currentUser.role === 'administrator') {
                userName.innerHTML = `🔐 ${this.currentUser.name} <span style="background: #dc3545; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; margin-left: 5px;">ADMIN</span>`;
            } else if (this.currentUser.provider === 'guest' || this.currentUser.provider === 'guest_casual') {
                userName.innerHTML = `👤 ${this.currentUser.name} <span style="background: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 0.8em; margin-left: 5px;">GUEST</span>`;
            } else {
                userName.textContent = this.currentUser.displayName || this.currentUser.name;
            }
        }
        if (userAvatar) userAvatar.src = this.currentUser.picture;
        
        // Show phone number if available
        if (userPhone && this.currentUser.phone) {
            userPhone.textContent = `📱 ${this.currentUser.phone}`;
            userPhone.style.display = 'block';
        } else if (userPhone) {
            userPhone.style.display = 'none';
        }
        
        // Apply role-based access control
        this.applyRoleBasedAccess();
        
        // Ensure logout button is properly attached
        this.attachLogoutHandler();
        
        // Save session
        await this.saveSession();
        
        // Load user's data
        this.loadUserData();
        
        // Update global user database
        await this.updateGlobalUserDatabase();
        
        // Initialize tabs and restore saved tab state
        if (window.app && typeof window.app.initializeTabsAfterAuth === 'function') {
            await window.app.initializeTabsAfterAuth();
        } else if (window.app && typeof window.app.loadSignups === 'function') {
            // Fallback: just refresh signup data if initializeTabsAfterAuth is not available
            window.app.loadSignups();
        }
        
        // Notify callbacks
        this.notifyAuthCallbacks();
    }

    // Check if user profile is complete (server-only)
    async isUserProfileComplete() {
        if (!this.currentUser || !this.currentUser.email) return false;

        try {
            // Check server for user profile completion
            if (!this.dataSync) return false;
            
            const users = await this.dataSync.getUsers();
            const userKey = this.currentUser.email;
            const serverUser = users[userKey];
            
            return serverUser && serverUser.displayName && serverUser.skillLevel;
        } catch (error) {
            console.error('Error checking user profile completion:', error);
            return false;
        }
    }

    // Show user profile setup modal
    showUserProfileSetup() {
        const loginOverlay = document.getElementById('loginOverlay');
        const profileModal = document.getElementById('userProfileModal');
        const profileName = document.getElementById('profileName');

        if (loginOverlay) {
            loginOverlay.style.display = 'none';
        }
        if (profileModal) {
            profileModal.style.display = 'flex';
        }
        
        // Pre-fill with OAuth name if available
        if (profileName && this.currentUser.name) {
            profileName.value = this.currentUser.name;
        }
    }

    // Save user profile (tied to Google account)
    async saveUserProfile(displayName, skillLevel) {
        if (!this.currentUser || !this.currentUser.email) {
            console.error('No user email available for saving profile');
            return false;
        }

        // Use centralized skill system

        const profile = {
            id: this.getUserId(),
            name: this.currentUser.name,
            displayName: displayName,
            skillLevel: skillLevel,
            skillInfo: window.getSkillInfo ? window.getSkillInfo(skillLevel) : { label: 'Average', points: 2 },
            completedAt: new Date().toISOString(),
            provider: this.currentUser.provider,
            email: this.currentUser.email,
            picture: this.currentUser.picture,
            lastActive: Date.now(),
            sessionActive: true
        };

        try {
            // Save to server instead of localStorage
            if (this.dataSync) {
                const userKey = this.currentUser.email;
                await this.dataSync.saveUser(userKey, profile);
                console.log('AuthManager: User profile saved to server');
            } else {
                throw new Error('DataSync service not available');
            }
            
            // Update current user object
            this.currentUser.displayName = displayName;
            this.currentUser.skillLevel = skillLevel;
            this.currentUser.skillInfo = window.getSkillInfo ? window.getSkillInfo(skillLevel) : { label: 'Average', points: 2 };
            
            console.log('User profile saved for Google account:', this.currentUser.email, profile);
            return true;
        } catch (error) {
            console.error('Error saving user profile:', error);
            return false;
        }
    }

    // Get user profile (server-only)
    async getUserProfile() {
        if (!this.currentUser || !this.currentUser.email) return null;

        try {
            // Get profile from server
            if (!this.dataSync) return null;
            
            const users = await this.dataSync.getUsers();
            const userKey = this.currentUser.email;
            return users[userKey] || null;
        } catch (error) {
            console.error('Error getting user profile:', error);
            return null;
        }
    }

    // Update global user database for admin to see
    async updateGlobalUserDatabase() {
        if (this.currentUser.role === 'administrator') return; // Skip admin

        if (!this.currentUser.email) return;

        try {
            const userId = `google_${this.currentUser.email}`; // Stable ID based on email
            
            // Get existing user data from server to preserve integrated member data
            const existingUsers = await this.dataSync.getUsers();
            const existingUserData = existingUsers[userId] || {};
            
            // Only update essential session fields, preserve member integration data and phone numbers
            const userData = {
                id: userId,
                googleId: this.currentUser.id, // Original Google ID
                email: this.currentUser.email,
                picture: this.currentUser.picture,
                provider: this.currentUser.provider,
                lastActive: Date.now(),
                isProfileComplete: true,
                // Preserve existing integrated member data
                ...(existingUserData.name && { name: existingUserData.name }),
                ...(existingUserData.skillLevel && { skillLevel: existingUserData.skillLevel }),
                ...(existingUserData.skillInfo && { skillInfo: existingUserData.skillInfo }),
                ...(existingUserData.positions && { positions: existingUserData.positions }),
                // Preserve phone number for casual players
                ...(existingUserData.phone && { phone: existingUserData.phone }),
                // Preserve other important casual player fields
                ...(existingUserData.addedBy && { addedBy: existingUserData.addedBy }),
                ...(existingUserData.dateAdded && { dateAdded: existingUserData.dateAdded }),
                ...(existingUserData.status && { status: existingUserData.status }),
                ...(existingUserData.firstLoginDate && { firstLoginDate: existingUserData.firstLoginDate }),
                ...(existingUserData.profileComplete && { profileComplete: existingUserData.profileComplete })
            };

            // Save to server and update local cache
            await this.dataSync.saveUser(userId, userData);
            this.registeredUsers[userId] = userData;
            
            console.log('Global user database updated for:', this.currentUser.email, existingUserData.name ? 'with preserved member data' : 'basic data only');
        } catch (error) {
            console.error('Error updating global user database:', error);
        }
    }

    // Apply role-based access control
    applyRoleBasedAccess() {
        const container = document.querySelector('.container');
        
        if (this.currentUser.role === 'administrator') {
            // Admin user - show all tabs including admin-only
            console.log('Applying admin access permissions');
            if (container) {
                container.classList.add('admin-access');
                container.classList.remove('guest-access');
            }
            
            // Ensure Players tab is visible and accessible
            const playersTab = document.getElementById('playersTab');
            const playersContent = document.getElementById('players');
            
            if (playersTab) {
                playersTab.style.display = 'inline-block';
                playersTab.classList.remove('hidden');
            }
            if (playersContent) {
                playersContent.style.display = 'block';  
            }
            
            // Set Players tab as active for admin
            this.switchToAdminTab();
        } else if (this.isGuest()) {
            // Guest user - read-only access
            console.log('Applying guest access permissions - read-only mode');
            if (container) {
                container.classList.remove('admin-access');
                container.classList.add('guest-access');
            }
            
            this.applyGuestRestrictions();
            this.switchToDefaultTab();
        } else {
            // Regular user - hide admin-only content
            console.log('Applying regular user permissions - hiding admin content');
            if (container) {
                container.classList.remove('admin-access');
                container.classList.remove('guest-access');
            }
            
            // Hide Players tab and content
            const playersTab = document.getElementById('playersTab');
            const playersContent = document.getElementById('players');
            
            if (playersTab) {
                playersTab.style.display = 'none';
            }
            if (playersContent) {
                playersContent.style.display = 'none';
            }
            
            // Switch to a different tab if currently on Players
            const currentTab = document.querySelector('.tab-button.active');
            if (currentTab && currentTab.id === 'playersTab') {
                // Switch to Weekly Signup tab for regular users
                this.switchToDefaultTab();
            }
        }
    }

    // Apply guest user restrictions (read-only mode)
    applyGuestRestrictions() {
        console.log('Applying guest restrictions - converting to read-only mode');
        
        // Hide admin tab
        const adminTab = document.getElementById('adminTab');
        if (adminTab) {
            adminTab.style.display = 'none';
        }
        
        // Hide all interactive elements in signup section
        this.hideInteractiveElements();
        
        // Show guest notice
        this.showGuestNotice();
        
        // Modify player list to be read-only
        this.makePlayerListReadOnly();
    }

    hideInteractiveElements() {
        // Hide admin controls
        const adminSections = document.querySelectorAll('.admin-section, .admin-only');
        adminSections.forEach(section => {
            section.style.display = 'none';
        });
        
        // Hide any signup buttons or interactive elements that might appear later
        // This will be handled when the signup list is rendered
    }

    showGuestNotice() {
        // Add a notice at the top of the signup section for guests
        const signupContent = document.getElementById('signup');
        if (signupContent) {
            let guestNotice = document.getElementById('guestNotice');
            if (!guestNotice) {
                guestNotice = document.createElement('div');
                guestNotice.id = 'guestNotice';
                guestNotice.innerHTML = `
                    <div style="background: #e8f5e8; border: 2px solid #28a745; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                            <span style="font-size: 1.5em; margin-right: 10px;">👤</span>
                            <h3 style="margin: 0; color: #155724;">Welcome, Guest Player!</h3>
                        </div>
                        <p style="margin: 0; color: #155724;">
                            You're viewing the player list in <strong>read-only mode</strong>. 
                            You can see who's signed up for games, but you cannot interact with the signup system. 
                            Contact an admin if you need to sign up for games.
                        </p>
                    </div>
                `;
                signupContent.insertBefore(guestNotice, signupContent.firstChild);
            }
        }
    }

    makePlayerListReadOnly() {
        // This will be handled by modifying the app.js methods to not show buttons for guests
        // We'll do this by modifying the rendering logic in the app
    }

    // Switch to admin tab (Players)
    switchToAdminTab() {
        console.log('Switching to admin tab for admin user');
        
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Activate Players tab for admin
        const playersTab = document.getElementById('playersTab');
        const playersContent = document.getElementById('players');
        
        if (playersTab) {
            playersTab.classList.add('active');
        }
        if (playersContent) {
            playersContent.classList.add('active');
        }
        
        // Call the global switchTab function if it exists
        if (typeof window.switchTab === 'function') {
            window.switchTab('players');
        }
    }

    // Switch to default tab for regular users
    switchToDefaultTab() {
        console.log('Switching to default tab for regular user');
        
        // Remove active class from all tabs and content
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Activate Weekly Signup tab (index 1, since Players is hidden)
        const signupTab = document.getElementById('signupTab');
        const signupContent = document.getElementById('signup');
        
        if (signupTab) {
            signupTab.classList.add('active');
        }
        if (signupContent) {
            signupContent.classList.add('active');
        }
        
        // Call the global switchTab function if it exists
        if (typeof window.switchTab === 'function') {
            window.switchTab('signup');
        }
    }

    // Attach logout handler to button
    attachLogoutHandler() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            console.log('Attaching logout handler to button');
            // Remove any existing listeners to prevent duplicates
            logoutBtn.replaceWith(logoutBtn.cloneNode(true));
            const newLogoutBtn = document.getElementById('logoutBtn');
            if (newLogoutBtn) {
                newLogoutBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    console.log('Logout button clicked');
                    await this.logout();
                });
                console.log('Logout handler attached successfully');
            }
        } else {
            console.log('Logout button not found - this may be normal during initialization');
        }
    }

    // Logout functionality
    async logout() {
        console.log('🚪 Starting logout process...');
        
        const userName = this.currentUser ? this.currentUser.name : 'Unknown';
        console.log(`Logging out user: ${userName}`);
        
        // Store current user reference before clearing
        const userToLogout = this.currentUser;
        
        if (userToLogout) {
            // Handle provider-specific logout
            if (userToLogout.provider === 'google') {
                // For new Google Identity Services
                if (typeof google !== 'undefined' && google.accounts) {
                    google.accounts.id.disableAutoSelect();
                }
                // Legacy gapi logout (fallback)
                if (window.gapi && gapi.auth2) {
                    gapi.auth2.getAuthInstance().signOut();
                }
            } else if (userToLogout.provider === 'facebook') {
                FB.logout();
            }
        }
        
        // Clear session on server BEFORE clearing local user
        // This ensures we have user data to identify the correct server record
        if (userToLogout) {
            await this.clearSession();
        }
        
        // Clear local user data
        this.currentUser = null;
        
        // Update UI
        const loginOverlay = document.getElementById('loginOverlay');
        const userInfo = document.getElementById('userInfo');
        
        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        
        // Clear user data
        if (window.app) {
            await window.app.clearData();
        }
        
        console.log(`✅ Logout completed for ${userName}`);
    }

    // Clear all sessions (for debugging)
    async clearAllSessions() {
        console.log('🗑️ Clearing all sessions...');
        
        try {
            // Clear localStorage
            localStorage.removeItem('casualSoccerAuth');
            localStorage.removeItem('userSession');
            localStorage.removeItem('currentUser');
            
            // Clear all server sessions
            const users = await this.dataSync.getUsers();
            const updates = {};
            
            for (const [userId, user] of Object.entries(users)) {
                updates[userId] = {
                    ...user,
                    sessionActive: false,
                    loggedOut: true,
                    lastLogout: Date.now()
                };
            }
            
            if (Object.keys(updates).length > 0) {
                await this.dataSync.saveUsers(updates);
            }
            
            // Clear current user
            this.currentUser = null;
            
            // Show login overlay
            const loginOverlay = document.getElementById('loginOverlay');
            const userInfo = document.getElementById('userInfo');
            
            if (loginOverlay) loginOverlay.style.display = 'flex';
            if (userInfo) userInfo.style.display = 'none';
            
            console.log('✅ All sessions cleared successfully');
        } catch (error) {
            console.error('❌ Error clearing all sessions:', error);
            throw error;
        }
    }

    // Check data version and clear localStorage if needed
    async checkDataVersion() {
        const CURRENT_DATA_VERSION = '2025.9.28.1'; // Update this when you need to force clear
        const STORAGE_VERSION_KEY = 'casualSoccerDataVersion';
        
        try {
            let requiredVersion = CURRENT_DATA_VERSION;
            let clearReason = 'version update';
            
            // Check if server requires a specific version (for admin-triggered resets)
            try {
                const serverVersionResponse = await fetch('http://localhost:3000/api/config/data-version');
                if (serverVersionResponse.ok) {
                    const serverVersionData = await serverVersionResponse.json();
                    if (serverVersionData.version && serverVersionData.requiresClear) {
                        requiredVersion = serverVersionData.version;
                        clearReason = serverVersionData.reason || 'admin data reset';
                        console.log(`🔄 Server requires data version: ${requiredVersion} (${clearReason})`);
                    }
                }
            } catch (serverError) {
                // Server version check not available, use local version
                console.log('📱 Using local data version check (server config not available)');
            }
            
            const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
            
            if (storedVersion !== requiredVersion) {
                console.log(`🔃 Data version mismatch - stored: ${storedVersion}, required: ${requiredVersion}`);
                console.log(`🗑️ Clearing localStorage due to ${clearReason}...`);
                
                // Clear all app-related localStorage data
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (
                        key.includes('casualSoccer') ||
                        key.includes('registeredUsers') ||
                        key.includes('userSession') ||
                        key.includes('currentUser') ||
                        key.includes('signupData') ||
                        key.includes('activeTab')
                    )) {
                        keysToRemove.push(key);
                    }
                }
                
                // Remove old data
                keysToRemove.forEach(key => {
                    console.log(`🗑️ Removing localStorage key: ${key}`);
                    localStorage.removeItem(key);
                });
                
                // Set new version
                localStorage.setItem(STORAGE_VERSION_KEY, requiredVersion);
                console.log(`✅ localStorage cleared and version updated to ${requiredVersion}`);
                
                // Show notification to user with appropriate message
                if (keysToRemove.length > 0) {
                    const message = clearReason.includes('reset') ? 
                        '🔄 System Data Reset!\n\nAll app data has been reset by an administrator.\nYour local data has been cleared.\n\nPlease log in again.' :
                        '📱 App Data Updated!\n\nYour local data has been cleared for compatibility.\nPlease log in again.';
                        
                    setTimeout(() => {
                        alert(message);
                    }, 100);
                }
            } else {
                console.log(`✅ Data version current: ${requiredVersion}`);
            }
        } catch (error) {
            console.error('❌ Error checking data version:', error);
        }
    }

    // Force clear all localStorage (for URL parameter)
    async forceClearLocalStorage() {
        console.log('🗑️ Force clearing all localStorage...');
        
        try {
            // Clear all localStorage
            const allKeys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key) allKeys.push(key);
            }
            
            allKeys.forEach(key => {
                console.log(`🗑️ Removing localStorage key: ${key}`);
                localStorage.removeItem(key);
            });
            
            console.log(`✅ Cleared ${allKeys.length} localStorage keys`);
            
            // Also clear server sessions if dataSync is available
            if (this.dataSync) {
                const users = await this.dataSync.getUsers();
                const updates = {};
                
                for (const [userId, user] of Object.entries(users)) {
                    updates[userId] = {
                        ...user,
                        sessionActive: false,
                        loggedOut: true,
                        lastLogout: Date.now()
                    };
                }
                
                if (Object.keys(updates).length > 0) {
                    await this.dataSync.saveUsers(updates);
                    console.log('✅ Server sessions cleared');
                }
            }
            
        } catch (error) {
            console.error('❌ Error force clearing localStorage:', error);
        }
    }

    // Session management
    async saveSession() {
        if (this.currentUser) {
            // Add session info to user data and clear logout flags
            const sessionData = {
                ...this.currentUser,
                lastLogin: Date.now(),
                sessionActive: true,
                loggedOut: false,
                lastLogout: null
            };
            
            // Use consistent user ID calculation - prefer email-based ID for Google users
            const userId = this.currentUser.email ? `google_${this.currentUser.email}` : this.currentUser.id;
            
            console.log(`💾 Saving session for user: ${this.currentUser.name}`);
            console.log(`  User ID: ${userId}`);
            console.log(`  Provider: ${this.currentUser.provider}`);
            console.log(`  Session data includes: sessionActive=true, lastLogin=${new Date().toLocaleString()}`);
            
            await this.dataSync.saveUser(userId, sessionData);
            console.log('✅ Session saved to server successfully - logout flags cleared');
            
            // Verify the save worked
            try {
                const users = await this.dataSync.getUsers();
                const savedUser = users[userId];
                if (savedUser && savedUser.sessionActive && savedUser.lastLogin) {
                    console.log('✅ Session save verified - user has sessionActive and lastLogin');
                } else {
                    console.error('❌ Session save verification failed - missing required fields');
                }
            } catch (error) {
                console.warn('⚠️ Could not verify session save:', error);
            }
        } else {
            console.warn('⚠️ Cannot save session - no current user');
        }
    }

    async checkExistingSession() {
        if (!this.dataSync) {
            console.warn('DataSync not available, skipping session check');
            return;
        }

        try {
            const users = await this.dataSync.getUsers();
            
            // Check all users for active sessions (in server-only mode, we rely purely on server data)
            const activeUser = Object.values(users).find(user => {
                console.log(`🔍 Checking user ${user.name || user.id}:`);
                console.log(`  sessionActive: ${user.sessionActive}`);
                console.log(`  lastLogin: ${user.lastLogin ? 'present' : 'missing'}`);
                console.log(`  lastActive: ${user.lastActive ? 'present' : 'missing'}`);
                console.log(`  loggedOut: ${user.loggedOut}`);
                
                // Check if user has active session OR recent activity (for backward compatibility)
                const hasActiveSession = user.sessionActive === true;
                const hasRecentLogin = user.lastLogin && (Date.now() - user.lastLogin) < (24 * 60 * 60 * 1000);
                const hasRecentActivity = user.lastActive && (Date.now() - user.lastActive) < (24 * 60 * 60 * 1000);
                
                // Must have either active session OR recent activity
                if (!hasActiveSession && !hasRecentLogin && !hasRecentActivity) {
                    console.log(`  ❌ No active session or recent activity`);
                    return false;
                }
                
                // Must not be explicitly logged out (but only if the logout was recent)
                if (user.loggedOut && user.lastLogout) {
                    const logoutAge = Date.now() - user.lastLogout;
                    const isRecentLogout = logoutAge < (24 * 60 * 60 * 1000);
                    if (isRecentLogout) {
                        console.log(`  ❌ Recently logged out (${Math.round(logoutAge / (60 * 1000))} minutes ago)`);
                        return false;
                    }
                }
                
                // For users with sessionActive and lastLogin (new format)
                if (hasActiveSession && hasRecentLogin) {
                    console.log(`  ✅ Valid session (sessionActive + recent lastLogin)`);
                    return true;
                }
                
                // For users with lastActive only (legacy format)
                if (hasRecentActivity && !user.loggedOut) {
                    console.log(`  ✅ Valid activity (recent lastActive, not logged out)`);
                    // Upgrade legacy user to new format
                    this.upgradeLegacyUser(user);
                    return true;
                }
                
                console.log(`  ❌ Does not meet login criteria`);
                return false;
            });
            
            if (activeUser) {
                this.currentUser = activeUser;
                this.showMainApp();
            } else {
                console.log('No valid active sessions found');
            }
        } catch (error) {
            console.error('Failed to check server session:', error);
        }
    }

    // Upgrade legacy user data to new session format
    async upgradeLegacyUser(user) {
        try {
            console.log(`🔄 Upgrading legacy user ${user.name} to new session format`);
            
            const upgradedData = {
                ...user,
                sessionActive: true,
                lastLogin: user.lastActive || Date.now(),
                loggedOut: false,
                lastLogout: null
            };
            
            const userId = user.email ? `google_${user.email}` : user.id;
            await this.dataSync.saveUser(userId, upgradedData);
            
            console.log(`✅ Legacy user ${user.name} upgraded successfully`);
        } catch (error) {
            console.error(`❌ Failed to upgrade legacy user ${user.name}:`, error);
        }
    }

    async clearSession() {
        if (this.currentUser && this.dataSync) {
            try {
                // Calculate the correct user ID - this is critical for finding the right user
                const userId = this.currentUser.email ? `google_${this.currentUser.email}` : this.currentUser.id;
                
                console.log('🚪 Starting logout process...');
                console.log('  User:', this.currentUser.name);
                console.log('  User ID for logout:', userId);
                
                // Get current user data from server first
                const users = await this.dataSync.getUsers();
                const currentUserData = users[userId];
                
                if (!currentUserData) {
                    console.error('❌ CRITICAL: User not found on server during logout!', userId);
                    console.log('Available user IDs:', Object.keys(users));
                    
                    // Try to find user by different ID patterns
                    const alternativeUser = Object.entries(users).find(([key, user]) => 
                        user.name === this.currentUser.name || 
                        user.id === this.currentUser.id ||
                        user.email === this.currentUser.email
                    );
                    
                    if (alternativeUser) {
                        console.log('� Found user with alternative ID:', alternativeUser[0]);
                        const [altUserId, altUserData] = alternativeUser;
                        await this.performLogout(altUserId, altUserData);
                    } else {
                        console.error('❌ Could not find user to logout anywhere on server');
                    }
                    return;
                }
                
                // Perform logout with the correct user data
                await this.performLogout(userId, currentUserData);
                
            } catch (error) {
                console.error('❌ Failed to clear session on server:', error);
            }
        } else {
            console.warn('⚠️ Cannot clear session - no current user or dataSync');
        }
    }

    async performLogout(userId, currentUserData) {
        try {
            // Create logout data by updating the existing user data
            const logoutData = {
                ...currentUserData,
                sessionActive: false,
                loggedOut: true,
                lastLogout: Date.now()
            };
            
            console.log('💾 Saving logout data to server...');
            
            // Save to server
            await this.dataSync.saveUser(userId, logoutData);
            
            // Critical: Verify the save actually worked
            await this.verifyLogoutSaved(userId);
            
        } catch (error) {
            console.error('❌ Failed to perform logout:', error);
            throw error;
        }
    }

    async verifyLogoutSaved(userId) {
        try {
            // Wait a moment for server to process
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Re-fetch user data to verify
            const users = await this.dataSync.getUsers();
            const verifyUser = users[userId];
            
            if (!verifyUser) {
                console.error('❌ VERIFICATION FAILED: User disappeared after logout save');
                return false;
            }
            
            const isLoggedOut = verifyUser.loggedOut === true;
            const isSessionInactive = verifyUser.sessionActive === false;
            const hasLogoutTimestamp = verifyUser.lastLogout && verifyUser.lastLogout > 0;
            
            console.log('🔍 LOGOUT VERIFICATION:');
            console.log(`  loggedOut: ${verifyUser.loggedOut} (should be true)`);
            console.log(`  sessionActive: ${verifyUser.sessionActive} (should be false)`);
            console.log(`  lastLogout: ${verifyUser.lastLogout} (should be timestamp)`);
            
            if (isLoggedOut && isSessionInactive && hasLogoutTimestamp) {
                console.log('✅ LOGOUT VERIFIED: User properly logged out on server');
                return true;
            } else {
                console.error('❌ LOGOUT VERIFICATION FAILED: Server data not updated correctly');
                console.error('Expected: loggedOut=true, sessionActive=false, lastLogout=timestamp');
                console.error('Actual:', { 
                    loggedOut: verifyUser.loggedOut, 
                    sessionActive: verifyUser.sessionActive, 
                    lastLogout: verifyUser.lastLogout 
                });
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error during logout verification:', error);
            return false;
        }
    }

    // Test server connection (development only)
    async testServerConnection() {
        console.log('🔌 Testing server connection...');
        
        if (!this.dataSync) {
            alert('❌ DataSync service not available');
            return;
        }
        
        try {
            // Test direct fetch
            const response = await fetch('http://localhost:3000/api/health');
            const data = await response.json();
            console.log('✅ Direct fetch successful:', data);
            
            // Test dataSync service
            const connected = await this.dataSync.checkConnection();
            console.log('✅ DataSync connection test result:', connected);
            
            // Test get users
            const users = await this.dataSync.getUsers();
            console.log('✅ Users data:', users);
            
            alert(`✅ Server Connection Test Results:\n\n` +
                  `Direct API: ${response.ok ? 'OK' : 'Failed'}\n` +
                  `DataSync: ${connected ? 'Connected' : 'Disconnected'}\n` +
                  `Users endpoint: ${users ? 'Working' : 'Failed'}\n\n` +
                  `Check console for detailed logs.`);
                  
        } catch (error) {
            console.error('❌ Server connection test failed:', error);
            alert(`❌ Server Connection Test Failed:\n\n${error.message}\n\nCheck console for details.`);
        }
    }

    // Load user's data
    loadUserData() {
        if (window.app && this.currentUser) {
            // Load user profile info into current user
            const userProfile = this.getUserProfile();
            if (userProfile) {
                this.currentUser.displayName = userProfile.displayName;
                this.currentUser.skillLevel = userProfile.skillLevel;
                this.currentUser.skillInfo = userProfile.skillInfo;
            }
            
            window.app.loadUserData(this.currentUser.id);
        }
    }

    // Parse JWT token
    parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            console.error('Error parsing JWT:', error);
            throw error;
        }
    }

    // Error handling
    handleAuthError(message, error = null) {
        console.error('Auth Error:', message, error);
        
        // Reset any loading states
        const facebookButton = document.getElementById('facebook-login');
        const googleButton = document.getElementById('google-login');
        
        if (facebookButton) {
            facebookButton.textContent = 'Continue with Facebook';
            facebookButton.disabled = false;
        }
        if (googleButton) {
            googleButton.textContent = 'Continue with Google';
            googleButton.disabled = false;
        }
        
        // Check for specific error types
        if (error && typeof error === 'string' && error.includes('redirect_uri_mismatch')) {
            alert(`🚨 Google OAuth Configuration Error!\n\nPlease add these URLs to your Google Cloud Console:\n\nAuthorized JavaScript Origins:\n- ${window.location.origin}\n- http://localhost:8000\n- http://127.0.0.1:8000\n\nAuthorized Redirect URIs:\n- ${window.location.origin}\n- http://localhost:8000\n- http://127.0.0.1:8000\n\nThen try again.`);
        } else if (message.includes('Facebook app is not properly configured')) {
            alert(`🚨 Facebook Configuration Required!\n\n${message}\n\n⚠️ NO BYPASS AVAILABLE - You must configure Facebook properly to continue.`);
        } else {
            alert(`❌ Authentication Required!\n\n${message}\n\n⚠️ Demo login is disabled - you must complete authentication to access the app.`);
        }
    }

    // Callback management
    addAuthCallback(callback) {
        this.authCallbacks.push(callback);
    }

    notifyAuthCallbacks() {
        this.authCallbacks.forEach(callback => {
            try {
                callback(this.currentUser);
            } catch (error) {
                console.error('Auth callback error:', error);
            }
        });
    }

    // Getters
    getCurrentUser() {
        return this.currentUser;
    }

    isCurrentUser(userId) {
        if (!this.currentUser || !userId) return false;
        
        // Check if the userId matches the current user's ID or email
        return this.currentUser.id === userId || 
               this.currentUser.email === userId ||
               (this.currentUser.googleId && this.currentUser.googleId === userId);
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getUserId() {
        return this.currentUser ? this.currentUser.id : null;
    }

    getUserName() {
        return this.currentUser ? this.currentUser.name : 'Guest';
    }

    // Permission checking methods
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'administrator';
    }

    isGuest() {
        return this.currentUser && this.currentUser.provider === 'guest';
    }

    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        // Admin has all permissions
        if (this.currentUser.role === 'administrator') return true;
        
        // Define permission mappings
        const permissions = {
            'players': ['administrator'],
            'signup': ['administrator', 'user'],
            'teams': ['administrator', 'user']
        };
        
        const requiredRoles = permissions[permission] || [];
        const userRole = this.currentUser.role || 'user';
        
        return requiredRoles.includes(userRole);
    }

    // Development helper - check Facebook OAuth setup
    checkFacebookConfig() {
        console.log('\n=== Facebook OAuth Configuration Check ===');
        console.log('Current App ID:', '799762102527678');
        console.log('Configuration ID:', this.facebookConfigId || 'Not set');
        console.log('Facebook SDK loaded:', !!window.FB);
        console.log('Facebook SDK functions:', {
            login: typeof window.FB?.login,
            api: typeof window.FB?.api,
            getLoginStatus: typeof window.FB?.getLoginStatus
        });
        
        console.log('\n🚨 CRITICAL: Facebook Developer Console MUST be configured!');
        console.log('❌ Demo login bypass has been DISABLED');
        console.log('✅ Facebook login is now REQUIRED for app access');
        console.log('');
        console.log('📋 MANDATORY Facebook Developer Console Settings:');
        console.log('🔧 1. Go to: https://developers.facebook.com/apps/799762102527678');
        console.log('');
        console.log('🔧 2. Settings → Basic:');
        console.log('   ✅ App Domains: localhost');
        console.log('   ✅ Website → Site URL: http://localhost:8000');
        console.log('');
        console.log('🔧 3. Products → Facebook Login → Settings:');
        console.log('   ✅ Valid OAuth Redirect URIs:');
        console.log('      - http://localhost:8000/');
        console.log('      - http://127.0.0.1:8000/');
        console.log('   ✅ Client OAuth Login: Yes');
        console.log('   ✅ Web OAuth Login: Yes');
        console.log('   ✅ Permissions: public_profile enabled');
        console.log('');
        console.log('🔧 4. Save all changes and try Facebook login again');
        console.log('');
        console.log('🚨 Without these settings, Facebook login will fail!');
        console.log('📖 See FACEBOOK_LOCALHOST_CONFIG.md for step-by-step setup');
    }

    // Get all registered users (admin only)
    getAllRegisteredUsers() {
        try {
            // Return users as array for backward compatibility
            return Object.values(this.registeredUsers);
        } catch (error) {
            console.error('Error getting registered users:', error);
            return [];
        }
    }

    // Load registered users from server
    async loadRegisteredUsers() {
        try {
            this.registeredUsers = await this.dataSync.getUsers();
            console.log(`Loaded ${Object.keys(this.registeredUsers).length} registered users`);
        } catch (error) {
            console.error('Error loading registered users:', error);
            this.registeredUsers = {};
        }
    }

    // Member Authorization Methods
    async checkExistingUser(email) {
        try {
            const response = await fetch('http://localhost:3000/api/users');
            if (response.ok) {
                const users = await response.json();
                const normalizedEmail = email.toLowerCase().trim();
                
                // Check if email exists in registered users
                const existingUser = Object.values(users).find(user => 
                    user.email && user.email.toLowerCase() === normalizedEmail
                );
                
                console.log(`Existing user check for ${email}:`, !!existingUser);
                return existingUser;
            }
            
            return null;
        } catch (error) {
            console.error('Error checking existing user:', error);
            return null;
        }
    }

    async checkMemberAuthorization(email) {
        try {
            const response = await fetch('http://localhost:3000/api/members');
            if (response.ok) {
                const members = await response.json();
                const normalizedEmail = email.toLowerCase().trim();
                
                // Check if email exists in authorized members list
                const isAuthorized = Object.values(members).some(member => 
                    member.email.toLowerCase() === normalizedEmail
                );
                
                console.log(`Member authorization check for ${email}:`, isAuthorized);
                return isAuthorized;
            }
            
            // If members API fails, deny access for security
            console.warn('Members API unavailable, denying access');
            return false;
        } catch (error) {
            console.error('Error checking member authorization:', error);
            // If there's an error, deny access for security
            return false;
        }
    }

    // Start periodic session validation
    startSessionValidation() {
        // Check every 30 seconds if current user is still authorized
        this.sessionValidationInterval = setInterval(async () => {
            await this.validateCurrentSession();
        }, 30000); // 30 seconds
        
        console.log('Session validation started - checking every 30 seconds');
    }

    // Stop session validation (cleanup)
    stopSessionValidation() {
        if (this.sessionValidationInterval) {
            clearInterval(this.sessionValidationInterval);
            this.sessionValidationInterval = null;
            console.log('Session validation stopped');
        }
    }

    // Validate if current user is still authorized
    async validateCurrentSession() {
        // Only validate if user is logged in and not admin, guest, or phone-based casual user
        if (!this.currentUser || !this.currentUser.email || 
            this.currentUser.provider === 'admin' || 
            this.currentUser.provider === 'guest' ||
            this.currentUser.provider === 'guest_casual' ||
            this.currentUser.provider === 'admin_casual') {
            return;
        }

        try {
            console.log('Validating session for:', this.currentUser.email);
            const isAuthorized = await this.checkMemberAuthorization(this.currentUser.email);
            
            if (!isAuthorized) {
                console.warn(`User ${this.currentUser.email} is no longer authorized - forcing logout`);
                
                // Show notification to user
                this.showAuthorizationRevokedModal();
                
                // Force logout after a brief delay
                setTimeout(() => {
                    this.forceLogout('Your account access has been revoked by an administrator.');
                }, 3000);
            }
        } catch (error) {
            console.error('Error validating session:', error);
        }
    }

    // Force logout when authorization is revoked
    forceLogout(reason = 'Session expired') {
        console.log('Force logout triggered:', reason);
        
        // Clear all session data
        this.currentUser = null;
        this.pendingUser = null;
        
        // Clear localStorage and sessionStorage
        localStorage.clear();
        sessionStorage.clear();
        
        // Stop session validation
        this.stopSessionValidation();
        
        // Show login screen
        this.showLoginScreen();
        
        // Show reason if provided
        if (reason && reason !== 'Session expired') {
            setTimeout(() => {
                alert(reason);
            }, 500);
        }
    }

    // Immediate session validation (can be called externally)
    async validateSessionImmediately(removedEmail = null) {
        if (!this.currentUser || !this.currentUser.email || 
            this.currentUser.provider === 'admin' || 
            this.currentUser.provider === 'guest' ||
            this.currentUser.provider === 'guest_casual' ||
            this.currentUser.provider === 'admin_casual') {
            return;
        }

        // If a specific email was removed, check if it matches current user
        if (removedEmail && this.currentUser.email.toLowerCase() === removedEmail.toLowerCase()) {
            console.warn(`Current user ${this.currentUser.email} was removed from authorized members`);
            this.showAuthorizationRevokedModal();
            setTimeout(() => {
                this.forceLogout('Your account access has been revoked by an administrator.');
            }, 3000);
            return;
        }

        // Otherwise, do a full validation check
        await this.validateCurrentSession();
    }

    // Show modal when authorization is revoked
    showAuthorizationRevokedModal() {
        // Create modal HTML if it doesn't exist
        let modal = document.getElementById('authRevokedModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'authRevokedModal';
            modal.innerHTML = `
                <div class="modal-overlay">
                    <div class="modal-content">
                        <h3>⚠️ Access Revoked</h3>
                        <p>Your account access has been revoked by an administrator.</p>
                        <p>You will be logged out automatically.</p>
                        <button onclick="authManager.forceLogout()">OK</button>
                    </div>
                </div>
            `;
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            
            const modalContent = modal.querySelector('.modal-content');
            modalContent.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 10px;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            `;
            
            const button = modal.querySelector('button');
            button.style.cssText = `
                background: #dc3545;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 15px;
            `;
            
            document.body.appendChild(modal);
        }
        
        modal.style.display = 'flex';
    }



    showMembershipModal(userPayload) {
        console.log('Showing membership modal for unauthorized user:', userPayload.email);
        
        // Store user info for potential contact
        this.pendingUser = userPayload;
        
        // Show the membership modal
        const modal = document.getElementById('membershipModal');
        if (modal) {
            modal.style.display = 'flex';
        }
        
        // Update contact admin function with user email
        const contactBtn = modal.querySelector('button[onclick="contactAdmin()"]');
        if (contactBtn) {
            contactBtn.onclick = () => this.contactAdminForMembership();
        }
    }

    contactAdminForMembership() {
        const userEmail = this.pendingUser ? this.pendingUser.email : 'unknown';
        const userName = this.pendingUser ? this.pendingUser.name : 'Unknown User';
        
        const message = encodeURIComponent(
            `Hello Admin,\n\n` +
            `I would like to become a member of the Soccer Team Management System.\n\n` +
            `My details:\n` +
            `- Name: ${userName}\n` +
            `- Gmail: ${userEmail}\n\n` +
            `Please let me know how to proceed with the $40 membership payment to get my email authorized for system access.\n\n` +
            `Thank you!`
        );
        
        const subject = encodeURIComponent('Soccer Team Membership Request');
        
        // You can customize this with the actual admin contact email
        window.open(`mailto:admin@soccerteam.com?subject=${subject}&body=${message}`, '_blank');
    }
}

// Global function to save user profile
async function saveUserProfile() {
    const displayName = document.getElementById('profileName').value.trim();
    const skillLevel = document.getElementById('profileSkillLevel').value;
    
    if (!displayName) {
        alert('Please enter your name');
        return;
    }
    
    if (!skillLevel) {
        alert('Please select your skill level');
        return;
    }
    
    try {
        if (window.authManager && await window.authManager.saveUserProfile(displayName, skillLevel)) {
        // Hide profile modal and show main app
        const profileModal = document.getElementById('userProfileModal');
        if (profileModal) {
            profileModal.style.display = 'none';
        }
        
            // Show main app
            window.authManager.showMainApp();
        } else {
            alert('Error saving profile. Please try again.');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Error saving profile. Please try again.');
    }
}

// Initialize auth manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing AuthManager...');
    window.authManager = new AuthManager();
    console.log('AuthManager initialized');
    
    // Check for pending guest user
    const pendingGuest = localStorage.getItem('pendingGuestUser');
    if (pendingGuest) {
        try {
            const guestUser = JSON.parse(pendingGuest);
            console.log('🔄 Found pending guest user, logging in:', guestUser.name);
            
            // Set as current user
            window.authManager.currentUser = guestUser;
            
            // Clear the pending user
            localStorage.removeItem('pendingGuestUser');
            
            // Show main app after a brief delay to ensure everything is ready
            setTimeout(() => {
                window.authManager.showMainApp();
            }, 1000);
            
        } catch (error) {
            console.error('Error processing pending guest user:', error);
            localStorage.removeItem('pendingGuestUser');
        }
    }
});

// Emergency admin access function (for debugging)
window.emergencyAdminLogin = function() {
    console.log('🚨 Emergency admin login activated');
    if (window.authManager) {
        window.authManager.currentUser = {
            id: 'admin_emergency',
            name: 'Emergency Admin',
            email: 'admin@emergency.local',
            picture: 'https://ui-avatars.com/api/?name=Admin&background=dc3545&color=fff&bold=true',
            provider: 'emergency',
            role: 'administrator',
            positions: ['any'],
            skillLevel: 'average',
            skillInfo: {
                label: 'Average',
                points: 2,
                description: 'Decent player, some experience'
            }
        };
        window.authManager.showMainApp();
        console.log('✅ Emergency admin login successful');
        return 'Admin access granted!';
    } else {
        console.error('❌ AuthManager not available');
        return 'AuthManager not loaded';
    }
};

// Global modal functions
function closeMembershipModal() {
    const modal = document.getElementById('membershipModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function contactAdmin() {
    if (window.authManager) {
        window.authManager.contactAdminForMembership();
    }
}

// Global function to trigger session validation when admin removes a member
function notifyMemberRemoved(removedEmail) {
    console.log('Member removed notification:', removedEmail);
    if (window.authManager) {
        window.authManager.validateSessionImmediately(removedEmail);
    }
}

// Global wrapper functions for HTML onclick handlers
window.saveUserProfile = saveUserProfile;
window.hideGuestLogin = function() {
    if (window.authManager && typeof window.authManager.hideGuestLoginModal === 'function') {
        window.authManager.hideGuestLoginModal();
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}