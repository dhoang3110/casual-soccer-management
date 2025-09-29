class DataSyncService {
    constructor() {
        // Use environment-aware URL configuration
        this.baseURL = window.APP_CONFIG ? 
            window.APP_CONFIG.SERVER.BACKEND_URL : 
            window.location.origin.replace(':8000', ':3000'); // Fallback
        this.syncEnabled = true;
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1 second
        
        // Environment-aware logging
        if (window.ENV_UTILS) {
            window.ENV_UTILS.log('DataSync: Service initialized with baseURL:', this.baseURL);
        } else {
            console.log('DataSync: Service initialized with baseURL:', this.baseURL);
        }
    }

    async checkConnection() {
        try {
            console.log('DataSync: Checking connection to', `${this.baseURL}/api/health`);
            const response = await fetch(`${this.baseURL}/api/health`);
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
                const response = await fetch(`${this.baseURL}${url}`, {
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
        const response = await this.makeRequest('/api/users');
        const users = await response.json();
        
        console.log('DataSync: Users loaded from server');
        return users;
    }

    async saveUser(userId, userData) {
        await this.checkConnection();
        const response = await this.makeRequest(`/api/users/${userId}`, {
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
        const response = await this.makeRequest('/api/players');
        const players = await response.json();
        
        console.log('DataSync: Players loaded from server');
        return players;
    }

    async savePlayers(players) {
        await this.checkConnection();
        await this.makeRequest('/api/players', {
            method: 'POST',
            body: JSON.stringify(players)
        });
        
        console.log('DataSync: Players saved to server');
    }

    // Sync signups
    async getSignups() {
        await this.checkConnection();
        const response = await this.makeRequest('/api/signups');
        const signups = await response.json();
        
        console.log('DataSync: Signups loaded from server');
        return signups;
    }

    async saveSignups(signups) {
        await this.checkConnection();
        await this.makeRequest('/api/signups', {
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
        
        const response = await this.makeRequest(`/api/signups/${week}/toggle/${playerId}`, {
            method: 'POST',
            headers: {
                'x-user-id': userId,
                'x-user-role': userRole
            }
        });
        
        const result = await response.json();
        console.log('DataSync: Signup toggled:', result);
        return result;
    }

    // Sync signup settings
    async getSignupSettings() {
        await this.checkConnection();
        const response = await this.makeRequest('/api/signup-settings');
        const settings = await response.json();
        
        console.log('DataSync: Signup settings loaded from server');
        return settings;
    }

    async saveSignupSettings(settings) {
        await this.checkConnection();
        await this.makeRequest('/api/signup-settings', {
            method: 'POST',
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