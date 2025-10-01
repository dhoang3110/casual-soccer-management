class DataSyncService {
    constructor() {
        // Detect if we're on Netlify
        const isNetlify = window.location.hostname.includes('netlify.app') || 
                         window.location.hostname.includes('netlify.com');
        
        // Use environment-aware URL configuration
        if (isNetlify) {
            this.baseURL = window.location.origin;
            this.apiPath = '/.netlify/functions';
        } else {
            this.baseURL = window.APP_CONFIG ? 
                window.APP_CONFIG.SERVER.BACKEND_URL : 
                window.location.origin.replace(':8000', ':3000'); // Fallback
            this.apiPath = '/api';
        }
        
        this.syncEnabled = true;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        
        // Environment-aware logging
        if (window.ENV_UTILS) {
            window.ENV_UTILS.log('DataSync: Service initialized with baseURL:', this.baseURL);
            window.ENV_UTILS.log('DataSync: API path:', this.apiPath);
        } else {
            console.log('DataSync: Service initialized with baseURL:', this.baseURL);
            console.log('DataSync: API path:', this.apiPath);
        }
    }

    async checkConnection() {
        try {
            // For Netlify, test the users function instead of health endpoint
            const testEndpoint = this.apiPath === '/.netlify/functions' ? 
                `${this.baseURL}${this.apiPath}/users` : 
                `${this.baseURL}${this.apiPath}/health`;
                
            console.log('DataSync: Checking connection to', testEndpoint);
            const response = await fetch(testEndpoint);
            this.syncEnabled = response.ok;
            console.log('DataSync: Connection check result:', response.ok);
            return response.ok;
        } catch (error) {
            console.warn('DataSync: Server not available, using local storage fallback', error);
            this.syncEnabled = false;
            return false;
        }
    }

    async makeRequest(url, options = {}) {
        if (!this.syncEnabled) {
            throw new Error('Server not available');
        }

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                // Build the full URL with the correct API path
                const fullUrl = `${this.baseURL}${this.apiPath}${url}`;
                console.log('DataSync: Making request to:', fullUrl);
                
                const response = await fetch(fullUrl, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return response;
            } catch (error) {
                console.warn(`DataSync: Attempt ${attempt} failed:`, error.message);
                
                if (attempt === this.retryAttempts) {
                    this.syncEnabled = false;
                    throw error;
                }
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
            }
        }
    }



    // Sync users
    async getUsers() {
        await this.checkConnection();
        const response = await this.makeRequest('/users');
        const users = await response.json();
        
        console.log('DataSync: Users loaded from server');
        return users;
    }

    async saveUser(userId, userData) {
        await this.checkConnection();
        const response = await this.makeRequest(`/users`, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        console.log('DataSync: User saved to server');
        return result;
    }

    // Sync global players
    async getPlayers() {
        await this.checkConnection();
        const response = await this.makeRequest('/users'); // Use users endpoint for players
        const players = await response.json();
        
        console.log('DataSync: Players loaded from server');
        return players;
    }

    async savePlayers(players) {
        await this.checkConnection();
        await this.makeRequest('/users', {
            method: 'POST',
            body: JSON.stringify(players)
        });
        
        console.log('DataSync: Players saved to server');
    }

    // Sync signups
    async getSignups() {
        await this.checkConnection();
        const response = await this.makeRequest('/signups');
        const signups = await response.json();
        
        console.log('DataSync: Signups loaded from server');
        return signups;
    }

    async saveSignups(signups) {
        await this.checkConnection();
        await this.makeRequest('/signups', {
            method: 'POST',
            body: JSON.stringify(signups)
        });
        
        console.log('DataSync: Signups saved to server');
    }

    // Toggle individual signup (new method)
    async toggleSignup(week, playerId) {
        await this.checkConnection();
        
        // Get current user info for authorization
        const userId = window.authManager && window.authManager.getUserId() || 'unknown';
        const userRole = window.authManager && window.authManager.isAdmin() ? 'administrator' : 'user';
        
        const response = await this.makeRequest(`/signups`, {
            method: 'POST',
            headers: {
                'x-user-id': userId,
                'x-user-role': userRole
            },
            body: JSON.stringify({ playerId, action: 'toggle' })
        });
        
        const result = await response.json();
        console.log('DataSync: Signup toggled:', result);
        return result;
    }

    // Sync signup settings
    async getSignupSettings() {
        await this.checkConnection();
        const response = await this.makeRequest('/signups');
        const settings = await response.json();
        
        console.log('DataSync: Signup settings loaded from server');
        return settings;
    }

    async saveSignupSettings(settings) {
        await this.checkConnection();
        await this.makeRequest('/signups', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
        
        console.log('DataSync: Signup settings saved to server');
    }

    // Get connection status
    getConnectionStatus() {
        return {
            connected: this.syncEnabled,
            serverURL: this.baseURL
        };
    }
}

// Global instance
window.dataSync = new DataSyncService();

// Initialize connection check on load
window.addEventListener('load', () => {
    console.log('DataSync: Running initial connection check...');
    window.dataSync.checkConnection().then(connected => {
        console.log('DataSync: Initial connection status:', connected);
    });
});