// Add this to your SoccerApp class in js/app.js

class SoccerApp {
    constructor() {
        this.config = window.APP_CONFIG.ENVIRONMENT;
        this.apiUrl = this.config.API_URL;
        // ... rest of your constructor
    }

    // Update your data methods to use Netlify Functions
    async getRegisteredUsers() {
        try {
            const response = await fetch(`${this.apiUrl}/users`);
            if (response.ok) {
                return await response.json();
            }
            return {};
        } catch (error) {
            console.error('Error fetching users:', error);
            return {};
        }
    }

    async saveUser(user) {
        try {
            const response = await fetch(`${this.apiUrl}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            });
            return await response.json();
        } catch (error) {
            console.error('Error saving user:', error);
            throw error;
        }
    }

    async updateUser(userId, userData) {
        try {
            const response = await fetch(`${this.apiUrl}/users?id=${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            const response = await fetch(`${this.apiUrl}/users?id=${userId}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    async getSignups() {
        try {
            const response = await fetch(`${this.apiUrl}/signups`);
            if (response.ok) {
                return await response.json();
            }
            return { players: [], isOpen: false };
        } catch (error) {
            console.error('Error fetching signups:', error);
            return { players: [], isOpen: false };
        }
    }

    async toggleSignup(playerId) {
        try {
            const currentSignups = await this.getSignups();
            const isSignedUp = currentSignups.players.includes(playerId);
            const action = isSignedUp ? 'remove' : 'add';

            const response = await fetch(`${this.apiUrl}/signups`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ playerId, action })
            });

            const result = await response.json();
            await this.loadSignups(); // Refresh the UI
            return result;
        } catch (error) {
            console.error('Error toggling signup:', error);
            throw error;
        }
    }

    async updateSignupStatus(isOpen) {
        try {
            const response = await fetch(`${this.apiUrl}/signups`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isOpen })
            });
            return await response.json();
        } catch (error) {
            console.error('Error updating signup status:', error);
            throw error;
        }
    }
}