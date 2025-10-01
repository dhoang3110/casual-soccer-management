// Import utilities (Note: In ES5 environment, these will be loaded via script tags)
// Import is for documentation - actual loading happens via script tags in HTML

// Global functions for HTML onclick - must be at top for immediate availability
window.removeAllCasualPlayers = function() {
    // Use AppUtils pattern for consistent component checking
    if (!window.AppUtils || !window.AppUtils.checkAppReady('App', window.app)) {
        return;
    }
    
    if (!window.AppUtils.checkMethod(window.app, 'removeAllCasualPlayers', 'App')) {
        return;
    }
    
    window.app.removeAllCasualPlayers();
};

// Global function for guest login button
window.showGuestLogin = function() {
    window.LogUtils.debug('GUEST', 'showGuestLogin called');
    
    if (window.authManager && typeof window.authManager.showGuestLoginModal === 'function') {
        window.LogUtils.success('GUEST', 'Using AuthManager to show guest modal');
        window.authManager.showGuestLoginModal();
    } else {
        window.LogUtils.info('GUEST', 'Using direct fallback method');
        // Use DOM utility for modal management
        if (window.DOMUtils.showModal('guestLoginModal', 'loginOverlay')) {
            window.LogUtils.success('GUEST', 'Guest modal shown via direct fallback');
            // Focus on name input using utility
            const nameInput = window.DOMUtils.getElementById('guestName', false);
            window.DOMUtils.focusWithDelay(nameInput);
        } else {
            window.NotificationUtils.showError(
                'Guest registration form not available. Please refresh the page and try again.'
            );
        }
    }
};

// Unified Skill Level System - Used across all components
window.SKILL_LEVELS = {
    'excellent': { label: 'Excellent', points: 4, description: 'Pro level, very experienced' },
    'good': { label: 'Good', points: 3, description: 'Solid player, good technique' },
    'average': { label: 'Average', points: 2, description: 'Decent player, some experience' },
    'basic': { label: 'Basic', points: 1, description: 'Beginner, learning the game' }
};

// Utility function to get skill points
window.getSkillPoints = function(skillLevel) {
    return window.SKILL_LEVELS[skillLevel]?.points || 2; // Default to average
};

// Utility function to get skill info
window.getSkillInfo = function(skillLevel) {
    return window.SKILL_LEVELS[skillLevel] || window.SKILL_LEVELS['average'];
};

// Core Application Logic for Soccer Team Management
class SoccerApp {
    constructor() {
        this.players = [];
        this.signups = {};
        this.currentWeek = '';
        this.dataSync = window.dataSync;
        this.signupSettings = {}; // Will be loaded asynchronously
        this.skillPoints = {
            'excellent': 4,
            'good': 3,
            'average': 2,
            'basic': 1
        };
        console.log('SoccerApp: dataSync service available:', !!this.dataSync);
        
        // Load signup settings asynchronously
        this.initializeSignupSettings();
        
        this.init().catch(error => {
            console.error('SoccerApp initialization error:', error);
        });
    }

    async initializeSignupSettings() {
        try {
            this.signupSettings = await this.loadSignupSettings();
        } catch (error) {
            console.error('Error loading signup settings:', error);
            this.signupSettings = {};
        }
    }

    async init() {
        this.setupEventListeners();
        this.initializeWeekSelector();
        this.initializeAdminControls();
        
        // Load global players first  
        await this.loadGlobalPlayers();
        
        // Wait for auth manager to be ready
        if (window.authManager && window.authManager.isAuthenticated()) {
            this.loadUserData(window.authManager.getUserId());
            
            // Preload admin data and restore last active tab for authenticated users
            await this.initializeTabsAfterAuth();
        } else {
            // If no user is authenticated, still load global players for potential admin login
            // but don't render the players list until auth is complete
        }
        
        // Update signup displays
        this.updateSignupDisplays();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            // Player form submission
            const playerNameInput = document.getElementById('playerName');
            if (playerNameInput) {
                playerNameInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.addPlayer();
                    }
                });
            }

            // Week date change
            const weekDateInput = document.getElementById('weekDate');
            if (weekDateInput) {
                weekDateInput.addEventListener('change', () => {
                    this.loadSignups();
                });
            }
        });
    }

    initializeWeekSelector() {
        const weekDateInput = document.getElementById('weekDate');
        if (weekDateInput) {
            weekDateInput.valueAsDate = new Date();
            this.currentWeek = weekDateInput.value;
        }
    }

    initializeAdminControls() {
        // Initialize admin week selector if it exists
        const adminWeekSelect = document.getElementById('adminWeekSelect');
        if (adminWeekSelect) {
            // Populate with a few weeks worth of dates
            const today = new Date();
            for (let i = 0; i < 8; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + (i * 7));
                const dateStr = date.toISOString().split('T')[0];
                const option = document.createElement('option');
                option.value = dateStr;
                option.textContent = date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                });
                adminWeekSelect.appendChild(option);
            }
            
            // Set default to current week
            adminWeekSelect.value = this.currentWeek;
        }
        
        // Initialize admin date picker if it exists
        const adminWeekDate = document.getElementById('adminWeekDate');
        if (adminWeekDate) {
            // Set default to current week
            adminWeekDate.value = this.currentWeek;
            
            // Initialize the admin signup display
            setTimeout(async () => {
                if (window.updateAdminSignupWeek) {
                    await window.updateAdminSignupWeek();
                }
            }, 100);
        }
    }

    updateSignupDisplays() {
        // Update displays after authentication changes
        if (this.currentWeek) {
            this.loadSignups();
        }
    }

    // Player Management
    async addPlayer() {
        window.LogUtils.debug('ADMIN', 'addPlayer function called');
        
        // Check admin permissions using utility
        if (!window.AppUtils.checkAdminPermission(window.authManager)) {
            return;
        }
        
        window.LogUtils.success('ADMIN', 'Admin check passed');

        const nameInput = document.getElementById('playerName');
        const skillSelect = document.getElementById('skillLevel');
        const positionSelect = document.getElementById('playerPosition');
        const phoneInput = document.getElementById('playerPhone');
        
        console.log('🔍 Form elements found:', {
            nameInput: !!nameInput,
            skillSelect: !!skillSelect,
            positionSelect: !!positionSelect,
            phoneInput: !!phoneInput
        });

        // Cast elements to correct types
        const nameInputEl = nameInput instanceof HTMLInputElement ? nameInput : null;
        const skillSelectEl = skillSelect instanceof HTMLSelectElement ? skillSelect : null;
        const positionSelectEl = positionSelect instanceof HTMLSelectElement ? positionSelect : null;
        const phoneInputEl = phoneInput instanceof HTMLInputElement ? phoneInput : null;

        if (!nameInputEl || !skillSelectEl || !positionSelectEl || !phoneInputEl) {
            console.log('❌ Form elements validation failed:', {
                nameInputEl: !!nameInputEl,
                skillSelectEl: !!skillSelectEl,
                positionSelectEl: !!positionSelectEl,
                phoneInputEl: !!phoneInputEl
            });
            return;
        }

        const name = nameInputEl.value.trim();
        const skill = skillSelectEl.value;
        const positions = Array.from(positionSelectEl.selectedOptions).map(option => option.value);
        const phone = phoneInputEl.value.trim();

        console.log('🔍 Form values:', {
            name: name,
            skill: skill,
            positions: positions,
            phone: phone
        });

        // Validate using utilities
        const nameValidation = window.ValidationUtils.validateName(name);
        if (!nameValidation.isValid) {
            window.NotificationUtils.showValidationError(nameValidation.message);
            return;
        }

        const phoneValidation = window.ValidationUtils.validatePhone(phone);
        if (!phoneValidation.isValid) {
            window.NotificationUtils.showValidationError(phoneValidation.message);
            return;
        }

        if (positions.length === 0) {
            window.NotificationUtils.showValidationError('Please select at least one position');
            return;
        }

        if (!skill) {
            window.NotificationUtils.showValidationError('Please select a skill level');
            return;
        }
        
        window.LogUtils.success('ADMIN', 'All form validations passed');

        try {
            // Check against existing users
            const registeredUsersData = await this.getRegisteredUsers();
            const registeredUsers = Array.isArray(registeredUsersData) ? registeredUsersData : Object.values(registeredUsersData);
            
            // Check if player name already exists
            if (registeredUsers.some(u => (u.name || u.email || u.id).toLowerCase() === name.toLowerCase())) {
                window.NotificationUtils.showDuplicateError('player', `name "${name}"`);
                return;
            }

            // Check if phone number already exists using utility
            if (registeredUsers.some(u => window.ValidationUtils.comparePhones(u.phone, phone))) {
                window.NotificationUtils.showDuplicateError('player', `phone number "${phone}"`);
                return;
            }

            // Use centralized skill system
            const skillInfo = window.getSkillInfo(skill);

            // Create casual player with same structure as guest users
            const userId = 'admin_added_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const newUser = {
                id: userId,
                name: name,
                email: `${name.toLowerCase().replace(/\s+/g, '.')}@admin-added.local`,
                phone: phone,
                provider: 'admin_casual',
                role: 'player',
                skillLevel: skill,
                skillInfo: window.getSkillInfo(skill),
                positions: positions,
                addedBy: window.authManager.getUserId(),
                dateAdded: new Date().toISOString(),
                status: 'activated',
                firstLoginDate: null,
                lastLoginDate: null,
                profileComplete: true,
                lastActive: Date.now(),
                isProfileComplete: true,
                sessionActive: false,
                picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=007bff&color=fff&bold=true`
            };

            console.log('🔍 Saving casual user:', newUser);
            
            // Save using the same method as guest users
            await this.saveCasualUser(newUser);
            
            console.log('✅ Casual user saved successfully');
            
            // Clear form inputs
            nameInputEl.value = '';
            phoneInputEl.value = '';
            // Reset position selection to default (midfielder)
            const positionSelectReset = document.getElementById('playerPosition');
            if (positionSelectReset && positionSelectReset instanceof HTMLSelectElement) {
                Array.from(positionSelectReset.options).forEach(option => option.selected = false);
                positionSelectReset.options[4].selected = true; // Select "Any Position"
            }
            
            console.log('🔍 Refreshing signup view...');
            // Refresh the signup view to show the new player
            await this.loadSignups();

            console.log('✅ Player added as registered user:', newUser);
            alert(`✅ Player Added Successfully!\n\n${name} has been added as a registered user and will appear in the main user list.`);
            
        } catch (error) {
            console.error('Error adding player:', error);
            alert('❌ Error adding player. Please try again.');
        }
    }

    async removePlayer(id) {
        // Check if user has admin permissions
        if (!window.authManager?.isAdmin()) {
            alert('❌ Access Denied!\n\nOnly administrators can remove players from the master list.');
            return;
        }

        const player = await this.getGlobalPlayers();
        const playerToRemove = player.find(p => p.id === id);
        if (!playerToRemove) return;

        if (confirm(`Are you sure you want to remove "${playerToRemove.name}" from the master player database?\n\nThis will affect all users and cannot be undone.`)) {
            // Remove from global database
            await this.removePlayerFromGlobalDatabase(id);
            
            // Remove from local list
            this.players = this.players.filter(p => p.id !== id);
            
            // Remove player from all signups (all users)
            this.removePlayerFromAllSignups(id);
            
            // Refresh the signup view
            await this.loadSignups();
            this.saveUserData();

            console.log('Player removed from global database:', player);
            alert(`✅ Player Removed!\n\n${player.name} has been removed from the master database.`);
        }
    }

    async deleteUser(userId) {
        // Check if user has admin permissions
        if (!window.authManager?.isAdmin()) {
            alert('❌ Access Denied!\n\nOnly administrators can delete users.');
            return;
        }

        // Get current user list to find the user
        const users = await this.getRegisteredUsers();
        const userToDelete = Object.values(users).find(user => user.id === userId || user.email === userId);
        
        if (!userToDelete) {
            alert('❌ User not found!');
            return;
        }

        // Prevent admin from deleting themselves
        if (window.authManager?.isCurrentUser(userId)) {
            alert('❌ You cannot delete your own account!');
            return;
        }

        const userName = userToDelete.name || userToDelete.email || userId;
        
        if (confirm(`Are you sure you want to delete user "${userName}"?\n\nThis action cannot be undone and will permanently remove all their data.`)) {
            try {
                // Delete user from server
                const response = await fetch(`http://localhost:3000/api/users/${encodeURIComponent(userId)}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();
                
                if (response.ok && result.success) {
                    // Refresh the display to show updated user list
                    this.loadSignups();
                    
                    console.log('User deleted successfully:', userId);
                    alert(`✅ User Deleted!\n\n${userName} has been removed from the system.`);
                } else {
                    throw new Error(result.error || 'Failed to delete user');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                alert(`❌ Error deleting user: ${error.message}`);
            }
        }
    }

    async removeCasualPlayer(userId) {
        // Check if user has admin permissions
        if (!window.authManager?.isAdmin()) {
            alert('❌ Access Denied!\n\nOnly administrators can remove casual players.');
            return;
        }

        // Check if signup is open
        const isSignupOpen = await this.isSignupEnabled(this.currentWeek);
        if (!isSignupOpen) {
            alert('❌ Cannot remove casual players when signup is closed.\n\nUse the delete button instead when signup is closed.');
            return;
        }

        // Get current user list to find the user
        const users = await this.getRegisteredUsers();
        const userToRemove = Object.values(users).find(user => user.id === userId || user.email === userId);
        
        if (!userToRemove) {
            alert('❌ User not found!');
            return;
        }

        // Verify this is a casual player (not a member with Gmail account)
        const isCasualPlayer = !userToRemove.email || (userToRemove.email && userToRemove.provider === 'admin');
        const isMember = userToRemove.email && userToRemove.provider === 'google';
        
        if (!isCasualPlayer || isMember) {
            alert('❌ This action is only for casual players!\n\nMembers with Gmail accounts cannot be removed while signup is open.\n\nUse the delete button when signup is closed instead.');
            return;
        }

        // Prevent admin from removing themselves
        if (window.authManager?.isCurrentUser(userId)) {
            alert('❌ You cannot remove your own account!');
            return;
        }

        const userName = userToRemove.name || userId;
        
        if (confirm(`🚫 Remove Casual Player?\n\nAre you sure you want to remove casual player "${userName}" from the system?\n\nThis will:\n• Remove them from the current signup (if signed up)\n• Delete their casual player profile permanently\n• This action cannot be undone\n\nNote: This only works for casual players (not Gmail members)\n\nContinue?`)) {
            try {
                // First remove them from current signup if they're signed up
                const signedUpIds = this.signups[this.currentWeek] || [];
                if (signedUpIds.includes(userToRemove.id)) {
                    await this.toggleSignup(userToRemove.id);
                    console.log('Removed player from current signup before deletion');
                }

                // Delete user from server
                const response = await fetch(`http://localhost:3000/api/users/${encodeURIComponent(userId)}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();
                
                if (response.ok && result.success) {
                    // Refresh the display to show updated user list
                    this.loadSignups();
                    
                    console.log('Casual player removed successfully:', userId);
                    alert(`✅ Casual Player Removed!\n\n${userName} has been removed from the system and any current signups.`);
                } else {
                    throw new Error(result.error || 'Failed to remove casual player');
                }
            } catch (error) {
                console.error('Error removing casual player:', error);
                alert(`❌ Error removing casual player: ${error.message}`);
            }
        }
    }

    async removeAllCasualPlayers() {
        console.log('🚫 removeAllCasualPlayers() called');
        
        // Check if user has admin permissions
        if (!window.authManager?.isAdmin()) {
            alert('❌ Access Denied!\n\nOnly administrators can remove casual players.');
            return;
        }

        try {
            // Get all registered users
            const users = await this.getRegisteredUsers();
            const allUsers = Array.isArray(users) ? users : Object.values(users);
            console.log('📊 All users:', allUsers.length);
            
            // Filter casual players (admin_casual or guest_casual provider but not the current admin user)
            const casualPlayers = allUsers.filter(user => {
                const isCasualPlayer = user.provider === 'admin_casual' || user.provider === 'guest_casual';
                const isCurrentUser = window.authManager?.isCurrentUser(user.id);
                const isSystemAdmin = user.role === 'administrator';
                
                console.log(`🔍 User ${user.name || user.id}: provider=${user.provider}, role=${user.role}, isCurrentUser=${isCurrentUser}, isCasualPlayer=${isCasualPlayer}`);
                
                // Include casual players but exclude current admin user and system admin
                return isCasualPlayer && !isCurrentUser && !isSystemAdmin;
            });
            
            console.log('🎯 Casual players found:', casualPlayers.length);

            if (casualPlayers.length === 0) {
                alert('ℹ️ No casual players found!\n\nThere are no casual players to remove. Only Gmail members remain in the system.');
                return;
            }

            // Show detailed confirmation
            const playerNames = casualPlayers.map(p => {
                const displayName = p.name || p.id;
                return p.phone ? `${displayName} (${p.phone})` : displayName;
            }).slice(0, 10); // Show first 10 names with phone numbers
            const moreText = casualPlayers.length > 10 ? `\n... and ${casualPlayers.length - 10} more` : '';
            
            const confirmed = confirm(
                `🚫 Remove All Casual Players?\n\n` +
                `This will permanently remove ${casualPlayers.length} casual player${casualPlayers.length > 1 ? 's' : ''}:\n\n` +
                `${playerNames.join('\n')}${moreText}\n\n` +
                `This action will:\n` +
                `• Remove them from ALL signups\n` +
                `• Delete their profiles permanently\n` +
                `• Keep all Gmail members safe\n` +
                `• Cannot be undone\n\n` +
                `Continue?`
            );

            if (!confirmed) {
                return;
            }

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            // Show progress
            const progressMsg = `Removing ${casualPlayers.length} casual players...`;
            console.log(progressMsg);

            // Remove each casual player
            for (const player of casualPlayers) {
                try {
                    // Remove from current signup if signed up
                    const signedUpIds = this.signups[this.currentWeek] || [];
                    if (signedUpIds.includes(player.id)) {
                        await this.toggleSignup(player.id);
                    }

                    // Delete user from server
                    const response = await fetch(`http://localhost:3000/api/users/${encodeURIComponent(player.id)}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });

                    const result = await response.json();
                    
                    if (response.ok && result.success) {
                        successCount++;
                        console.log(`✅ Removed casual player: ${player.name || player.id}`);
                    } else {
                        throw new Error(result.error || 'Failed to delete player');
                    }
                } catch (error) {
                    errorCount++;
                    errors.push(`${player.name || player.id}: ${error.message}`);
                    console.error(`❌ Error removing ${player.name || player.id}:`, error);
                }
            }

            // Refresh the display
            await this.loadSignups();
            await this.updateCasualPlayersCount();

            // Show results
            let resultMessage = `✅ Bulk Removal Complete!\n\n`;
            resultMessage += `Successfully removed: ${successCount} casual players\n`;
            
            if (errorCount > 0) {
                resultMessage += `Failed to remove: ${errorCount} players\n\n`;
                resultMessage += `Errors:\n${errors.slice(0, 5).join('\n')}`;
                if (errors.length > 5) {
                    resultMessage += `\n... and ${errors.length - 5} more errors`;
                }
            }

            alert(resultMessage);

        } catch (error) {
            console.error('Error in bulk removal:', error);
            alert(`❌ Error during bulk removal: ${error.message}`);
        }
    }

    async updateCasualPlayersCount() {
        try {
            const users = await this.getRegisteredUsers();
            const allUsers = Array.isArray(users) ? users : Object.values(users);
            
            // Count casual players (exclude current admin and members)
            const casualCount = allUsers.filter(user => {
                const isCasualPlayer = user.provider === 'admin_casual' || user.provider === 'guest_casual';
                const isCurrentUser = window.authManager?.isCurrentUser(user.id);
                const isSystemAdmin = user.role === 'administrator';
                
                return isCasualPlayer && !isCurrentUser && !isSystemAdmin;
            }).length;

            const countElement = document.getElementById('casualPlayersCount');
            if (countElement) {
                if (casualCount === 0) {
                    countElement.textContent = '(No casual players found)';
                    countElement.style.color = '#6c757d';
                } else {
                    countElement.textContent = `(${casualCount} casual player${casualCount > 1 ? 's' : ''} found)`;
                    countElement.style.color = '#e76f51';
                }
            }

            // Enable/disable the button based on count
            const removeBtn = document.getElementById('removeAllCasualsBtn');
            if (removeBtn) {
                removeBtn.disabled = casualCount === 0;
                removeBtn.style.opacity = casualCount === 0 ? '0.5' : '1';
            }

        } catch (error) {
            console.error('Error updating casual players count:', error);
        }
    }

    // Global Player Database Management
    async getGlobalPlayers() {
        if (!this.dataSync) {
            throw new Error('DataSync service not available');
        }
        
        const players = await this.dataSync.getPlayers();
        console.log('SoccerApp: Loaded players from server:', Object.keys(players).length);
        return Array.isArray(players) ? players : Object.values(players);
    }

    async getRegisteredUsers() {
        if (!this.dataSync) {
            throw new Error('DataSync service not available');
        }
        
        const users = await this.dataSync.getUsers();
        console.log('SoccerApp: Loaded users from server:', Object.keys(users).length);
        
        // Also load authorized members and merge them if they haven't logged in yet
        try {
            const members = await this.getAuthorizedMembers();
            window.LogUtils.info('SOCCER', `Loaded members from server: ${members.length}`);
            
            // Convert members to user format and add them if they're not already logged in users
            // Use ensureArray as additional safety in case getAuthorizedMembers returns unexpected data
            const memberArray = window.AppUtils.ensureArray(members);
            memberArray.forEach(member => {
                const memberUserId = `google_${member.email}`;
                if (!users[memberUserId]) {
                    // Member hasn't logged in yet, add them as a user entry
                    users[memberUserId] = {
                        id: memberUserId,
                        name: member.name,
                        email: member.email,
                        provider: 'google', // They would be Google users when they log in
                        skillLevel: member.skillLevel,
                        skillInfo: member.skillInfo,
                        positions: member.positions,
                        position: member.position,
                        status: member.status || 'not_activated',
                        isMemberEntry: true // Flag to identify merged member entries
                    };
                    console.log('Added member to user list:', member.name, member.positions);
                } else {
                    // Member has logged in, ensure ALL their member data is preserved from member record
                    let userUpdated = false;
                    if (!users[memberUserId].name && member.name) {
                        users[memberUserId].name = member.name;
                        userUpdated = true;
                    }
                    if (!users[memberUserId].skillLevel && member.skillLevel) {
                        users[memberUserId].skillLevel = member.skillLevel;
                        users[memberUserId].skillInfo = member.skillInfo;
                        userUpdated = true;
                    }
                    if (!users[memberUserId].positions && member.positions) {
                        users[memberUserId].positions = member.positions;
                        users[memberUserId].position = member.position;
                        userUpdated = true;
                    }
                    
                    // Save updated user data back to server to persist the changes
                    if (userUpdated && this.dataSync) {
                        // Use Promise to handle async operation without blocking
                        this.dataSync.saveUser(memberUserId, users[memberUserId])
                            .then(() => {
                                console.log('✅ Saved updated user data with member info:', member.name);
                            })
                            .catch((error) => {
                                console.warn('Failed to save updated user data:', error);
                            });
                    }
                    
                    console.log('Updated logged-in user with complete member data:', member.name, {
                        positions: member.positions,
                        skillLevel: member.skillLevel,
                        name: member.name
                    });
                }
            });
        } catch (error) {
            console.warn('Could not load members data:', error);
        }
        
        // Debug: Check if any admin-added users have position data
        Object.values(users).forEach(user => {
            if (user.provider === 'admin') {
                console.log('Debug - Admin user found:', {
                    name: user.name,
                    positions: user.positions,
                    position: user.position,
                    fullUser: user
                });
            }
        });
        
        return users;
    }

    async saveUserAsRegistered(userId, userData) {
        try {
            console.log('Adding user to registered users:', userData);
            
            const response = await fetch(`http://localhost:3000/api/users/${encodeURIComponent(userId)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save user: ${response.statusText}`);
            }
            
            console.log('User successfully added to registered users');
        } catch (error) {
            console.error('Error adding user to registered users:', error);
            throw error;
        }
    }

    async saveCasualUser(userData) {
        try {
            console.log('🔍 saveCasualUser called with:', userData);
            
            // Save to local storage first (same as guest users)
            const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
            console.log('🔍 Existing users in localStorage:', Object.keys(existingUsers).length);
            
            existingUsers[userData.id] = userData;
            localStorage.setItem('registeredUsers', JSON.stringify(existingUsers));
            console.log('✅ Saved to localStorage');
            
            // Try to save to server if available (same method as guest users)
            console.log('🔍 Attempting to save to server...');
            try {
                // Use the user-specific endpoint like other parts of the app
                const userId = `google_${userData.email}`;
                const response = await fetch(`http://localhost:3000/api/users/${encodeURIComponent(userId)}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('✅ Casual user saved to server successfully:', result);
                } else {
                    const errorText = await response.text();
                    console.error('❌ Server save failed:', response.status, errorText);
                    throw new Error(`Server error: ${response.status} - ${errorText}`);
                }
            } catch (serverError) {
                console.error('❌ Server save error:', serverError);
                throw new Error(`Failed to save to server: ${serverError.message}`);
            }
            
            console.log('Casual user successfully saved');
        } catch (error) {
            console.error('Error saving casual user:', error);
            throw error;
        }
    }

    async removePlayerFromGlobalDatabase(playerId) {
        if (!this.dataSync) {
            throw new Error('DataSync service not available');
        }
        
        const globalPlayers = await this.getGlobalPlayers();
        const updatedPlayers = globalPlayers.filter(p => p.id !== playerId);
        
        await this.dataSync.savePlayers(updatedPlayers);
        console.log('SoccerApp: Player removed from server database');
        
        // Broadcast to all users
        this.broadcastPlayerUpdate('removed', { id: playerId });
    }

    removePlayerFromAllSignups(playerId) {
        // Remove from current user's signups
        Object.keys(this.signups).forEach(week => {
            this.signups[week] = this.signups[week].filter(id => id !== playerId);
        });
        
        // Note: In server-only mode, other users' signups will be handled
        // when they reload or when the player list refreshes from server
        console.log('Player removed from current user signups:', playerId);
    }

    broadcastPlayerUpdate(action, player) {
        // In server-only mode, updates are automatically synchronized
        // through server API calls - no need for localStorage broadcasting
        console.log('Player update broadcasted:', action, player.id || player.name);
    }

    async loadGlobalPlayers() {
        // No longer needed - all players are now stored as registered users
        console.log('Global players system deprecated - using unified registered users');
    }

    async renderPlayers() {
        const container = document.getElementById('playersContainer');
        if (!container) return;
        
        // Get all registered users (both self-registered and admin-added) from server
        const registeredUsersData = await this.getRegisteredUsers();
        console.log('DEBUG: Raw registeredUsersData:', registeredUsersData);
        console.log('DEBUG: Type of registeredUsersData:', typeof registeredUsersData);
        console.log('DEBUG: Is Array?', Array.isArray(registeredUsersData));
        
        const registeredUsers = Array.isArray(registeredUsersData) ? registeredUsersData : Object.values(registeredUsersData);
        
        // Filter out any undefined, null, or invalid users
        const validUsers = registeredUsers.filter(user => {
            return user && typeof user === 'object' && user.id && (user.name || user.email);
        });
        
        console.log('DEBUG: Processed registeredUsers:', registeredUsers);
        console.log('DEBUG: Valid users after filtering:', validUsers);
        console.log('DEBUG: registeredUsers length:', registeredUsers.length);
        console.log('DEBUG: validUsers length:', validUsers.length);
        
        // Create unified list of all registered users (including admin-added ones)
        const allUsers = [];
        
        // Add all registered users (both self-registered and admin-added)
        validUsers.forEach((user, index) => {
            console.log(`DEBUG: Processing user ${index}:`, user);
            console.log(`DEBUG: User properties - id: ${user?.id}, name: ${user?.name}, type: ${typeof user}`);
            
            // Check if this is the current user (admin shouldn't delete themselves)
            const isCurrentUser = window.authManager && window.authManager.isCurrentUser(user.id);
            const deleteButton = !isCurrentUser ? 
                `<button class="delete-btn" onclick="app.deleteUser('${user.id}')" title="Delete User">🗑️</button>` : '';
                
            // Fallback for name: use name if available, otherwise use email or id
            const displayName = user.name || user.email || user.id;
            
            // Determine if this is an admin-added user
            const isAdminAdded = user.provider === 'admin' || user.id.startsWith('admin_added_');
                
            allUsers.push({
                id: user.id,
                name: displayName,
                type: isAdminAdded ? 'admin-added' : 'self-registered',
                picture: user.picture,
                provider: user.provider,
                lastActive: user.lastActive,
                skillLevel: user.skillLevel,
                skillInfo: user.skillInfo,
                displaySkill: user.skillInfo ? `${user.skillInfo.label} (${user.skillInfo.points} pts)` : 'Skill not set',
                actions: deleteButton
            });
        });
        
        // Create unified section
        let html = '';
        html += '<div class="players-section">';
        html += `<h3 style="color: #2c3e50; margin-bottom: 15px; border-bottom: 2px solid #007bff; padding-bottom: 10px;">👥 Registered Players (${allUsers.length})</h3>`;
        
        if (allUsers.length === 0) {
            html += `
                <div class="empty-state">
                    <p>No players found</p>
                    <p>Add players manually using the form above, or players will appear here after they register</p>
                </div>
            `;
        } else {
            html += '<div class="players-grid">';
            html += allUsers.map(user => `
                <div class="player-card registered-user">
                    ${user.actions}
                    <div class="player-info">
                        <div class="player-name">
                            ${user.picture ? `<img src="${user.picture}" alt="${user.name}" style="width: 20px; height: 20px; border-radius: 50%; margin-right: 8px; vertical-align: middle;">` : '❌ '}
                            ${user.name}
                            <span style="font-size: 0.7em; background: ${user.type === 'admin-added' ? '#007bff' : '#28a745'}; color: white; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">
                                ${user.type === 'admin-added' ? 'Admin Added' : 'Self Registered'}
                            </span>
                        </div>
                        <span class="skill-badge skill-${user.skillLevel || user.skill}">${user.displaySkill}</span>
                        <div style="font-size: 0.8em; color: #666; margin-top: 5px;">
                            ${user.type === 'admin-added' ? 
                                `Added by admin • ${new Date(user.dateAdded || user.lastActive).toLocaleDateString()}` :
                                `via ${user.provider} • Last active: ${new Date(user.lastActive).toLocaleDateString()}`
                            }
                        </div>
                    </div>
                </div>
            `).join('');
            html += '</div>';
        }
        html += '</div>';
        
        container.innerHTML = html;
    }

    // Signup Management
    openSignup() {
        this.currentWeek = document.getElementById('weekDate').value;
        this.loadSignups(); // This will now handle both available and signed up players
    }

    async toggleSignup(playerId) {
        this.currentWeek = document.getElementById('weekDate').value;
        
        // Check if signup is enabled (unless user is admin)
        const isAdmin = window.authManager && window.authManager.isAdmin();
        if (!isAdmin && !(await this.isSignupEnabled(this.currentWeek))) {
            alert('Signup is currently closed for this week. Please wait for admin to open signup.');
            return;
        }
        
        // Get all available players and verify player exists
        const allPlayers = await this.getAllAvailablePlayersForSignup();
        const player = allPlayers.find(p => p.id === playerId);
        
        if (!player) {
            console.error('Player not found in available players:', playerId);
            return;
        }

        try {
            // Use the new server API to toggle signup
            const result = await this.dataSync.toggleSignup(this.currentWeek, playerId);
            
            // Update local state with server response
            this.signups = result.signups;
            
            console.log(`Signup ${result.action} for ${playerId} in week ${result.week}`);
            
            // Refresh the display to show updated signups
            this.loadSignups();
            
        } catch (error) {
            console.error('Error toggling signup:', error);
            alert('❌ Error updating signup. Please try again.');
        }
    }

    async loadSignups() {
        // First, try to find an active signup session set by admin
        const activeSession = await this.findActiveSignupSession();
        
        if (activeSession) {
            console.log('📅 Active signup session found:', activeSession);
            // Set the current week to the active session
            this.currentWeek = activeSession;
            
            // Update the hidden week input to sync with the active session
            const weekDateInput = document.getElementById('weekDate');
            if (weekDateInput) {
                weekDateInput.value = activeSession;
            }
        } else {
            console.log('❌ No active signup session found');
            // If no active session, try to use the manually selected date (for admin)
            const weekDateInput = document.getElementById('weekDate');
            if (weekDateInput && weekDateInput.value) {
                this.currentWeek = weekDateInput.value;
            } else {
                console.log('📋 No signup session - will show member list only');
                await this.showClosedSignupView();
                return;
            }
        }

        console.log('📅 Loading signups for week:', this.currentWeek);

        // Update signup status and week display
        await this.updateSignupStatus();

        // Get all available players (global players + registered users)
        const allPlayers = await this.getAllAvailablePlayersForSignup();
        const signedUpIds = this.signups[this.currentWeek] || [];
        const signedUpPlayers = allPlayers.filter(p => signedUpIds.includes(p.id));
        const availablePlayers = allPlayers.filter(p => !signedUpIds.includes(p.id));
        
        // Update signup count
        const signupCountEl = document.getElementById('signupCount');
        if (signupCountEl) {
            signupCountEl.textContent = signedUpPlayers.length;
        }
        
        // Use the same formatted data for rendering that we use for signup logic
        await this.renderRegisteredPlayersList(allPlayers, signedUpPlayers);

        // Update team info
        this.updateTeamInfo();
        
        // Show/hide teams section based on signup status and player count
        await this.updateTeamsSection(signedUpPlayers.length);
        
        // Update signup status display
        await this.updateSignupStatus();
    }

    // Get all players available for signup (unified registered users system)
    async getAllAvailablePlayersForSignup() {
        const registeredUsersData = await this.getRegisteredUsers();
        const registeredUsers = Array.isArray(registeredUsersData) ? registeredUsersData : Object.values(registeredUsersData);
        
        // Filter out invalid users
        const validUsers = registeredUsers.filter(user => user && user.id && (user.name || user.email));
        
        // Convert all registered users (both self-registered and admin-added) to player format
        const allPlayersFormatted = validUsers.map(user => {
            // Ensure admin users always have "any" position
            let userPositions = user.positions;
            let userPosition = user.position;
            
            if (user.role === 'administrator') {
                userPositions = ['any'];
                userPosition = 'any';
            }
            
            // Ensure skillInfo exists - generate from skillLevel if missing
            const skillLevel = user.skillLevel || 'average';
            const skillInfo = user.skillInfo || window.getSkillInfo(skillLevel);
            
            const playerData = {
                id: `user_${user.id}`, // Add prefix to avoid conflicts
                name: user.name || user.email || user.id,
                skill: skillLevel,
                points: skillInfo.points,
                source: user.provider === 'admin' || user.id.startsWith('admin_added_') ? 'admin-added' : 'self-registered',
                picture: user.picture,
                provider: user.provider,
                positions: userPositions,
                position: userPosition,
                phone: user.phone, // Add phone number to player data
                email: user.email // Add email to player data
            };
            
            // Debug logging for position data
            if (user.provider === 'admin') {
                console.log('Admin-added player position data:', {
                    name: user.name,
                    positions: user.positions,
                    position: user.position
                });
            }
            
            return playerData;
        });
        
        return allPlayersFormatted;
    }

    async renderRegisteredPlayersList(allPlayers, signedUpPlayers) {
        const container = document.getElementById('signupList');
        if (!container) return;

        if (allPlayers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No Registered Players Yet</h3>
                    <p>Players will appear here after they complete registration</p>
                </div>
            `;
            return;
        }

        // Create a map of signed up player IDs for quick lookup
        const signedUpIds = signedUpPlayers.map(p => p.id);

        // Get signup status asynchronously
        const isAdmin = window.authManager && window.authManager.isAdmin();
        const isSignupOpen = await this.isSignupEnabled(this.currentWeek);

        // Sort players according to priority:
        // 1. Admin, 2. Current logged-in member (regardless of signup status), 3. Other members signed up, 4. Casual signed up, 5. Other members not signed up, 6. Casual not paid
        const currentUser = window.authManager && window.authManager.getCurrentUser();
        
        // Fallback: if no current user detected, find the active member (google provider without loggedOut flag)
        let activeUser = currentUser;
        if (!activeUser) {
            const activeMember = allPlayers.find(p => 
                p.provider === 'google' && 
                !p.loggedOut && 
                p.lastActive
            );
            if (activeMember) {
                activeUser = activeMember;
            }
        }
        
        const sortedPlayers = [...allPlayers].sort((a, b) => {
            const aIsSignedUp = signedUpIds.includes(a.id);
            const bIsSignedUp = signedUpIds.includes(b.id);
            const aIsAdmin = a.provider === 'admin' || a.role === 'administrator';
            const bIsAdmin = b.provider === 'admin' || b.role === 'administrator';
            const aIsMember = a.provider === 'google';
            const bIsMember = b.provider === 'google';
            const aIsCasual = a.provider === 'guest_casual' || a.provider === 'admin_casual';
            const bIsCasual = b.provider === 'guest_casual' || b.provider === 'admin_casual';
            
            // Check if player is currently logged-in user - enhanced matching
            const aIsCurrentUser = activeUser && (
                a.id === activeUser.id || 
                a.email === activeUser.email ||
                (a.googleId && a.googleId === activeUser.googleId) ||
                (a.googleId && a.googleId === activeUser.id)
            );
            const bIsCurrentUser = activeUser && (
                b.id === activeUser.id || 
                b.email === activeUser.email ||
                (b.googleId && b.googleId === activeUser.googleId) ||
                (b.googleId && b.googleId === activeUser.id)
            );

            // Priority 1: Admin first
            if (aIsAdmin && !bIsAdmin) return -1;
            if (!aIsAdmin && bIsAdmin) return 1;

            // Priority 2: Current logged-in member (but not admin) - always second regardless of signup status
            if (!aIsAdmin && !bIsAdmin) {
                if (aIsCurrentUser && aIsMember && !bIsCurrentUser) return -1;
                if (!aIsCurrentUser && bIsCurrentUser && bIsMember) return 1;
            }

            // For remaining priorities, exclude current user since it's already handled above
            const aIsNonCurrentMember = aIsMember && !aIsCurrentUser;  
            const bIsNonCurrentMember = bIsMember && !bIsCurrentUser;

            // Priority 3: Other Member signed up (excluding current user and admin)
            if (aIsNonCurrentMember && aIsSignedUp && !(bIsNonCurrentMember && bIsSignedUp)) return -1;
            if (!(aIsNonCurrentMember && aIsSignedUp) && bIsNonCurrentMember && bIsSignedUp) return 1;

            // Priority 4: Casual signed up
            if (aIsCasual && aIsSignedUp && !(bIsCasual && bIsSignedUp)) return -1;
            if (!(aIsCasual && aIsSignedUp) && bIsCasual && bIsSignedUp) return 1;

            // Priority 5: Other Member not signed up (excluding current user and admin)
            if (aIsNonCurrentMember && !aIsSignedUp && !(bIsNonCurrentMember && !bIsSignedUp)) return -1;
            if (!(aIsNonCurrentMember && !aIsSignedUp) && bIsNonCurrentMember && !bIsSignedUp) return 1;

            // Priority 6: Casual not paid (not signed up)
            if (aIsCasual && !aIsSignedUp && !(bIsCasual && !bIsSignedUp)) return -1;
            if (!(aIsCasual && !aIsSignedUp) && bIsCasual && !bIsSignedUp) return 1;

            // If same priority, sort by name
            return (a.name || '').localeCompare(b.name || '');
        });



        container.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #2c3e50; margin-bottom: 15px;">👥 All Registered Players (${sortedPlayers.length})</h3>
                ${(() => {
                    if (isAdmin) {
                        return `<p style="color: #6f42c1; font-size: 0.9em; margin-bottom: 15px; font-weight: bold;">
                            👑 <strong>Admin View:</strong> Manage signups, add new players, and delete users. ✅ indicates signed up.<br>
                            <span style="font-size: 0.8em; color: #666;">💡 Use admin controls above to add players or manage signup settings.</span>
                        </p>`;
                    } else if (isSignupOpen) {
                        return `<p style="color: #28a745; font-size: 0.9em; margin-bottom: 15px; font-weight: bold;">
                            🎯 <strong>Signup is OPEN!</strong> Find your name below and click the button to sign up or remove yourself.
                        </p>`;
                    } else {
                        return `<p style="color: #dc3545; font-size: 0.9em; margin-bottom: 15px; font-weight: bold;">
                            🔒 <strong>Signup is CLOSED.</strong> Current signup status is shown below.
                        </p>`;
                    }
                })()}
            </div>
            ${sortedPlayers.map(player => {
                const isSignedUp = signedUpIds.includes(player.id);
                // For user UI, show only name (no email fallback), for admin UI show full info
                let displayName = isAdmin ? player.name : (player.name && !player.name.includes('@') ? player.name : 'Player Name Not Set');
                
                return `
                    <div class="signup-player ${isSignedUp ? 'signed-up' : 'registered-only'}" data-provider="${player.provider || 'unknown'}" style="${isSignedUp ? 'background: #f8fff9; border-left: 4px solid #28a745;' : 'background: #f8f9fa; border-left: 4px solid #dee2e6;'}">
                        <div style="display: flex; align-items: center;">
                            <div class="player-avatar" style="margin-right: 12px;">
                                ${(() => {
                                    console.log(`Rendering avatar for ${displayName}:`, {
                                        hasPicture: !!player.picture,
                                        pictureUrl: player.picture,
                                        provider: player.provider
                                    });
                                    
                                    if (player.picture) {
                                        return `<img src="${player.picture}" alt="${displayName}" 
                                                style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid ${isSignedUp ? '#28a745' : '#dee2e6'}; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
                                                onerror="console.error('Failed to load profile picture for ${displayName}:', '${player.picture}'); this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                                onload="console.log('✅ Profile picture loaded for ${displayName}')">
                                                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: none; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; border: 2px solid ${isSignedUp ? '#28a745' : '#dee2e6'}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${displayName.charAt(0).toUpperCase()}</div>`;
                                    } else {
                                        return `<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px; border: 2px solid ${isSignedUp ? '#28a745' : '#dee2e6'}; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">${displayName.charAt(0).toUpperCase()}</div>`;
                                    }
                                })()}
                            </div>
                            <div style="flex: 1;">
                                <strong style="font-size: 1.1em;">${displayName}</strong>
                                ${isSignedUp ? '<span class="status-text" style="color: #28a745; font-size: 0.9em; margin-left: 8px;">✅<span class="status-text-mobile-hide"> Signed Up</span></span>' : 
                                    `<span class="status-text" style="color: #6c757d; font-size: 0.9em; margin-left: 8px;">${
                                        (() => {
                                            console.log('Player status debug:', {
                                                name: player.name,
                                                provider: player.provider,
                                                phone: player.phone,
                                                id: player.id
                                            });
                                            const statusText = player.provider === 'admin' ? 'Dong Hoang' :
                                                   player.provider === 'google' ? (isSignupOpen && !isSignedUp ? '❌ Not Signup' : 'Member') :
                                                   (player.provider === 'guest_casual' || player.provider === 'admin_casual') ? 'Not Paid' : 'Waiting Vote';
                                            
                                            if (statusText === 'Not Paid') {
                                                return '❌<span class="status-text-mobile-hide"> Not Paid</span>';
                                            } else if (statusText === 'Member') {
                                                return '❌<span class="status-text-mobile-hide"> Member</span>';
                                            } else if (statusText === 'Not Signup') {
                                                return '❌<span class="status-text-mobile-hide"> Not Signup</span>';
                                            } else if (statusText === 'Waiting Vote') {
                                                return '⏳<span class="status-text-mobile-hide"> Waiting Vote</span>';
                                            } else {
                                                return statusText;
                                            }
                                        })()
                                    }</span>`}
                                <span class="skill-badge skill-${player.skill}" style="margin-left: 10px;">${player.skill} (${player.points} pts)</span>
                                ${player.phone ? `
                                    <div class="contact-info-desktop" style="font-size: 0.85em; color: #007bff; margin-top: 3px; font-weight: 500;">📱 ${player.phone}</div>
                                    <div class="contact-info-mobile">
                                        <span class="contact-icon-mobile phone" onclick="toggleContactInfo(this, '${player.phone}', 'phone')" title="Click to show phone">📱</span>
                                    </div>
                                ` : ''}
                                ${player.email && player.provider === 'google' ? `
                                    <div class="contact-info-desktop" style="font-size: 0.85em; color: #28a745; margin-top: 3px; font-weight: 500;">📧 ${player.email}</div>
                                    <div class="contact-info-mobile">
                                        <span class="contact-icon-mobile email" onclick="toggleContactInfo(this, '${player.email}', 'email')" title="Click to show email">📧</span>
                                    </div>
                                ` : ''}
                                <div style="font-size: 0.8em; color: #666; margin-top: 4px;">
                                    ${player.positions && player.positions.length > 0 ? 
                                        `⚽ <span class="position-text-mobile-hide">Positions: </span>${player.positions.join(', ')}${isAdmin ? ` • 🏆 Level: ${player.skill} (${player.points} pts)` : ''}` : 
                                     player.position ? 
                                        `⚽ <span class="position-text-mobile-hide">Position: </span>${player.position}${isAdmin ? ` • 🏆 Level: ${player.skill} (${player.points} pts)` : ''}` : 
                                        `⚽ <span class="position-text-mobile-hide">Position not set</span>${isAdmin ? ` • 🏆 Level: ${player.skill} (${player.points} pts)` : ''}`}
                                </div>
                            </div>
                        </div>
                        <div>
                            ${(() => {
                                const currentUser = window.authManager && window.authManager.getCurrentUser();
                                // Need to compare the original user ID (without user_ prefix)
                                const originalUserId = player.id.replace('user_', '');
                                const isCurrentUser = currentUser && currentUser.id === originalUserId;
                                const isGuest = window.authManager && window.authManager.isGuest();
                                
                                // Guest users - show read-only status only
                                if (isGuest) {
                                    if (!isSignupOpen) {
                                        return `<div class="status-badge" style="padding: 5px 12px; font-size: 0.7em; color: #6c757d; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">CLOSED</div>`;
                                    } else {
                                        if (isSignedUp) {
                                            return `<div class="status-badge status-in" style="padding: 5px 15px; font-size: 0.8em; font-weight: bold; color: #28a745; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px;">✅<span class="status-text-mobile-hide"> SIGNED UP</span></div>`;
                                        } else {
                                            const statusText = (() => {
                                                console.log('Badge status debug:', {
                                                    name: player.name,
                                                    provider: player.provider,
                                                    phone: player.phone,
                                                    id: player.id
                                                });
                                                return player.provider === 'admin' ? 'DONG HOANG' :
                                                       player.provider === 'google' ? 'MEMBER' :
                                                       (player.provider === 'guest_casual' || player.provider === 'admin_casual') && player.phone ? player.phone.toUpperCase() :
                                                       (player.provider === 'guest_casual' || player.provider === 'admin_casual') ? 'NOT PAID' : 'WAITING VOTE';
                                            })();
                                            const icon = statusText === 'NOT PAID' ? '❌' : statusText === 'MEMBER' ? '❌' : statusText === 'WAITING VOTE' ? '⏳' : '📱';
                                            return `<div class="status-badge status-out" style="padding: 5px 15px; font-size: 0.8em; font-weight: bold; color: #6c757d; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">${icon}<span class="status-text-mobile-hide"> ${statusText}</span></div>`;
                                        }
                                    }
                                }
                                
                                // Admin can see and control all buttons (including delete for player management)
                                if (isAdmin) {
                                    let signupButton = '';
                                    if (!isSignupOpen) {
                                        signupButton = `<div class="status-badge" style="padding: 5px 10px; font-size: 0.8em; color: #6c757d; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; font-weight: bold;">SIGNUP CLOSED</div>`;
                                    } else if (isSignedUp) {
                                        signupButton = `<button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8em;" onclick="app.toggleSignup('${player.id}')">✖️ Remove from Game</button>`;
                                    } else {
                                        signupButton = `<button class="btn btn-success" style="padding: 5px 10px; font-size: 0.8em;" onclick="app.toggleSignup('${player.id}')">✅ Add to Game</button>`;
                                    }
                                    
                                    // Determine if this is a casual player (no email/not a member) or a member (has email)
                                    const isCasualPlayer = !player.email || (player.email && player.provider === 'admin');
                                    const isMember = player.email && player.provider === 'google';
                                    
                                    // Add appropriate action button for admin (except for current user)
                                    let actionButton = '';
                                    if (!isCurrentUser) {
                                        if (isSignupOpen && isCasualPlayer) {
                                            // When signup is open, show "Remove Casual" button ONLY for casual players (no gmail account)
                                            actionButton = `<button class="remove-casual-btn" style="margin-left: 8px; padding: 5px 10px; font-size: 0.8em; background: #ffc107; color: #000; border: 1px solid #ffc107; border-radius: 4px;" onclick="app.removeCasualPlayer('${originalUserId}')" title="Remove Casual Player from System">🚫 Remove Casual</button>`;
                                        }
                                        // Removed redundant delete button since there's already one in the top right corner
                                        // Members with Gmail accounts can't be removed when signup is open (only deleted when closed)
                                    }
                                    
                                    return signupButton + actionButton;
                                }
                                
                                // Current user can see and interact with their own button when signup is open
                                if (isCurrentUser) {
                                    if (!isSignupOpen) {
                                        return `<div class="status-badge" style="padding: 5px 15px; font-size: 0.8em; color: #dc3545; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; font-weight: bold;">🔒 SIGNUP CLOSED</div>`;
                                    } else if (isSignedUp) {
                                        return `<button class="btn btn-danger" style="padding: 8px 16px; font-size: 0.9em; font-weight: bold;" onclick="app.toggleSignup('${player.id}')">✖️ REMOVE ME</button>`;
                                    } else {
                                        return `<button class="btn btn-success" style="padding: 8px 16px; font-size: 0.9em; font-weight: bold;" onclick="app.toggleSignup('${player.id}')">✅ SIGN ME UP</button>`;
                                    }
                                }
                                
                                // Other players - show status only (no interactive buttons for regular users)
                                if (!isSignupOpen) {
                                    // When signup is closed, show minimal status
                                    return `<div class="status-badge" style="padding: 5px 12px; font-size: 0.7em; color: #6c757d; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">CLOSED</div>`;
                                } else {
                                    // When signup is open, show current status but no interactive buttons
                                    if (isSignedUp) {
                                        return `<div class="status-badge status-in" style="padding: 5px 15px; font-size: 0.8em; font-weight: bold; color: #28a745; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px;">✅<span class="status-text-mobile-hide"> SIGNED UP</span></div>`;
                                    } else {
                                        const statusText = (player.provider === 'guest_casual' || player.provider === 'admin_casual') ? 'NOT PAID' : 'WAITING VOTE';
                                        const icon = statusText === 'NOT PAID' ? '❌' : '⏳';
                                        return `<div class="status-badge status-out" style="padding: 5px 15px; font-size: 0.8em; font-weight: bold; color: #6c757d; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;">${icon}<span class="status-text-mobile-hide"> ${statusText}</span></div>`;
                                    }
                                }
                            })()}
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    }

    renderSignedUpPlayers(signedUpPlayers) {
        // This method is now replaced by renderRegisteredPlayersList
        // Keeping for backward compatibility
        const container = document.getElementById('signupList');
        if (!container) return;

        if (signedUpPlayers.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No players signed up yet</p></div>';
            return;
        }

        container.innerHTML = signedUpPlayers.map(player => {
            return `
            <div class="signup-player">
                <div>
                    ${player.picture ? `<img src="${player.picture}" alt="${player.name}" style="width: 20px; height: 20px; border-radius: 50%; margin-right: 8px; vertical-align: middle;">` : ''}
                    <strong>${player.name}</strong>
                    ${player.source === 'registered' ? '<span style="color: #28a745; font-size: 0.8em; margin-left: 5px;">👤</span>' : '<span style="color: #007bff; font-size: 0.8em; margin-left: 5px;">📝</span>'}
                    <span class="skill-badge skill-${player.skill}" style="margin-left: 10px;">${player.skill} (${player.points} pts)</span>
                    ${player.phone ? `
                        <div class="contact-info-desktop" style="font-size: 0.85em; color: #007bff; margin-top: 3px; font-weight: 500;">📱 ${player.phone}</div>
                        <div class="contact-info-mobile">
                            <span class="contact-icon-mobile phone" onclick="toggleContactInfo(this, '${player.phone}', 'phone')" title="Click to show phone">📱</span>
                        </div>
                    ` : ''}
                    ${player.email && player.provider === 'google' ? `
                        <div class="contact-info-desktop" style="font-size: 0.85em; color: #28a745; margin-top: 3px; font-weight: 500;">📧 ${player.email}</div>
                        <div class="contact-info-mobile">
                            <span class="contact-icon-mobile email" onclick="toggleContactInfo(this, '${player.email}', 'email')" title="Click to show email">📧</span>
                        </div>
                    ` : ''}
                    ${player.positions && player.positions.length > 0 ? `<div style="font-size: 0.75em; color: #666; margin-top: 3px;"><span class="position-text-mobile-hide">Positions: </span>${player.positions.join(', ')}</div>` : player.position ? `<div style="font-size: 0.75em; color: #666; margin-top: 3px;"><span class="position-text-mobile-hide">Position: </span>${player.position}</div>` : ''}
                </div>
                <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8em;" onclick="app.toggleSignup('${player.id}')">Remove</button>
            </div>
            `;
        }).join('');
    }

    // Enhanced Player List with Clear Member/Casual Separation
    async renderEnhancedPlayerList(allPlayers, signedUpPlayers, containerId = 'enhancedPlayerList') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (allPlayers.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px; color: #6c757d;">
                    <h3 style="color: #495057; margin-bottom: 10px;">No Players Registered Yet</h3>
                    <p>Players will appear here after they complete registration</p>
                </div>
            `;
            return;
        }

        // Separate players by type
        const members = allPlayers.filter(p => p.provider === 'google' && p.email);
        const casualPlayers = allPlayers.filter(p => p.provider !== 'google' || !p.email);
        
        // Create a map of signed up player IDs for quick lookup
        const signedUpIds = signedUpPlayers.map(p => p.id);
        
        // Get admin status
        const isAdmin = window.authManager && window.authManager.isAdmin();
        const isSignupOpen = await this.isSignupEnabled(this.currentWeek);

        container.innerHTML = `
            <div class="enhanced-player-container" style="max-width: 1200px; margin: 0 auto;">
                <!-- Header Stats -->
                <div class="player-stats" style="display: flex; justify-content: space-around; margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 10px;">
                    <div class="stat-item" style="text-align: center;">
                        <div class="stat-number" style="font-size: 2em; font-weight: bold; color: #2c3e50;">${allPlayers.length}</div>
                        <div class="stat-label" style="font-size: 0.9em; color: #6c757d;">Total Players</div>
                    </div>
                    <div class="stat-item" style="text-align: center;">
                        <div class="stat-number" style="font-size: 2em; font-weight: bold; color: #28a745;">${members.length}</div>
                        <div class="stat-label" style="font-size: 0.9em; color: #6c757d;">Gmail Members</div>
                    </div>
                    <div class="stat-item" style="text-align: center;">
                        <div class="stat-number" style="font-size: 2em; font-weight: bold; color: #ffc107;">${casualPlayers.length}</div>
                        <div class="stat-label" style="font-size: 0.9em; color: #6c757d;">Casual Players</div>
                    </div>
                    <div class="stat-item" style="text-align: center;">
                        <div class="stat-number" style="font-size: 2em; font-weight: bold; color: #007bff;">${signedUpIds.length}</div>
                        <div class="stat-label" style="font-size: 0.9em; color: #6c757d;">Signed Up</div>
                    </div>
                </div>

                <!-- Gmail Members Section -->
                ${members.length > 0 ? `
                <div class="members-section" style="margin-bottom: 30px;">
                    <div class="section-header" style="display: flex; align-items: center; margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #e8f5e9, #d4edda); border-radius: 10px; border-left: 5px solid #28a745;">
                        <div class="section-icon" style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #28a745, #20c997); display: flex; align-items: center; justify-content: center; font-size: 20px; color: white; font-weight: bold; margin-right: 15px;">🏆</div>
                        <div>
                            <h3 style="margin: 0; color: #155724;">Gmail Members (${members.length})</h3>
                            <p style="margin: 0; font-size: 0.9em; color: #155724;">Authenticated players with Google accounts</p>
                        </div>
                    </div>
                    <div class="player-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 15px;">
                        ${members.map(player => this.createEnhancedPlayerCard(player, signedUpIds.includes(player.id), 'member', isAdmin, isSignupOpen)).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Casual Players Section -->
                ${casualPlayers.length > 0 ? `
                <div class="casual-section">
                    <div class="section-header" style="display: flex; align-items: center; margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #fff3cd, #ffeaa7); border-radius: 10px; border-left: 5px solid #ffc107;">
                        <div class="section-icon" style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #ffc107, #fd7e14); display: flex; align-items: center; justify-content: center; font-size: 20px; color: white; font-weight: bold; margin-right: 15px;">⚡</div>
                        <div>
                            <h3 style="margin: 0; color: #856404;">Casual Players (${casualPlayers.length})</h3>
                            <p style="margin: 0; font-size: 0.9em; color: #856404;">Players without Google accounts</p>
                        </div>
                    </div>
                    <div class="player-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 15px;">
                        ${casualPlayers.map(player => this.createEnhancedPlayerCard(player, signedUpIds.includes(player.id), 'casual', isAdmin, isSignupOpen)).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    createEnhancedPlayerCard(player, isSignedUp, playerType, isAdmin, isSignupOpen) {
        const isMember = playerType === 'member';
        const displayName = player.name || 'Player Name Not Set';
        const currentUser = window.authManager && window.authManager.getCurrentUser();
        const originalUserId = player.id.replace('user_', '');
        const isCurrentUser = currentUser && currentUser.id === originalUserId;
        const isGuest = window.authManager && window.authManager.isGuest();

        return `
            <div class="player-card ${playerType} ${isSignedUp ? 'signed-up' : ''}" style="
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
                border: 2px solid ${isSignedUp ? '#28a745' : 'transparent'};
                position: relative;
                overflow: hidden;
                ${isSignedUp ? 'background: linear-gradient(135deg, #f8fff9, #ffffff);' : ''}
            ">
                <!-- Top accent bar -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 4px;
                    background: linear-gradient(90deg, ${isMember ? '#28a745, #20c997' : '#ffc107, #fd7e14'});
                "></div>
                
                <!-- Status badge -->
                <div class="status-badge" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    padding: 6px 12px;
                    border-radius: 20px;
                    font-size: 0.8em;
                    font-weight: bold;
                    color: white;
                    background: ${isSignedUp ? '#28a745' : '#6c757d'};
                ">${isSignedUp ? '✅<span class="status-text-mobile-hide"> Signed Up</span>' : ((player.provider === 'guest_casual' || player.provider === 'admin_casual') ? '❌<span class="status-text-mobile-hide"> Not Paid</span>' : '⏳<span class="status-text-mobile-hide"> Waiting Vote</span>')}</div>
                
                <!-- Player header -->
                <div class="player-header" style="display: flex; align-items: center; margin-bottom: 12px;">
                    <div class="player-avatar" style="margin-right: 12px; position: relative;">
                        ${(() => {
                            console.log(`Enhanced card avatar for ${displayName}:`, {
                                hasPicture: !!player.picture,
                                pictureUrl: player.picture,
                                provider: player.provider
                            });
                            
                            if (player.picture) {
                                return `<img src="${player.picture}" alt="${displayName}" 
                                        style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 3px solid ${isMember ? '#28a745' : '#ffc107'}; transition: all 0.3s ease;"
                                        onerror="console.error('Enhanced card: Failed to load profile picture for ${displayName}:', '${player.picture}'); this.style.display='none'; this.nextElementSibling.style.display='flex';"
                                        onload="console.log('✅ Enhanced card: Profile picture loaded for ${displayName}')">
                                        <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, ${isMember ? '#28a745, #20c997' : '#ffc107, #fd7e14'}); display: none; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; border: 3px solid ${isMember ? '#28a745' : '#ffc107'};">${displayName.charAt(0).toUpperCase()}</div>`;
                            } else {
                                return `<div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, ${isMember ? '#28a745, #20c997' : '#ffc107, #fd7e14'}); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px; border: 3px solid ${isMember ? '#28a745' : '#ffc107'};">${displayName.charAt(0).toUpperCase()}</div>`;
                            }
                        })()}
                        <div class="player-badge" style="
                            position: absolute;
                            top: -3px;
                            right: -3px;
                            width: 20px;
                            height: 20px;
                            border-radius: 50%;
                            background: ${isMember ? '#28a745' : '#ffc107'};
                            color: ${isMember ? 'white' : '#000'};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 12px;
                            border: 2px solid white;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        ">${isMember ? '🏆' : '⚡'}</div>
                    </div>
                    <div class="player-info" style="flex: 1;">
                        <div class="player-name" style="font-weight: bold; font-size: 1.1em; margin-bottom: 4px; color: #2c3e50;">${displayName}</div>
                        <div class="player-type" style="
                            font-size: 0.85em;
                            padding: 2px 8px;
                            border-radius: 12px;
                            font-weight: 500;
                            display: inline-block;
                            margin-bottom: 8px;
                            background: ${isMember ? '#d4edda' : '#fff3cd'};
                            color: ${isMember ? '#155724' : '#856404'};
                        ">${isMember ? '🏆 Gmail Member' : '⚡ Casual Player'}</div>
                    </div>
                </div>
                
                <!-- Player details -->
                <div class="player-details" style="font-size: 0.9em; color: #6c757d; line-height: 1.4; margin-bottom: 15px;">
                    ${isMember ? 
                        `<strong style="color: #495057;">📧 Email:</strong> 
                         <span class="contact-info-desktop">${player.email || 'Not provided'}</span>
                         <div class="contact-info-mobile">
                             <span class="contact-icon-mobile email" onclick="toggleContactInfo(this, '${player.email || ''}', 'email')" title="Click to show email">📧</span>
                         </div><br>` :
                        `<strong style="color: #495057;">📱 Phone:</strong> 
                         <span class="contact-info-desktop">${player.phone || 'Not provided'}</span>
                         <div class="contact-info-mobile">
                             <span class="contact-icon-mobile phone" onclick="toggleContactInfo(this, '${player.phone || ''}', 'phone')" title="Click to show phone">📱</span>
                         </div><br>`
                    }
                    <strong style="color: #495057;">⚽ <span class="position-text-mobile-hide">Positions:</span></strong> ${player.positions && player.positions.length > 0 ? player.positions.join(', ') : (player.position || 'Not set')}<br>
                    <strong style="color: #495057;">🏆 Skill:</strong> ${player.skill || 'average'} (${player.points || '2'} pts)<br>
                    ${isMember ? 
                        `<strong style="color: #495057;">🔄 Status:</strong> ${player.status || 'active'}<br>
                         <strong style="color: #495057;">📅 Last Active:</strong> ${player.lastActive ? new Date(player.lastActive).toLocaleDateString() : 'Recently'}` :
                        `<strong style="color: #495057;">➕ Added By:</strong> ${player.provider === 'admin_casual' || player.provider === 'admin' ? 'Admin' : 'Self-registered'}`
                    }
                </div>
                
                <!-- Action buttons -->
                <div class="player-actions" style="display: flex; gap: 8px; justify-content: flex-end;">
                    ${(() => {
                        // Guest users - show read-only status only
                        if (isGuest) {
                            return '';
                        }
                        
                        // Admin can see and control all buttons
                        if (isAdmin) {
                            let signupButton = '';
                            if (!isSignupOpen) {
                                signupButton = `<span style="padding: 8px 12px; font-size: 0.8em; color: #6c757d; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; font-weight: bold;">SIGNUP CLOSED</span>`;
                            } else if (isSignedUp) {
                                signupButton = `<button class="btn" style="padding: 8px 12px; font-size: 0.8em; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="app.toggleSignup('${player.id}')">✖️ Remove</button>`;
                            } else {
                                signupButton = `<button class="btn" style="padding: 8px 12px; font-size: 0.8em; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="app.toggleSignup('${player.id}')">✅ Add</button>`;
                            }
                            
                            // Add delete/remove button for admin (except for current user)
                            let actionButton = '';
                            if (!isCurrentUser) {
                                if (isSignupOpen && !isMember) {
                                    // When signup is open, show "Remove" button for casual players only
                                    actionButton = `<button class="btn" style="padding: 8px 12px; font-size: 0.8em; background: #ffc107; color: #000; border: none; border-radius: 4px; cursor: pointer;" onclick="app.removeCasualPlayer('${originalUserId}')" title="Remove Casual Player">🚫 Remove</button>`;
                                } else if (!isSignupOpen) {
                                    // When signup is closed, show delete button for all players
                                    actionButton = `<button class="btn" style="padding: 8px 12px; font-size: 0.8em; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="app.deleteUser('${originalUserId}')" title="Delete User">🗑️</button>`;
                                }
                            }
                            
                            return signupButton + (actionButton ? ' ' + actionButton : '');
                        }
                        
                        // Current user can see and interact with their own button when signup is open
                        if (isCurrentUser) {
                            if (!isSignupOpen) {
                                return `<span style="padding: 8px 15px; font-size: 0.8em; color: #dc3545; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; font-weight: bold;">🔒 SIGNUP CLOSED</span>`;
                            } else if (isSignedUp) {
                                return `<button class="btn" style="padding: 8px 16px; font-size: 0.9em; font-weight: bold; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="app.toggleSignup('${player.id}')">✖️ REMOVE ME</button>`;
                            } else {
                                return `<button class="btn" style="padding: 8px 16px; font-size: 0.9em; font-weight: bold; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="app.toggleSignup('${player.id}')">✅ SIGN ME UP</button>`;
                            }
                        }
                        
                        // Other players - show nothing for regular users (keep it clean)
                        return '';
                    })()}
                </div>
            </div>
        `;
    }



    // Team Info Update
    updateTeamInfo() {
        const teamInfoEl = document.getElementById('teamInfo');
        if (!teamInfoEl) return;

        const signedUpIds = this.signups[this.currentWeek] || [];
        const playerCount = signedUpIds.length;
        
        let info = `${playerCount} players signed up for week of ${this.currentWeek}`;
        if (playerCount > 0) {
            info += ` • Ready for game organization`;
        }
        
        teamInfoEl.textContent = info;
    }

    // Teams Section Visibility Management
    async updateTeamsSection(signedUpPlayersCount) {
        const teamsSection = document.getElementById('teamsSection');
        if (!teamsSection) return;

        try {
            // Only show teams section if signup is closed and there are enough players
            const isSignupOpen = await this.isSignupEnabled(this.currentWeek);
            
            if (!isSignupOpen && signedUpPlayersCount >= 2) {
                // Show the teams section and automatically load teams
                teamsSection.style.display = 'block';
                
                // Automatically load and display teams
                await this.loadAndDisplayTeamsDirectly();
            } else {
                // Hide the teams section
                teamsSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Error updating teams section:', error);
            teamsSection.style.display = 'none';
        }
    }

    // Load and display teams directly without toggle functionality
    async loadAndDisplayTeamsDirectly() {
        await loadAndDisplayTeams();
    }

    // Data Management
    async loadUserData(userId) {
        if (!userId) return;
        if (!this.dataSync) {
            throw new Error('DataSync service not available');
        }

        // Load signups from server
        const signupsData = await this.dataSync.getSignups();
        console.log('SoccerApp: Loaded signups from server');
        
        this.signups = signupsData;
        
        // Admin users can access all functionality through the unified signup interface
        if (window.authManager?.isAdmin()) {
            // Load players if not already loaded
            if (this.players.length === 0) {
                await this.loadGlobalPlayers();
            }
            // All admin functionality now integrated into the signup view
        }
        
        this.loadSignups();
    }

    async saveUserData() {
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            return;
        }
        // Note: Signups are now saved globally via toggleSignup API
        // This method is kept for other user data if needed in the future
        console.log('SoccerApp: User data save called (signups handled globally)');
    }

    async clearData() {
        this.players = [];
        this.signups = {};
        this.loadSignups();
    }

    // Tab Management
    async switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });

        // Show selected tab
        const targetTab = document.getElementById(tabName);
        const targetButton = document.querySelector(`[onclick="switchTab('${tabName}')"]`);
        
        if (targetTab) targetTab.classList.add('active');
        if (targetButton) targetButton.classList.add('active');

        // Save the current active tab to localStorage
        try {
            localStorage.setItem('activeTab', tabName);
            console.log('💾 Saved active tab to localStorage:', tabName);
        } catch (error) {
            console.warn('❌ Could not save active tab to localStorage:', error);
        }

        // Refresh content based on tab
        if (tabName === 'signup') {
            this.loadSignups();
        } else if (tabName === 'admin') {
            // Check admin access
            if (!window.authManager?.isAdmin()) {
                alert('❌ Access Denied!\n\nThe Admin tab is restricted to administrators only.');
                // Switch back to signup tab
                await this.switchTab('signup');
                return;
            }
            // Load admin data
            await this.renderMembersList();
            await this.updateSystemStats();
            await this.updateCasualPlayersCount();
        }
    }

    // Initialize tabs after authentication and restore saved tab
    async initializeTabsAfterAuth() {
        console.log('🔄 Initializing tabs after authentication...');
        try {
            // Preload admin data if user is admin
            if (window.authManager?.isAdmin()) {
                console.log('🔐 User is admin - preloading admin data...');
                await this.renderMembersList();
                await this.updateSystemStats();
                await this.updateCasualPlayersCount();
                
                // Sync admin controls with any active session
                await this.syncAdminControlsWithActiveSession();
            }

            // Check for active signup sessions and automatically load them
            const activeSession = await this.findActiveSignupSession();
            if (activeSession) {
                console.log('📅 Found active signup session - automatically loading:', activeSession);
                // Force load the active session regardless of saved tab
                this.currentWeek = activeSession;
                const weekDateInput = document.getElementById('weekDate');
                if (weekDateInput) {
                    weekDateInput.value = activeSession;
                }
                // Load signup data for the active session
                await this.loadSignups();
                
                // Ensure we're on the signup tab to see the active session
                await this.switchTab('signup');
                return;
            }

            // If no active session, proceed with normal tab restoration
            const savedTab = localStorage.getItem('activeTab');
            console.log('💾 Saved tab from localStorage:', savedTab);
            
            if (savedTab && savedTab !== 'signup') {
                // Only restore non-default tabs if user has access
                if (savedTab === 'admin' && window.authManager?.isAdmin()) {
                    console.log('✅ Restoring admin tab from saved state');
                    await this.switchTab('admin');
                } else {
                    console.log('❌ Saved tab not accessible, defaulting to signup');
                    await this.switchTab('signup');
                }
            } else {
                console.log('📋 No saved tab or default signup - loading signup data');
                // Default to signup tab and load its data (will show closed signup view if no session)
                await this.switchTab('signup');
            }
        } catch (error) {
            console.error('❌ Error initializing tabs after auth:', error);
            // Fallback to signup tab
            await this.switchTab('signup');
        }
    }

    // Sync admin controls with the currently active session
    async syncAdminControlsWithActiveSession() {
        try {
            const activeSession = await this.findActiveSignupSession();
            const adminWeekDate = document.getElementById('adminWeekDate');
            
            if (activeSession && adminWeekDate) {
                console.log('🔄 Syncing admin controls with active session:', activeSession);
                adminWeekDate.value = activeSession;
                
                // Update the admin controls display
                if (typeof updateAdminSignupWeek === 'function') {
                    await updateAdminSignupWeek();
                }
            } else {
                console.log('📋 No active session to sync with admin controls');
                // If no active sessions, ensure date picker is enabled
                if (adminWeekDate) {
                    adminWeekDate.disabled = false;
                    adminWeekDate.style.opacity = '1';
                    adminWeekDate.style.cursor = 'pointer';
                    adminWeekDate.title = 'Select a game week date';
                }
                
                // Update the admin controls display
                if (typeof updateAdminSignupWeek === 'function') {
                    await updateAdminSignupWeek();
                }
            }
        } catch (error) {
            console.error('Error syncing admin controls:', error);
        }
    }

    // Getters for other modules
    getPlayers() {
        return this.players;
    }

    getSignups() {
        return this.signups;
    }

    getCurrentWeek() {
        return this.currentWeek;
    }

    getSignedUpPlayers(week = null) {
        const targetWeek = week || this.currentWeek;
        const signedUpIds = this.signups[targetWeek] || [];
        return this.players.filter(p => signedUpIds.includes(p.id));
    }

    getSkillPoints() {
        return this.skillPoints;
    }

    // Admin signup management methods
    async loadSignupSettings() {
        try {
            if (this.dataSync) {
                return await this.dataSync.getSignupSettings();
            } else {
                const settings = localStorage.getItem('signupSettings');
                return settings ? JSON.parse(settings) : {};
            }
        } catch (error) {
            console.error('Error loading signup settings:', error);
            const settings = localStorage.getItem('signupSettings');
            return settings ? JSON.parse(settings) : {};
        }
    }

    async saveSignupSettings(settings) {
        try {
            if (this.dataSync) {
                await this.dataSync.saveSignupSettings(settings);
                console.log('SoccerApp: Signup settings saved to server');
            }
            // Also save to localStorage as fallback
            localStorage.setItem('signupSettings', JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving signup settings:', error);
            // Fallback to localStorage only
            localStorage.setItem('signupSettings', JSON.stringify(settings));
        }
    }

    async toggleWeeklySignup(week, isEnabled) {
        const settings = await this.loadSignupSettings();
        settings[week] = isEnabled;
        await this.saveSignupSettings(settings);
        
        // Update the cached settings
        this.signupSettings = settings;
        
        await this.loadSignups(); // Refresh the display
    }

    async isSignupEnabled(week) {
        // Ensure signup settings are loaded
        if (Object.keys(this.signupSettings).length === 0) {
            try {
                this.signupSettings = await this.loadSignupSettings();
            } catch (error) {
                console.error('Error loading signup settings:', error);
            }
        }
        return this.signupSettings[week] === true;
    }

    // Find the currently active signup session (admin-controlled)
    async findActiveSignupSession() {
        try {
            // Ensure signup settings are loaded
            if (Object.keys(this.signupSettings).length === 0) {
                this.signupSettings = await this.loadSignupSettings();
            }

            // Find the first enabled signup session
            const enabledSessions = Object.entries(this.signupSettings)
                .filter(([week, isEnabled]) => isEnabled === true)
                .map(([week]) => week)
                .sort(); // Sort by date to get the earliest active session

            console.log('🔍 Active signup sessions found:', enabledSessions);
            return enabledSessions.length > 0 ? enabledSessions[0] : null;
        } catch (error) {
            console.error('Error finding active signup session:', error);
            return null;
        }
    }

    // Find all currently active signup sessions
    async findAllActiveSignupSessions() {
        try {
            // Ensure signup settings are loaded
            if (Object.keys(this.signupSettings).length === 0) {
                this.signupSettings = await this.loadSignupSettings();
            }

            // Find all enabled signup sessions
            const enabledSessions = Object.entries(this.signupSettings)
                .filter(([week, isEnabled]) => isEnabled === true)
                .map(([week]) => week)
                .sort(); // Sort by date

            return enabledSessions;
        } catch (error) {
            console.error('Error finding all active signup sessions:', error);
            return [];
        }
    }

    async updateSignupStatus() {
        const weekDisplayEl = document.getElementById('signupWeekDisplay');
        const statusMessageEl = document.getElementById('signupStatusMessage');
        const isAdmin = window.authManager && window.authManager.isAdmin();
        const isSignupEnabled = await this.isSignupEnabled(this.currentWeek);
        
        if (weekDisplayEl) {
            const formattedDate = new Date(this.currentWeek).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            weekDisplayEl.textContent = `Game Week: ${formattedDate}`;
        }
        
        if (statusMessageEl) {
            if (isAdmin) {
                statusMessageEl.innerHTML = `
                    <div style="color: #6f42c1;">
                        👑 <strong>Admin View:</strong> You can always manage signups regardless of status
                    </div>
                `;
                statusMessageEl.className = 'signup-status-message admin';
            } else if (isSignupEnabled) {
                statusMessageEl.innerHTML = `
                    <div style="color: #28a745;">
                        ✅ <strong>Signup is OPEN</strong> for this week! Add yourself to the game below.
                    </div>
                `;
                statusMessageEl.className = 'signup-status-message open';
            } else {
                statusMessageEl.innerHTML = `
                    <div style="color: #dc3545;">
                        🔒 <strong>Signup is CLOSED</strong> for this week. Please wait for admin to open signup.
                    </div>
                `;
                statusMessageEl.className = 'signup-status-message closed';
            }
        }
    }

    // Show member list when no signup session is active
    async showClosedSignupView() {
        console.log('📋 Showing closed signup view with member list');
        
        const signupListContainer = document.getElementById('signupList');
        const signupCountEl = document.getElementById('signupCount');
        const weekDisplayEl = document.getElementById('signupWeekDisplay');
        const statusMessageEl = document.getElementById('signupStatusMessage');
        
        // Update week display
        if (weekDisplayEl) {
            weekDisplayEl.innerHTML = '📋 No Active Signup Session';
        }
        
        // Update status message
        if (statusMessageEl) {
            statusMessageEl.innerHTML = '🔒 <strong>Signup Closed</strong><br>No signup session is currently active.';
            statusMessageEl.style.background = '#f8d7da';
            statusMessageEl.style.color = '#721c24';
            statusMessageEl.style.border = '1px solid #f5c6cb';
        }
        
        // Set signup count to 0
        if (signupCountEl) {
            signupCountEl.textContent = '0';
        }
        
        if (!signupListContainer) return;

        try {
            // Get all registered users to show as member list
            const registeredUsersData = await this.getRegisteredUsers();
            const registeredUsers = Array.isArray(registeredUsersData) ? registeredUsersData : Object.values(registeredUsersData);
            
            // Get authorized members
            const members = await this.getAuthorizedMembers();
            
            signupListContainer.innerHTML = `
                <div style="background: #e3f2fd; padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
                    <h3 style="color: #1565c0; margin-bottom: 15px;">🔒 Signup Session Closed</h3>
                    <p style="color: #666; margin-bottom: 10px;">
                        No signup session is currently active. Please wait for an admin to open a signup session.
                    </p>
                    ${window.authManager?.isAdmin() ? 
                        '<p style="color: #dc3545; font-weight: bold;">As an admin, you can open a signup session using the admin controls above.</p>' : 
                        ''
                    }
                </div>
                
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                    <h3 style="color: #2c3e50; margin-bottom: 15px;">👥 System Members (${members.length})</h3>
                    <p style="color: #666; margin-bottom: 20px;">Current authorized members who can access the system:</p>
                    
                    ${members.length === 0 ? 
                        '<p style="color: #999; text-align: center; font-style: italic;">No members found</p>' :
                        `<div style="display: grid; gap: 10px;">
                            ${members.map(member => `
                                <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6; display: flex; align-items: center; justify-content: between;">
                                    <div style="display: flex; align-items: center; flex: 1;">
                                        <div style="width: 40px; height: 40px; background: #007bff; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px;">
                                            ${member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style="font-weight: bold; color: #2c3e50;">
                                                ${member.name || member.email}
                                            </div>
                                            <div style="color: #666; font-size: 0.9em;">
                                                📧 ${member.email}
                                            </div>
                                            <div style="color: #999; font-size: 0.8em;">
                                                Added: ${new Date(member.dateAdded).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div style="color: #28a745; font-size: 0.9em; font-weight: bold;">
                                        ✅ Authorized
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
                    }
                    
                    <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
                        <h4 style="color: #856404; margin-bottom: 10px;">ℹ️ How to Join a Game</h4>
                        <ol style="color: #856404; margin: 0; padding-left: 20px;">
                            <li>Wait for an admin to open a signup session for a specific date</li>
                            <li>You'll receive access to sign up for that game</li>
                            <li>Select your participation status and submit</li>
                        </ol>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error showing closed signup view:', error);
            signupListContainer.innerHTML = `
                <div style="background: #f8d7da; padding: 20px; border-radius: 10px; text-align: center;">
                    <h3 style="color: #721c24;">❌ Error Loading Data</h3>
                    <p style="color: #721c24;">Unable to load member information. Please try refreshing the page.</p>
                </div>
            `;
        }
    }

    // Team Generation Method
    async generateBalancedTeams(weekDate) {
        try {
            const signedUpIds = this.signups[weekDate] || [];
            if (signedUpIds.length < 2) {
                console.log('Not enough players to generate teams');
                return null;
            }

            // Get detailed player information for signed up players
            const registeredUsers = await this.getRegisteredUsers();
            const signedUpPlayers = [];

            for (const playerId of signedUpIds) {
                // Find player in registered users
                const player = Object.values(registeredUsers).find(user => {
                    // Check multiple ID formats for compatibility
                    return user.id === playerId || 
                           user.id === `user_${playerId}` || 
                           `user_${user.id}` === playerId ||
                           user.email === playerId;
                });

                if (player) {
                    const skillPoints = getSkillPoints(player.skillLevel) || 2;
                    signedUpPlayers.push({
                        id: player.id,
                        name: player.name || player.email,
                        skillLevel: player.skillLevel || 'average',
                        points: skillPoints,
                        email: player.email,
                        positions: player.positions || ['any'],
                        position: player.position
                    });
                }
            }

            if (signedUpPlayers.length < 2) {
                console.log('No valid players found for team generation');
                return null;
            }

            // Enhanced team generation with position and skill balancing
            const teams = this.generatePositionBalancedTeams(signedUpPlayers);
            
            console.log('Teams generated with position balancing:', {
                teamA: { 
                    players: teams.teamA.players.length, 
                    points: teams.teamA.totalPoints,
                    positions: this.getTeamPositionSummary(teams.teamA.players)
                },
                teamB: { 
                    players: teams.teamB.players.length, 
                    points: teams.teamB.totalPoints,
                    positions: this.getTeamPositionSummary(teams.teamB.players)
                },
                pointDifference: Math.abs(teams.teamA.totalPoints - teams.teamB.totalPoints)
            });

            return teams;

        } catch (error) {
            console.error('Error generating balanced teams:', error);
            return null;
        }
    }

    // Enhanced team generation algorithm considering both skill points and positions
    generatePositionBalancedTeams(players) {
        const teamA = { players: [], totalPoints: 0, positionCounts: {} };
        const teamB = { players: [], totalPoints: 0, positionCounts: {} };
        
        // Initialize position counters
        const positions = ['goalkeeper', 'defender', 'midfielder', 'forward'];
        positions.forEach(pos => {
            teamA.positionCounts[pos] = 0;
            teamB.positionCounts[pos] = 0;
        });

        // Sort players by skill points (highest first) for better distribution
        const sortedPlayers = players.sort((a, b) => b.points - a.points);
        
        // Create a pool of unassigned players
        const unassignedPlayers = [...sortedPlayers];
        
        // Phase 1: Assign players with specific positions (non-"any") first
        const specificPositionPlayers = unassignedPlayers.filter(player => 
            player.positions && player.positions.length > 0 && 
            !player.positions.includes('any') && player.positions.some(pos => pos !== 'any')
        );
        
        // Remove specific position players from unassigned pool
        specificPositionPlayers.forEach(player => {
            const index = unassignedPlayers.findIndex(p => p.id === player.id);
            if (index > -1) unassignedPlayers.splice(index, 1);
        });

        // Assign specific position players based on position needs and skill balance
        specificPositionPlayers.forEach(player => {
            const team = this.chooseBestTeamForPlayer(player, teamA, teamB);
            this.assignPlayerToTeam(player, team);
        });

        // Phase 2: Assign remaining players (including "any" position players)
        unassignedPlayers.forEach(player => {
            const team = this.chooseBestTeamForPlayer(player, teamA, teamB);
            this.assignPlayerToTeam(player, team);
        });

        return { teamA, teamB };
    }

    // Choose the best team for a player based on skill balance and position needs
    chooseBestTeamForPlayer(player, teamA, teamB) {
        // Calculate skill point difference if player joins each team
        const pointDiffA = Math.abs((teamA.totalPoints + player.points) - teamB.totalPoints);
        const pointDiffB = Math.abs(teamA.totalPoints - (teamB.totalPoints + player.points));
        
        // Calculate position balance scores for each team
        const positionScoreA = this.calculatePositionScore(player, teamA);
        const positionScoreB = this.calculatePositionScore(player, teamB);
        
        // Weighted decision: prioritize position balance, then skill balance
        const scoreA = (positionScoreA * 2) - (pointDiffA * 0.5);
        const scoreB = (positionScoreB * 2) - (pointDiffB * 0.5);
        
        // Choose team with higher combined score
        return scoreA > scoreB ? teamA : teamB;
    }

    // Calculate how much a player would improve position balance for a team
    calculatePositionScore(player, team) {
        if (!player.positions || player.positions.length === 0) return 0;
        
        let score = 0;
        const positions = ['goalkeeper', 'defender', 'midfielder', 'forward'];
        
        // Check each position the player can play
        player.positions.forEach(position => {
            if (position === 'any') {
                // "Any" position player - slightly prefer teams with fewer total players
                score += (10 - team.players.length) * 0.1;
            } else if (positions.includes(position)) {
                // Specific position - higher score if team has fewer players in this position
                const currentCount = team.positionCounts[position] || 0;
                const maxDesirable = Math.ceil(team.players.length / positions.length) + 1;
                
                if (currentCount < maxDesirable) {
                    score += (maxDesirable - currentCount) * 2;
                } else {
                    score -= (currentCount - maxDesirable) * 1;
                }
            }
        });
        
        return score;
    }

    // Assign a player to a team and update counters
    assignPlayerToTeam(player, team) {
        team.players.push(player);
        team.totalPoints += player.points;
        
        // Update position counts
        if (player.positions && player.positions.length > 0) {
            player.positions.forEach(position => {
                if (position !== 'any' && team.positionCounts.hasOwnProperty(position)) {
                    team.positionCounts[position]++;
                }
            });
        }
    }

    // Get a summary of positions in a team
    getTeamPositionSummary(players) {
        const summary = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0, any: 0 };
        
        players.forEach(player => {
            if (player.positions && player.positions.length > 0) {
                player.positions.forEach(position => {
                    if (summary.hasOwnProperty(position)) {
                        summary[position]++;
                    }
                });
            }
        });
        
        return summary;
    }

    // Member Management Methods
    async getAuthorizedMembers() {
        try {
            const response = await fetch('http://localhost:3000/api/members');
            if (response.ok) {
                const data = await response.json();
                // Ensure we always return an array using our utility
                return window.AppUtils.ensureArray(data);
            }
            return [];
        } catch (error) {
            console.error('Error loading members:', error);
            return [];
        }
    }

    async addAuthorizedMember(email, name = '', skillLevel = 'average', positions = ['midfielder']) {
        try {
            // Use centralized skill system

            const response = await fetch('http://localhost:3000/api/members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    name: name.trim(),
                    skillLevel: skillLevel,
                    skillInfo: window.getSkillInfo(skillLevel),
                    positions: positions,
                    addedBy: window.authManager?.getUserId(),
                    dateAdded: new Date().toISOString()
                })
            });

            if (response.ok) {
                console.log('Member added successfully:', email);
                await this.renderMembersList();
                await this.updateSystemStats();
                return true;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add member');
            }
        } catch (error) {
            console.error('Error adding member:', error);
            throw error;
        }
    }

    async removeAuthorizedMember(email) {
        try {
            const response = await fetch(`http://localhost:3000/api/members/${encodeURIComponent(email)}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const result = await response.json();
                console.log('Member removed successfully:', email);
                
                // Trigger session validation for removed member
                if (typeof notifyMemberRemoved === 'function') {
                    notifyMemberRemoved(result.removedEmail || email);
                }
                
                await this.renderMembersList();
                await this.updateSystemStats();
                return true;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to remove member');
            }
        } catch (error) {
            console.error('Error removing member:', error);
            throw error;
        }
    }

    async renderMembersList() {
        const container = document.getElementById('membersList');
        if (!container) return;

        try {
            const members = await this.getAuthorizedMembers();
            // getAuthorizedMembers now returns an array, so we don't need Object.values
            const memberList = members;

            if (memberList.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 40px; color: #666;">
                        <div style="font-size: 3em; margin-bottom: 15px;">📭</div>
                        <h4>No Members Added</h4>
                        <p>Add Gmail addresses above to authorize system access.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div class="members-grid" style="display: grid; gap: 10px;">
                    ${memberList.map(member => `
                        <div class="member-card" style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;">
                            <div class="member-info">
                                <div style="font-weight: bold; color: #2c3e50;">
                                    ${member.name || member.email}
                                </div>
                                <div style="color: #666; font-size: 0.9em;">📧 ${member.email}</div>
                                ${member.skillLevel ? `<div style="margin: 5px 0;"><span class="skill-badge skill-${member.skillLevel}">${member.skillInfo ? `${member.skillInfo.label} (${member.skillInfo.points} pts)` : member.skillLevel}</span></div>` : ''}
                                ${member.positions && member.positions.length > 0 ? `<div style="color: #666; font-size: 0.85em; margin: 3px 0;">⚽ <span class="position-text-mobile-hide">Positions: </span>${member.positions.join(', ')}</div>` : member.position ? `<div style="color: #666; font-size: 0.85em; margin: 3px 0;">⚽ <span class="position-text-mobile-hide">Position: </span>${member.position}</div>` : ''}
                                <div style="color: #999; font-size: 0.8em;">
                                    Added: ${new Date(member.dateAdded).toLocaleDateString()}
                                    ${member.status ? ` • Status: ${member.status === 'activated' ? '✅ Activated' : '⏳ Not Activated'}` : ''}
                                </div>
                            </div>
                            <button class="btn btn-danger btn-sm" onclick="removeMember('${member.email}')" style="padding: 5px 10px; font-size: 0.8em;">
                                🗑️ Remove
                            </button>
                        </div>
                    `).join('')}
                </div>
            `;
        } catch (error) {
            console.error('Error rendering members list:', error);
            container.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 20px; color: #dc3545;">
                    <p>Error loading members list. Please try again.</p>
                </div>
            `;
        }
    }

    async updateSystemStats() {
        try {
            // Update total members
            const members = await this.getAuthorizedMembers();
            const totalMembers = members.length; // members is now an array
            const totalMembersEl = document.getElementById('totalMembers');
            if (totalMembersEl) totalMembersEl.textContent = String(totalMembers);

            // Update total players
            const users = await this.getRegisteredUsers();
            const totalPlayers = Object.keys(users).length;
            const totalPlayersEl = document.getElementById('totalPlayers');
            if (totalPlayersEl) totalPlayersEl.textContent = String(totalPlayers);

            // Update active signups (current week)
            const signups = this.signups[this.currentWeek] || [];
            const activeSignupsEl = document.getElementById('activeSignups');
            if (activeSignupsEl) activeSignupsEl.textContent = signups.length;

        } catch (error) {
            console.error('Error updating system stats:', error);
        }
    }

    async resetAllSystemData() {
        try {
            console.log('🔄 Starting complete system data reset...');
            
            // Step 1: Reset signups
            this.signups = {};
            await this.dataSync.saveSignups({});
            console.log('✅ Signups cleared');

            // Step 2: Reset signup settings (close all)
            await this.saveSignupSettings({});
            this.signupSettings = {};
            console.log('✅ Signup settings cleared');

            // Step 3: Clear users (keep members list for access control)
            const response = await fetch('http://localhost:3000/api/users/reset', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to reset user data');
            }
            console.log('✅ Server user data cleared');

            // Step 4: Force all clients to clear localStorage by updating data version
            await this.forceClientDataClear();
            console.log('✅ Client localStorage clear triggered');

            // Step 5: Clear current user's localStorage immediately
            await this.clearCurrentUserLocalStorage();
            console.log('✅ Current user localStorage cleared');

            // Step 6: Refresh all displays
            await this.loadSignups();
            await this.updateSystemStats();
            
            // Refresh member list display if admin is logged in
            await this.renderMembersList();

            console.log('✅ System data reset completed - all users, signups, members, and client data cleared');
            return true;
        } catch (error) {
            console.error('❌ Error resetting system data:', error);
            throw error;
        }
    }

    // Force all clients to clear localStorage on next visit
    async forceClientDataClear() {
        try {
            console.log('🔄 Forcing client localStorage clear...');
            
            // Update the data version to force all clients to clear localStorage
            const newVersion = `2025.9.28.${Date.now()}`; // Unique version timestamp
            
            // Save the new version requirement to server
            try {
                const response = await fetch('http://localhost:3000/api/config/data-version', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        version: newVersion,
                        requiresClear: true,
                        reason: 'admin system data reset'
                    })
                });
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`✅ Server data version updated: ${newVersion}`);
                    console.log('📱 All clients will be forced to clear localStorage on next visit');
                } else {
                    throw new Error('Server config update failed');
                }
            } catch (serverError) {
                console.log('⚠️ Server config endpoint not available, using localStorage method only');
            }
            
            // Store the version change requirement in server-side flag
            // This could be checked by clients to know they need to clear localStorage
            const versionFlag = {
                requiresClear: true,
                version: newVersion,
                timestamp: Date.now(),
                reason: 'System data reset'
            };
            
            // You could save this to a special endpoint or data store
            // For now, we'll rely on the localStorage clear for current user
            console.log('✅ Client clear flag prepared:', versionFlag);
            
        } catch (error) {
            console.error('❌ Error forcing client data clear:', error);
            // Don't throw - this is not critical for the reset to work
        }
    }

    // Clear current user's localStorage immediately
    async clearCurrentUserLocalStorage() {
        try {
            console.log('🗑️ Clearing current user localStorage...');
            
            // Clear all app-related localStorage keys
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
            
            // Remove the keys
            keysToRemove.forEach(key => {
                console.log(`🗑️ Removing localStorage key: ${key}`);
                localStorage.removeItem(key);
            });
            
            // Update data version to force clear on next visit
            const newVersion = `2025.9.28.${Date.now()}`;
            localStorage.setItem('casualSoccerDataVersion', newVersion);
            
            console.log(`✅ Cleared ${keysToRemove.length} localStorage keys and set new version: ${newVersion}`);
            
        } catch (error) {
            console.error('❌ Error clearing current user localStorage:', error);
            // Don't throw - this is not critical for the reset to work
        }
    }
}

// Global functions for onclick handlers
function switchTab(tabName) {
    if (window.app) {
        window.app.switchTab(tabName);
    }
}

function addPlayer() {
    if (window.app) {
        window.app.addPlayer().catch(error => {
            console.error('Error in addPlayer:', error);
            alert('❌ Error adding player. Please try again.');
        });
    }
}

// Global functions for admin signup controls
function toggleWeeklySignup(checkbox, week) {
    if (window.app) {
        const isEnabled = checkbox.checked;
        window.app.toggleWeeklySignup(week, isEnabled);
        
        // Update UI to show status
        const statusElement = document.getElementById(`status-${week}`);
        if (statusElement) {
            statusElement.textContent = isEnabled ? 'Open' : 'Closed';
            statusElement.className = `signup-status ${isEnabled ? 'open' : 'closed'}`;
        }
    }
}

function updateSignupWeek() {
    const weekSelect = document.getElementById('adminWeekSelect');
    const signupCheckbox = document.getElementById('weeklySignupToggle');
    
    if (window.app && weekSelect && signupCheckbox) {
        const selectedWeek = weekSelect.value;
        const isEnabled = window.app.isSignupEnabled(selectedWeek);
        signupCheckbox.checked = isEnabled;
    }
}

// New admin signup control functions
async function updateAdminSignupWeek() {
    const weekDateInput = document.getElementById('adminWeekDate');
    const toggleBtn = document.getElementById('toggleSignupBtn');
    
    if (window.app && weekDateInput && toggleBtn) {
        const selectedWeek = weekDateInput.value;
        
        // Check if there are any active sessions to determine if date picker should be disabled
        const allActiveSessions = await window.app.findAllActiveSignupSessions();
        const hasActiveSessions = allActiveSessions.length > 0;
        
        // Disable date picker if there are active sessions
        weekDateInput.disabled = hasActiveSessions;
        if (hasActiveSessions) {
            weekDateInput.style.opacity = '0.6';
            weekDateInput.style.cursor = 'not-allowed';
            weekDateInput.title = 'Date picker is disabled while signup sessions are active. Close all sessions to change dates.';
        } else {
            weekDateInput.style.opacity = '1';
            weekDateInput.style.cursor = 'pointer';
            weekDateInput.title = 'Select a game week date';
        }
        
        if (!selectedWeek) {
            // No date selected - disable the toggle button
            toggleBtn.disabled = true;
            toggleBtn.className = 'toggle-btn signup-disabled';
            const iconSpan = toggleBtn.querySelector('.icon');
            const textSpan = toggleBtn.querySelector('.text');
            if (iconSpan) iconSpan.textContent = '📅';
            if (textSpan) textSpan.textContent = 'Select Date First';
            
            const signupInfo = document.getElementById('currentSignupInfo');
            if (signupInfo) {
                signupInfo.style.display = 'none';
            }
            return;
        }
        
        // Enable the button since we have a date
        toggleBtn.disabled = false;
        
        const isEnabled = await window.app.isSignupEnabled(selectedWeek);
        
        // Update toggle button appearance and content
        const iconSpan = toggleBtn.querySelector('.icon');
        const textSpan = toggleBtn.querySelector('.text');
        
        if (isEnabled) {
            // Currently OPEN - button should say "Close Signup"
            toggleBtn.className = 'toggle-btn signup-open';
            if (iconSpan) iconSpan.textContent = '✅';
            if (textSpan) textSpan.textContent = 'Close Signup';
        } else {
            // Currently CLOSED - button should say "Open Signup"
            toggleBtn.className = 'toggle-btn signup-closed';
            if (iconSpan) iconSpan.textContent = '🔒';
            if (textSpan) textSpan.textContent = 'Open Signup';
        }
        
        // Show current signup info with session details
        const signupInfo = document.getElementById('currentSignupInfo');
        if (signupInfo) {
            const formattedDate = new Date(selectedWeek).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            });
            
            // Get current signup count for this date
            const currentSignups = window.app.signups[selectedWeek] || [];
            const signupCount = currentSignups.length;
            
            let statusMessage = '';
            if (isEnabled) {
                statusMessage = `
                    <div style="color: #28a745; font-weight: bold; margin-bottom: 10px;">
                        ✅ This signup session is ACTIVE
                    </div>`;
            } else {
                statusMessage = `
                    <div style="color: #6c757d; margin-bottom: 10px;">
                        🔒 This signup session is CLOSED
                    </div>`;
            }
            
            // Show date picker status message
            let datePickerMessage = '';
            if (hasActiveSessions) {
                const activeSessionDates = allActiveSessions.map(date => 
                    new Date(date).toLocaleDateString('en-US', {
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric'
                    })).join(', ');
                
                datePickerMessage = `
                    <div style="background: #fff3cd; color: #856404; padding: 8px; border-radius: 4px; font-size: 0.9em; margin-bottom: 10px;">
                        🔒 <strong>Date picker locked:</strong> Active session${allActiveSessions.length > 1 ? 's' : ''} running (${activeSessionDates}).
                        <br><em>Close all sessions to change dates.</em>
                    </div>`;
            }
            
            signupInfo.innerHTML = `
                ${statusMessage}
                ${datePickerMessage}
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
                    <div><strong>Date:</strong> ${formattedDate}</div>
                    <div><strong>Signups:</strong> ${signupCount} player${signupCount !== 1 ? 's' : ''}</div>
                </div>
                <div style="margin-top: 10px; font-size: 0.8em; color: #666;">
                    💡 Switch to "Weekly Signup" tab to see detailed signup list
                </div>
            `;
            signupInfo.style.display = 'block';
        }
        
        // Always synchronize with the main week selector when admin changes date
        const mainWeekDate = document.getElementById('weekDate');
        if (mainWeekDate && selectedWeek) {
            mainWeekDate.value = selectedWeek;
            window.app.currentWeek = selectedWeek;
            // Update the signup displays to show the selected week's data
            await window.app.loadSignups();
        }
    }
}

async function toggleAdminSignup() {
    const weekDateInput = document.getElementById('adminWeekDate');
    
    if (!window.app || !weekDateInput || !weekDateInput.value) {
        alert('Please select a date first!');
        return;
    }

    try {
        const selectedWeek = weekDateInput.value;
        const currentStatus = await window.app.isSignupEnabled(selectedWeek);
        const newStatus = !currentStatus;
        
        // Toggle the signup status (this will save to server)
        await window.app.toggleWeeklySignup(selectedWeek, newStatus);
        
        // Update admin controls display (this will handle date picker enable/disable)
        await updateAdminSignupWeek();
        
        // Synchronize with the main week selector and create signup session
        const mainWeekDate = document.getElementById('weekDate');
        if (mainWeekDate) {
            mainWeekDate.value = selectedWeek;
            window.app.currentWeek = selectedWeek;
            
            // Initialize signup session for this date if it doesn't exist
            if (!window.app.signups[selectedWeek]) {
                window.app.signups[selectedWeek] = [];
                // Save the empty signup session to server
                await window.app.dataSync.saveSignups(window.app.signups);
            }
        }
        
        // Update the Weekly Signup tab displays to show current signups
        await window.app.loadSignups();
        
        // Auto-switch to Weekly Signup tab to show the signup list
        if (newStatus) {
            // If signup was just opened, switch to signup tab to show the session
            await window.app.switchTab('signup');
        }
        
        // Show confirmation message with additional info
        const formattedDate = new Date(selectedWeek).toLocaleDateString();
        let message;
        if (newStatus) {
            message = `✅ Signup SESSION OPENED for ${formattedDate}\n\nUsers can now sign up for this date. Check the "Weekly Signup" tab to see who has signed up.`;
        } else {
            // Get current signup count for this date
            const currentSignups = window.app.signups[selectedWeek] || [];
            
            // Generate balanced teams when signup is closed
            let teamsMessage = '';
            if (currentSignups.length >= 2) {
                const teams = await window.app.generateBalancedTeams(selectedWeek);
                if (teams) {
                    teamsMessage = `\n\n⚽ BALANCED TEAMS GENERATED:\n\n` +
                        `� TEAM A (${teams.teamA.totalPoints} pts): ${teams.teamA.players.map(p => `${p.name}${p.positions && p.positions.length > 0 ? ` (${p.positions.join(', ')})` : p.position ? ` (${p.position})` : ''}`).join(', ')}\n\n` +
                        `🔴 TEAM B (${teams.teamB.totalPoints} pts): ${teams.teamB.players.map(p => `${p.name}${p.positions && p.positions.length > 0 ? ` (${p.positions.join(', ')})` : p.position ? ` (${p.position})` : ''}`).join(', ')}\n\n` +
                        `Point difference: ${Math.abs(teams.teamA.totalPoints - teams.teamB.totalPoints)} pts`;
                }
            }
            
            message = `�🔒 Signup SESSION CLOSED for ${formattedDate}\n\nTotal signups: ${currentSignups.length} players. Session data is preserved.${teamsMessage}`;
        }
        
        // Show a temporary success message
        showTemporaryMessage(message, 'success');
        console.log(message);
        
        // Update signup info display with session details
        const signupInfo = document.getElementById('currentSignupInfo');
        if (signupInfo) {
            const currentSignups = window.app.signups[selectedWeek] || [];
            let teamsDisplay = '';
            
            // If signup is closed and there are enough players, show the teams
            if (!newStatus && currentSignups.length >= 2) {
                const teams = await window.app.generateBalancedTeams(selectedWeek);
                if (teams) {
                    teamsDisplay = `
                        <div style="margin-top: 15px; padding: 15px; background: #fff; border: 2px solid #28a745; border-radius: 8px;">
                            <h4 style="color: #28a745; margin-bottom: 10px;">⚽ Generated Teams</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                <div style="background: #e3f2fd; padding: 10px; border-radius: 6px;">
                                    <strong style="color: #1976d2;">🔵 TEAM A (${teams.teamA.totalPoints} pts)</strong>
                                    <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                                        ${teams.teamA.players.map(p => {
                                            const isCasualPlayer = p.provider === 'guest_casual' || p.provider === 'admin_casual' || p.provider === 'guest' || p.provider === 'admin';
                                            const isGoogleMember = p.provider === 'google' && p.email;
                                            return `<li style="display: flex; align-items: center; margin-bottom: 4px;">
                                                ${p.picture ? 
                                                    `<img src="${p.picture}" alt="${p.name}" style="width: 20px; height: 20px; border-radius: 50%; margin-right: 8px; object-fit: cover; border: 1px solid #1976d2;">` : 
                                                    `<div style="width: 20px; height: 20px; border-radius: 50%; background: #1976d2; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; margin-right: 8px;">${p.name.charAt(0).toUpperCase()}</div>`
                                                }
                                                <span>${p.name} (${p.points} pts)${p.positions && p.positions.length > 0 ? ` - ${p.positions.join(', ')}` : p.position ? ` - ${p.position}` : ''}</span>
                                                ${isCasualPlayer && p.phone ? `
                                                    <span class="contact-info-desktop" style="color: #1976d2; margin-left: 8px; font-size: 0.8em;">(${p.phone})</span>
                                                    <span class="contact-info-mobile" style="margin-left: 8px;">
                                                        <span class="contact-icon-mobile phone" onclick="toggleContactInfo(this, '${p.phone}', 'phone')" title="Click to show phone">📱</span>
                                                    </span>
                                                ` : ''}
                                                ${isGoogleMember ? `
                                                    <span class="contact-info-desktop" style="color: #28a745; margin-left: 8px; font-size: 0.8em;">(${p.email})</span>
                                                    <span class="contact-info-mobile" style="margin-left: 8px;">
                                                        <span class="contact-icon-mobile email" onclick="toggleContactInfo(this, '${p.email}', 'email')" title="Click to show email">📧</span>
                                                    </span>
                                                ` : ''}
                                            </li>`;
                                        }).join('')}
                                    </ul>
                                </div>
                                <div style="background: #ffebee; padding: 10px; border-radius: 6px;">
                                    <strong style="color: #d32f2f;">🔴 TEAM B (${teams.teamB.totalPoints} pts)</strong>
                                    <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                                        ${teams.teamB.players.map(p => {
                                            const isCasualPlayer = p.provider === 'guest_casual' || p.provider === 'admin_casual' || p.provider === 'guest' || p.provider === 'admin';
                                            const isGoogleMember = p.provider === 'google' && p.email;
                                            return `<li style="display: flex; align-items: center; margin-bottom: 4px;">
                                                ${p.picture ? 
                                                    `<img src="${p.picture}" alt="${p.name}" style="width: 20px; height: 20px; border-radius: 50%; margin-right: 8px; object-fit: cover; border: 1px solid #d32f2f;">` : 
                                                    `<div style="width: 20px; height: 20px; border-radius: 50%; background: #d32f2f; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; margin-right: 8px;">${p.name.charAt(0).toUpperCase()}</div>`
                                                }
                                                <span>${p.name} (${p.points} pts)${p.positions && p.positions.length > 0 ? ` - ${p.positions.join(', ')}` : p.position ? ` - ${p.position}` : ''}</span>
                                                ${isCasualPlayer && p.phone ? `
                                                    <span class="contact-info-desktop" style="color: #d32f2f; margin-left: 8px; font-size: 0.8em;">(${p.phone})</span>
                                                    <span class="contact-info-mobile" style="margin-left: 8px;">
                                                        <span class="contact-icon-mobile phone" onclick="toggleContactInfo(this, '${p.phone}', 'phone')" title="Click to show phone">📱</span>
                                                    </span>
                                                ` : ''}
                                                ${isGoogleMember ? `
                                                    <span class="contact-info-desktop" style="color: #28a745; margin-left: 8px; font-size: 0.8em;">(${p.email})</span>
                                                    <span class="contact-info-mobile" style="margin-left: 8px;">
                                                        <span class="contact-icon-mobile email" onclick="toggleContactInfo(this, '${p.email}', 'email')" title="Click to show email">📧</span>
                                                    </span>
                                                ` : ''}
                                            </li>`;
                                        }).join('')}
                                    </ul>
                                </div>
                            </div>
                            <div style="text-align: center; margin-top: 10px; color: #666; font-size: 0.9em;">
                                Point difference: ${Math.abs(teams.teamA.totalPoints - teams.teamB.totalPoints)} pts
                            </div>
                        </div>
                    `;
                }
            }
            
            signupInfo.innerHTML = `
                <strong>Selected Week:</strong> ${formattedDate}<br>
                <strong>Status:</strong> ${newStatus ? '✅ Signup is OPEN' : '🔒 Signup is CLOSED'}<br>
                <strong>Current Signups:</strong> ${currentSignups.length} players<br>
                <em>💡 Tip: Switch to "Weekly Signup" tab to see detailed signup list</em>
                ${teamsDisplay}
            `;
            signupInfo.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error toggling signup:', error);
        alert('❌ Error updating signup status. Please try again.');
    }
}

// Wrapper function for HTML onchange events (since HTML can't call async functions directly)
async function handleAdminWeekChange() {
    const weekDateInput = document.getElementById('adminWeekDate');
    const newDate = weekDateInput.value;
    
    // Prevent changes if date picker is disabled
    if (weekDateInput.disabled) {
        showTemporaryMessage(
            '🔒 Cannot change date while signup sessions are active. Close all sessions first.',
            'error'
        );
        return;
    }
    
    if (!newDate) {
        // No date selected, just update the UI
        if (updateAdminSignupWeek) {
            updateAdminSignupWeek().catch(error => {
                console.error('Error updating admin signup week:', error);
            });
        }
        return;
    }
    
    try {
        // Check if there are any active sessions and if we're switching away from one
        const allActiveSessions = await window.app.findAllActiveSignupSessions();
        const isNewDateActive = allActiveSessions.includes(newDate);
        const switchingFromActive = allActiveSessions.length > 0 && !isNewDateActive;
        
        if (switchingFromActive) {
            // Show information about the switch
            const activeSessionDates = allActiveSessions.map(date => 
                new Date(date).toLocaleDateString('en-US', {
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric'
                })).join(', ');
            
            const newDateFormatted = new Date(newDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long', 
                day: 'numeric',
                year: 'numeric'
            });
            
            showTemporaryMessage(
                `📅 Switched to ${newDateFormatted}. ` + 
                `Active session${allActiveSessions.length > 1 ? 's' : ''} still running: ${activeSessionDates}`,
                'info'
            );
        }
        
        // Always update the admin signup week display
        if (updateAdminSignupWeek) {
            await updateAdminSignupWeek();
        }
        
    } catch (error) {
        console.error('Error handling admin week change:', error);
        // Still update the display even if there's an error
        if (updateAdminSignupWeek) {
            updateAdminSignupWeek().catch(err => {
                console.error('Error updating admin signup week:', err);
            });
        }
    }
}

// Helper function to show temporary messages
function showTemporaryMessage(message, type = 'info') {
    // Create or get the message container
    let messageContainer = document.getElementById('tempMessageContainer');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'tempMessageContainer';
        messageContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        document.body.appendChild(messageContainer);
    }

    // Create message element
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
        padding: 15px 20px;
        margin-bottom: 10px;
        border-radius: 8px;
        font-weight: bold;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
    `;
    
    // Set colors based on type
    if (type === 'success') {
        messageEl.style.backgroundColor = '#d4edda';
        messageEl.style.color = '#155724';
        messageEl.style.border = '1px solid #c3e6cb';
    } else if (type === 'error') {
        messageEl.style.backgroundColor = '#f8d7da';
        messageEl.style.color = '#721c24';
        messageEl.style.border = '1px solid #f5c6cb';
    } else {
        messageEl.style.backgroundColor = '#d1ecf1';
        messageEl.style.color = '#0c5460';
        messageEl.style.border = '1px solid #bee5eb';
    }
    
    messageEl.textContent = message;
    messageContainer.appendChild(messageEl);
    
    // Remove after 4 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }
    }, 4000);
}

// Add CSS animation styles
if (!document.getElementById('tempMessageStyles')) {
    const styles = document.createElement('style');
    styles.id = 'tempMessageStyles';
    styles.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(styles);
}

function openSignup() {
    if (window.app) {
        window.app.openSignup();
    }
}

function loadSignups() {
    if (window.app) {
        window.app.loadSignups();
    }
}

// Member Management Global Functions
async function addMember() {
    if (!window.app) return;

    const emailInput = document.getElementById('memberEmail');
    const nameInput = document.getElementById('memberName');
    const skillLevelInput = document.getElementById('memberSkillLevel');
    const positionInput = document.getElementById('memberPosition');

    if (!emailInput) return;

    const email = emailInput.value.trim();
    const name = nameInput ? nameInput.value.trim() : '';
    const skillLevel = skillLevelInput ? skillLevelInput.value : 'average';
    const positions = positionInput ? Array.from(positionInput.selectedOptions).map(option => option.value) : ['any'];

    if (!email) {
        alert('Please enter a Gmail address');
        return;
    }

    if (!name) {
        alert('Please enter a display name');
        return;
    }

    // Validate Gmail address
    if (!email.toLowerCase().includes('@gmail.com')) {
        alert('Please enter a valid Gmail address (must contain @gmail.com)');
        return;
    }

    if (positions.length === 0) {
        alert('Please select at least one position');
        return;
    }

    try {
        await window.app.addAuthorizedMember(email, name, skillLevel, positions);
        
        // Clear form
        emailInput.value = '';
        if (nameInput) nameInput.value = '';
        if (skillLevelInput) skillLevelInput.selectedIndex = 1; // Reset to "Average"
        if (positionInput) {
            // Clear all selections and select any position as default
            Array.from(positionInput.options).forEach(option => option.selected = false);
            positionInput.options[4].selected = true; // Select "Any Position"
        }
        
        alert(`✅ Member Added Successfully!\n\n${email} has been authorized to access the system.`);
    } catch (error) {
        console.error('Error adding member:', error);
        alert(`❌ Error adding member: ${error.message}`);
    }
}

async function removeMember(email) {
    if (!window.app) return;

    if (confirm(`Are you sure you want to remove "${email}" from the authorized members list?\n\nThey will no longer be able to access the system.`)) {
        try {
            await window.app.removeAuthorizedMember(email);
            alert(`✅ Member Removed!\n\n${email} has been removed from the authorized list.`);
        } catch (error) {
            console.error('Error removing member:', error);
            alert(`❌ Error removing member: ${error.message}`);
        }
    }
}

async function resetAllData() {
    if (!window.app) return;

    const confirmMessage = `⚠️ DANGER: Reset All System Data ⚠️

This will permanently delete:
• All registered players
• All signup sessions and data
• All signup settings (will close all signups)
• All authorized Gmail members
• Force ALL CLIENTS to clear their local data (phone numbers, saved logins, etc.)

This action cannot be undone!
All users will need to log in again and re-enter their information.

Type "RESET" to confirm:`;

    const confirmation = prompt(confirmMessage);
    
    if (confirmation === 'RESET') {
        try {
            await window.app.resetAllSystemData();
            alert('✅ System Reset Complete!\n\nAll data has been cleared:\n• Players and signups removed\n• All signup sessions closed\n• Authorized members removed\n• Client localStorage clear forced for all users\n\n🔄 All users will be automatically logged out and will need to:\n• Log in again\n• Re-enter their information (phone numbers, etc.)\n• Re-add members to allow system access\n\nThe system is now completely clean!');
        } catch (error) {
            console.error('Error resetting system:', error);
            alert(`❌ Error resetting system: ${error.message}`);
        }
    } else if (confirmation !== null) {
        alert('Reset cancelled. You must type "RESET" exactly to confirm.');
    }
}

// Test Data Management Functions
async function importTestData() {
    if (!window.app || !window.app.dataSync) return;

    const confirmMessage = `🧪 Import Test Dataset 🧪

This will add sample data including:
• 6 test members (various skill levels)
• 4 logged-in users with complete profiles
• 2 casual players (admin-added)
• Sample signup data for testing

Admin users will be preserved.

Continue with test data import?`;

    if (confirm(confirmMessage)) {
        try {
            const importBtn = document.getElementById('importTestDataBtn');
            if (importBtn) {
                importBtn.disabled = true;
                importBtn.textContent = '⏳ Importing...';
            }

            const response = await fetch('http://localhost:3000/api/import-test-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                alert(`✅ Test Data Imported Successfully!\n\n` +
                      `📊 Import Summary:\n` +
                      `• ${result.imported.members} test members\n` +
                      `• ${result.imported.users} test users\n` +
                      `• ${result.imported.signupWeeks} signup weeks\n` +
                      `• ${result.imported.preservedAdmins} admin users preserved\n\n` +
                      `The system is now ready for testing!`);
                
                // Refresh the admin view to show new data
                if (window.app && window.app.loadMembers) {
                    await window.app.loadMembers();
                }
                if (window.app && window.app.loadSignups) {
                    await window.app.loadSignups();
                }
            } else {
                throw new Error(result.error || 'Import failed');
            }

        } catch (error) {
            console.error('Error importing test data:', error);
            alert(`❌ Error importing test data: ${error.message}`);
        } finally {
            const importBtn = document.getElementById('importTestDataBtn');
            if (importBtn) {
                importBtn.disabled = false;
                importBtn.textContent = '📥 Import Test Data';
            }
        }
    }
}

async function viewTestDataInfo() {
    try {
        const infoDiv = document.getElementById('testDataInfo');
        const viewBtn = document.getElementById('viewTestDataBtn');
        
        if (viewBtn) {
            viewBtn.disabled = true;
            viewBtn.textContent = '⏳ Loading...';
        }

        const response = await fetch('http://localhost:3000/api/test-data-info');
        const result = await response.json();

        if (result.success) {
            const testData = result.testData;
            
            const membersHtml = testData.members.map(member => 
                `<div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
                    <span><strong>${member.name}</strong> (${member.email})</span>
                    <span>${member.skillLevel.toUpperCase()} - ${member.positions.join(', ')} - ${member.status}</span>
                </div>`
            ).join('');

            const usersHtml = testData.users.map(user => 
                `<div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee;">
                    <span><strong>${user.name}</strong> (${user.email})</span>
                    <span>${user.provider.toUpperCase()} - ${user.skillLevel || 'N/A'}</span>
                </div>`
            ).join('');

            infoDiv.innerHTML = `
                <h5 style="color: #0c5460; margin-bottom: 10px;">📋 Test Dataset Preview</h5>
                <div style="margin-bottom: 15px;">
                    <strong>📊 Summary:</strong> ${testData.totalMembers} members, ${testData.totalUsers} users, ${testData.totalSignupWeeks} signup weeks
                </div>
                <div style="margin-bottom: 15px;">
                    <h6 style="color: #0c5460;">👥 Test Members:</h6>
                    <div style="font-size: 0.85em; max-height: 150px; overflow-y: auto;">
                        ${membersHtml}
                    </div>
                </div>
                <div style="margin-bottom: 15px;">
                    <h6 style="color: #0c5460;">🔐 Test Users:</h6>
                    <div style="font-size: 0.85em; max-height: 150px; overflow-y: auto;">
                        ${usersHtml}
                    </div>
                </div>
                <div>
                    <h6 style="color: #0c5460;">📅 Signup Weeks:</h6>
                    <div style="font-size: 0.85em;">
                        ${testData.signupWeeks.join(', ')}
                    </div>
                </div>
            `;
            
            infoDiv.style.display = infoDiv.style.display === 'none' ? 'block' : 'none';
        } else {
            throw new Error(result.error || 'Failed to load test data info');
        }

    } catch (error) {
        console.error('Error loading test data info:', error);
        alert(`❌ Error loading test data info: ${error.message}`);
    } finally {
        const viewBtn = document.getElementById('viewTestDataBtn');
        if (viewBtn) {
            viewBtn.disabled = false;
            viewBtn.textContent = '👁️ Preview Test Data';
        }
    }
}

// Membership Modal Functions
function showMembershipModal() {
    const modal = document.getElementById('membershipModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeMembershipModal() {
    const modal = document.getElementById('membershipModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function contactAdmin() {
    const message = encodeURIComponent(
        'Hello, I would like to become a member of the Soccer Team Management System. Please let me know how to proceed with the $40 membership payment. My email is: ' + 
        (window.authManager?.getCurrentUser()?.email || 'Please provide your Gmail address')
    );
    
    // You can customize this with the actual admin contact method
    const subject = encodeURIComponent('Soccer Team Membership Request');
    window.open(`mailto:admin@example.com?subject=${subject}&body=${message}`, '_blank');
}

// Teams Display Functions for Users
async function loadAndDisplayTeams() {
    const teamsDisplay = document.getElementById('teamsDisplay');
    if (!teamsDisplay || !window.app || !window.app.currentWeek) return;
    
    try {
        // Check if signup is closed and there are signups
        const isSignupOpen = await window.app.isSignupEnabled(window.app.currentWeek);
        const signedUpIds = window.app.signups[window.app.currentWeek] || [];
        
        if (isSignupOpen) {
            teamsDisplay.innerHTML = `
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 10px; text-align: center;">
                    <h4 style="color: #856404; margin-bottom: 10px;">🔓 Signup Still Open</h4>
                    <p style="color: #856404; margin: 0;">Teams will be generated automatically when the admin closes the signup session.</p>
                </div>
            `;
            return;
        }
        
        if (signedUpIds.length < 2) {
            teamsDisplay.innerHTML = `
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 10px; text-align: center;">
                    <h4 style="color: #721c24; margin-bottom: 10px;">⚠️ Not Enough Players</h4>
                    <p style="color: #721c24; margin: 0;">At least 2 players need to sign up before teams can be generated.</p>
                </div>
            `;
            return;
        }
        
        // Generate teams
        const teams = await window.app.generateBalancedTeams(window.app.currentWeek);
        
        if (!teams) {
            teamsDisplay.innerHTML = `
                <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 10px; text-align: center;">
                    <h4 style="color: #721c24; margin-bottom: 10px;">❌ Error Generating Teams</h4>
                    <p style="color: #721c24; margin: 0;">Unable to generate teams. Please try again later.</p>
                </div>
            `;
            return;
        }
        
        // Check if user is admin to determine whether to show individual points
        const isAdmin = window.authManager && window.authManager.isAdmin();
        
        // Get position summaries for both teams
        const teamAPositions = window.app.getTeamPositionSummary(teams.teamA.players);
        const teamBPositions = window.app.getTeamPositionSummary(teams.teamB.players);
        
        // Helper function to format position summary
        const formatPositionSummary = (positions) => {
            const positionIcons = {
                'Goalkeeper': '🥅',
                'Defender': '🛡️',
                'Midfielder': '⚽',
                'Forward': '⚡',
                'Any Position': '🔄'
            };
            
            return Object.entries(positions)
                .filter(([_, count]) => count > 0)
                .map(([pos, count]) => `${positionIcons[pos] || '⚽'} ${count} ${pos}${count > 1 ? 's' : ''}`)
                .join(' • ');
        };
        
        // Display the teams with beautiful styling
        teamsDisplay.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; padding: 25px; color: white; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 25px;">
                    <h3 style="color: white; margin: 0; font-size: 1.5em; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">⚽ Balanced Teams</h3>
                    <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 0.95em;">Generated with skill balance and position distribution</p>
                </div>
                
                <div class="teams-grid">
                    <div style="background: rgba(33, 150, 243, 0.3); backdrop-filter: blur(10px); padding: 20px; border-radius: 12px; border: 2px solid rgba(33, 150, 243, 0.5);">
                        <div style="display: flex; align-items: center; margin-bottom: 15px;">
                            <div style="background: #2196f3; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 1.2em; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">A</div>
                            <div>
                                <h4 style="color: #e3f2fd; margin: 0; font-size: 1.2em;">TEAM A</h4>
                                <div style="color: rgba(255,255,255,0.8); font-size: 0.9em;">${teams.teamA.totalPoints} total points</div>
                                <div style="color: rgba(255,255,255,0.7); font-size: 0.8em; margin-top: 3px;">${formatPositionSummary(teamAPositions)}</div>
                            </div>
                        </div>
                        <div style="space-y: 8px;">
                            ${teams.teamA.players.map(p => {
                                const isCasualPlayer = p.provider === 'guest_casual' || p.provider === 'admin_casual' || p.provider === 'guest' || p.provider === 'admin';
                                const isGoogleMember = p.provider === 'google' && p.email;
                                return `
                                <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                                    <div style="display: flex; align-items: center; flex: 1;">
                                        <div class="team-player-avatar" style="margin-right: 10px;">
                                            ${p.picture ? 
                                                `<img src="${p.picture}" alt="${p.name}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">` : 
                                                `<div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${p.name.charAt(0).toUpperCase()}</div>`
                                            }
                                        </div>
                                        <div>
                                            <div style="font-weight: 500; color: white;">
                                                ${p.name}
                                                ${isCasualPlayer && p.phone ? `
                                                    <span class="contact-info-desktop" style="color: rgba(255,255,255,0.8); margin-left: 8px; font-size: 0.8em;">(${p.phone})</span>
                                                    <span class="contact-info-mobile" style="margin-left: 8px;">
                                                        <span class="contact-icon-mobile phone" onclick="toggleContactInfo(this, '${p.phone}', 'phone')" title="Click to show phone">📱</span>
                                                    </span>
                                                ` : ''}
                                                ${isGoogleMember ? `
                                                    <span class="contact-info-desktop" style="color: rgba(255,255,255,0.8); margin-left: 8px; font-size: 0.8em;">(${p.email})</span>
                                                    <span class="contact-info-mobile" style="margin-left: 8px;">
                                                        <span class="contact-icon-mobile email" onclick="toggleContactInfo(this, '${p.email}', 'email')" title="Click to show email">📧</span>
                                                    </span>
                                                ` : ''}
                                            </div>
                                            ${p.positions && p.positions.length > 0 ? `<div style="font-size: 0.75em; opacity: 0.8; margin-top: 2px; color: rgba(255,255,255,0.8);">${p.positions.join(', ')}</div>` : p.position ? `<div style="font-size: 0.75em; opacity: 0.8; margin-top: 2px; color: rgba(255,255,255,0.8);">${p.position}</div>` : ''}
                                        </div>
                                    </div>
                                    ${isAdmin ? `<span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px; font-size: 0.8em; color: white;">${p.points} pts</span>` : ''}
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <div style="background: rgba(244, 67, 54, 0.3); backdrop-filter: blur(10px); padding: 20px; border-radius: 12px; border: 2px solid rgba(244, 67, 54, 0.5);">
                        <div style="display: flex; align-items: center; margin-bottom: 15px;">
                            <div style="background: #f44336; color: white; width: 35px; height: 35px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 1.2em; font-weight: bold; box-shadow: 0 4px 8px rgba(0,0,0,0.2);">B</div>
                            <div>
                                <h4 style="color: #ffebee; margin: 0; font-size: 1.2em;">TEAM B</h4>
                                <div style="color: rgba(255,255,255,0.8); font-size: 0.9em;">${teams.teamB.totalPoints} total points</div>
                                <div style="color: rgba(255,255,255,0.7); font-size: 0.8em; margin-top: 3px;">${formatPositionSummary(teamBPositions)}</div>
                            </div>
                        </div>
                        <div style="space-y: 8px;">
                            ${teams.teamB.players.map(p => {
                                const isCasualPlayer = p.provider === 'guest_casual' || p.provider === 'admin_casual' || p.provider === 'guest' || p.provider === 'admin';
                                const isGoogleMember = p.provider === 'google' && p.email;
                                return `
                                <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                                    <div style="display: flex; align-items: center; flex: 1;">
                                        <div class="team-player-avatar" style="margin-right: 10px;">
                                            ${p.picture ? 
                                                `<img src="${p.picture}" alt="${p.name}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">` : 
                                                `<div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${p.name.charAt(0).toUpperCase()}</div>`
                                            }
                                        </div>
                                        <div>
                                            <div style="font-weight: 500; color: white;">
                                                ${p.name}
                                                ${isCasualPlayer && p.phone ? `
                                                    <span class="contact-info-desktop" style="color: rgba(255,255,255,0.8); margin-left: 8px; font-size: 0.8em;">(${p.phone})</span>
                                                    <span class="contact-info-mobile" style="margin-left: 8px;">
                                                        <span class="contact-icon-mobile phone" onclick="toggleContactInfo(this, '${p.phone}', 'phone')" title="Click to show phone">📱</span>
                                                    </span>
                                                ` : ''}
                                                ${isGoogleMember ? `
                                                    <span class="contact-info-desktop" style="color: rgba(255,255,255,0.8); margin-left: 8px; font-size: 0.8em;">(${p.email})</span>
                                                    <span class="contact-info-mobile" style="margin-left: 8px;">
                                                        <span class="contact-icon-mobile email" onclick="toggleContactInfo(this, '${p.email}', 'email')" title="Click to show email">📧</span>
                                                    </span>
                                                ` : ''}
                                            </div>
                                            ${p.positions && p.positions.length > 0 ? `<div style="font-size: 0.75em; opacity: 0.8; margin-top: 2px; color: rgba(255,255,255,0.8);">${p.positions.join(', ')}</div>` : p.position ? `<div style="font-size: 0.75em; opacity: 0.8; margin-top: 2px; color: rgba(255,255,255,0.8);">${p.position}</div>` : ''}
                                        </div>
                                    </div>
                                    ${isAdmin ? `<span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px; font-size: 0.8em; color: white;">${p.points} pts</span>` : ''}
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
                
                <div style="text-align: center; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px; backdrop-filter: blur(10px);">
                    <div style="color: rgba(255,255,255,0.95); font-size: 1.1em; margin-bottom: 10px;">
                        <strong>⚖️ Skill Balance: ${Math.abs(teams.teamA.totalPoints - teams.teamB.totalPoints)} point${Math.abs(teams.teamA.totalPoints - teams.teamB.totalPoints) !== 1 ? 's' : ''} difference</strong>
                    </div>
                    <div style="color: rgba(255,255,255,0.9); font-size: 0.95em; margin-bottom: 10px;">
                        <strong>🏟️ <span class="position-text-mobile-hide">Position </span>Balance:</strong> 
                        ${Object.keys({...teamAPositions, ...teamBPositions}).map(pos => {
                            const teamACount = teamAPositions[pos] || 0;
                            const teamBCount = teamBPositions[pos] || 0;
                            const diff = Math.abs(teamACount - teamBCount);
                            const icon = pos === 'Goalkeeper' ? '🥅' : pos === 'Defender' ? '🛡️' : pos === 'Midfielder' ? '⚽' : pos === 'Forward' ? '⚡' : '🔄';
                            return `${icon} ${pos}: ${teamACount} vs ${teamBCount} ${diff === 0 ? '✅' : diff === 1 ? '⚖️' : '❗'}`;
                        }).join(' • ')}
                    </div>
                    ${Math.abs(teams.teamA.totalPoints - teams.teamB.totalPoints) <= 2 ? 
                        '<div style="color: #4caf50; font-weight: bold; font-size: 1.05em;">🎯 Excellent balance! Perfect for competitive play!</div>' : 
                        Math.abs(teams.teamA.totalPoints - teams.teamB.totalPoints) <= 4 ?
                        '<div style="color: #ffeb3b; font-weight: bold;">⚖️ Good balance for fun competition!</div>' :
                        '<div style="color: #ff9800; font-weight: bold;">⚡ Skill gap present - great for learning!</div>'
                    }
                </div>
                
                <div style="text-align: center; margin-top: 15px; font-size: 0.9em; opacity: 0.8;">
                    💡 Teams are balanced by skill points and position distribution for optimal gameplay
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading teams:', error);
        teamsDisplay.innerHTML = `
            <div style="background: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 10px; text-align: center;">
                <h4 style="color: #721c24; margin-bottom: 10px;">❌ Error Loading Teams</h4>
                <p style="color: #721c24; margin: 0;">Unable to load team information. Please try again.</p>
            </div>
        `;
    }
}

// Mobile Contact Info Toggle Function
function toggleContactInfo(iconElement, contactValue, contactType) {
    // Find the parent element that contains the contact info
    const parentContainer = iconElement.closest('.signup-player, .player-card');
    if (!parentContainer) return;
    
    // Check if this contact info is already expanded
    const existingExpanded = parentContainer.querySelector('.contact-info-expanded');
    
    if (existingExpanded) {
        // If already expanded, hide it
        existingExpanded.remove();
    } else {
        // Show the contact information
        const expandedElement = document.createElement('div');
        expandedElement.className = 'contact-info-expanded';
        expandedElement.style.color = contactType === 'phone' ? '#007bff' : '#28a745';
        expandedElement.innerHTML = `${contactType === 'phone' ? '📱' : '📧'} ${contactValue}`;
        
        // Insert after the icon's container
        const mobileContainer = iconElement.closest('.contact-info-mobile');
        if (mobileContainer) {
            mobileContainer.insertAdjacentElement('afterend', expandedElement);
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                if (expandedElement.parentNode) {
                    expandedElement.remove();
                }
            }, 3000);
        }
    }
}

// Make the function globally available
window.toggleContactInfo = toggleContactInfo;
window.addMember = addMember;
window.addPlayer = addPlayer;
window.switchTab = switchTab;
window.toggleAdminSignup = toggleAdminSignup;
window.resetAllData = resetAllData;
window.importTestData = importTestData;
window.viewTestDataInfo = viewTestDataInfo;
window.contactAdmin = contactAdmin;
window.closeMembershipModal = closeMembershipModal;

// Duplicate removed - function now defined at top of file

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SoccerApp();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoccerApp;
}