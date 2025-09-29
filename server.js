const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Ensure data directory exists
async function ensureDataDirectory() {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
}

// Helper functions for file operations
async function readJSONFile(filename) {
    try {
        const filePath = path.join(DATA_DIR, filename);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {}; // Return empty object if file doesn't exist
        }
        throw error;
    }
}

async function writeJSONFile(filename, data) {
    const filePath = path.join(DATA_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// API Routes

// Get all registered users
app.get('/api/users', async (req, res) => {
    try {
        const users = await readJSONFile('users.json');
        res.json(users);
    } catch (error) {
        console.error('Error reading users:', error);
        res.status(500).json({ error: 'Failed to read users' });
    }
});

// Reset all system data (admin only) - MUST be before parameterized routes
app.post('/api/users/reset', async (req, res) => {
    try {
        // Clear all users
        await writeJSONFile('users.json', {});
        console.log('✅ User data reset completed');
        
        // Clear all authorized members
        await writeJSONFile('members.json', {});
        console.log('✅ Members data reset completed');
        
        res.json({ 
            success: true, 
            message: 'All user data and authorized members have been reset' 
        });
    } catch (error) {
        console.error('Error resetting system data:', error);
        res.status(500).json({ error: 'Failed to reset system data' });
    }
});

// Save/Update a user
app.post('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userData = req.body;
        
        const users = await readJSONFile('users.json');
        
        // Check if this is a Google user that matches an existing member and needs integration
        if (userData.provider === 'google' && userData.email) {
            try {
                const members = await readJSONFile('members.json');
                const matchingMember = members[userData.email];
                const existingUser = users[userId];
                
                if (matchingMember) {
                    // Always integrate member data if user is missing essential fields OR this is a new user
                    const needsIntegration = !existingUser || !existingUser.name || !existingUser.skillLevel;
                    
                    if (needsIntegration) {
                        console.log(`🔗 Auto-integrating member data for: ${userData.email} (new: ${!existingUser}, missing data: ${!existingUser?.name || !existingUser?.skillLevel})`);
                        
                        // Merge member data with user data
                        userData.name = matchingMember.name;
                        userData.skillLevel = matchingMember.skillLevel;
                        userData.skillInfo = matchingMember.skillInfo;
                        userData.positions = matchingMember.positions;
                        
                        console.log(`✅ Integrated member data: ${matchingMember.name}, skill: ${matchingMember.skillLevel}, positions: ${matchingMember.positions?.join(', ')}`);
                    } else {
                        // User already has member data - preserve it even if frontend didn't send it
                        if (!userData.name && existingUser.name) {
                            userData.name = existingUser.name;
                        }
                        if (!userData.skillLevel && existingUser.skillLevel) {
                            userData.skillLevel = existingUser.skillLevel;
                            userData.skillInfo = existingUser.skillInfo;
                        }
                        if (!userData.positions && existingUser.positions) {
                            userData.positions = existingUser.positions;
                        }
                        console.log(`ℹ️ Preserved existing member data for ${userData.email}: ${existingUser.name}`);
                    }

                    // Update member status to activated if this is a successful login
                    if (matchingMember.status !== 'activated') {
                        try {
                            const members = await readJSONFile('members.json');
                            if (members[userData.email]) {
                                const now = new Date().toISOString();
                                members[userData.email].status = 'activated';
                                members[userData.email].profileComplete = true;
                                members[userData.email].isProfileComplete = true;
                                members[userData.email].lastActive = Date.now();
                                
                                // Set first login date if not already set
                                if (!members[userData.email].firstLoginDate) {
                                    members[userData.email].firstLoginDate = now;
                                }
                                members[userData.email].lastLoginDate = now;
                                
                                await writeJSONFile('members.json', members);
                                console.log(`✅ Updated member status to activated: ${userData.email}`);
                            }
                        } catch (memberUpdateError) {
                            console.warn('Could not update member status:', memberUpdateError);
                        }
                    }
                }
            } catch (memberError) {
                console.warn('Could not load members for integration:', memberError);
            }
        }
        
        users[userId] = {
            ...userData,
            lastActive: Date.now()
        };
        
        await writeJSONFile('users.json', users);
        res.json({ success: true, user: users[userId] });
    } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).json({ error: 'Failed to save user' });
    }
});

// Delete a user
app.delete('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const users = await readJSONFile('users.json');
        
        if (!users[userId]) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        delete users[userId];
        
        await writeJSONFile('users.json', users);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Get global players
app.get('/api/players', async (req, res) => {
    try {
        const players = await readJSONFile('players.json');
        res.json(players);
    } catch (error) {
        console.error('Error reading players:', error);
        res.status(500).json({ error: 'Failed to read players' });
    }
});

// Save global players
app.post('/api/players', async (req, res) => {
    try {
        const players = req.body;
        await writeJSONFile('players.json', players);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving players:', error);
        res.status(500).json({ error: 'Failed to save players' });
    }
});

// Get signups
app.get('/api/signups', async (req, res) => {
    try {
        const signups = await readJSONFile('signups.json');
        res.json(signups);
    } catch (error) {
        console.error('Error reading signups:', error);
        res.status(500).json({ error: 'Failed to read signups' });
    }
});

// Save signups (for admin bulk operations)
app.post('/api/signups', async (req, res) => {
    try {
        const signups = req.body;
        await writeJSONFile('signups.json', signups);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving signups:', error);
        res.status(500).json({ error: 'Failed to save signups' });
    }
});

// Toggle individual user signup (add/remove from specific week)
app.post('/api/signups/:week/toggle/:playerId', async (req, res) => {
    try {
        const { week, playerId } = req.params;
        const userId = req.headers['x-user-id'] || 'unknown';
        
        // Security: Users can only modify their own signups (unless admin)
        const isAdmin = req.headers['x-user-role'] === 'administrator';
        if (!isAdmin && !playerId.includes(userId)) {
            return res.status(403).json({ error: 'Not authorized to modify this signup' });
        }
        
        // Get existing signups
        const existingSignups = await readJSONFile('signups.json');
        
        if (!existingSignups[week]) {
            existingSignups[week] = [];
        }
        
        const signupIndex = existingSignups[week].indexOf(playerId);
        
        if (signupIndex === -1) {
            // Add to signup
            existingSignups[week].push(playerId);
            console.log(`Added ${playerId} to signups for week ${week}`);
        } else {
            // Remove from signup
            existingSignups[week].splice(signupIndex, 1);
            console.log(`Removed ${playerId} from signups for week ${week}`);
        }
        
        await writeJSONFile('signups.json', existingSignups);
        res.json({ 
            success: true, 
            signups: existingSignups,
            action: signupIndex === -1 ? 'added' : 'removed',
            week,
            playerId
        });
    } catch (error) {
        console.error('Error toggling signup:', error);
        res.status(500).json({ error: 'Failed to toggle signup' });
    }
});

// Get signup settings (admin controls)
app.get('/api/signup-settings', async (req, res) => {
    try {
        const settings = await readJSONFile('signup-settings.json');
        res.json(settings);
    } catch (error) {
        console.error('Error reading signup settings:', error);
        res.status(500).json({ error: 'Failed to read signup settings' });
    }
});

// Save signup settings
app.post('/api/signup-settings', async (req, res) => {
    try {
        const settings = req.body;
        await writeJSONFile('signup-settings.json', settings);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving signup settings:', error);
        res.status(500).json({ error: 'Failed to save signup settings' });
    }
});

// Members Management API

// Get all authorized members
app.get('/api/members', async (req, res) => {
    try {
        const members = await readJSONFile('members.json');
        res.json(members);
    } catch (error) {
        console.error('Error reading members:', error);
        res.status(500).json({ error: 'Failed to read members' });
    }
});

// Add new authorized member
app.post('/api/members', async (req, res) => {
    try {
        const { email, name, addedBy, skillLevel, skillInfo, positions } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Validate Gmail address
        if (!email.toLowerCase().includes('@gmail.com')) {
            return res.status(400).json({ error: 'Only Gmail addresses are allowed' });
        }

        const members = await readJSONFile('members.json');
        const normalizedEmail = email.toLowerCase().trim();

        // Check if member already exists
        if (members[normalizedEmail]) {
            return res.status(400).json({ error: 'Member already exists' });
        }

        // Add new member with unified structure
        members[normalizedEmail] = {
            id: `google_${normalizedEmail}`,
            email: normalizedEmail,
            name: name || '',
            provider: 'google',
            skillLevel: skillLevel || 'average',
            skillInfo: skillInfo || { label: 'Average', points: 2 },
            positions: positions || ['midfielder'],
            addedBy: addedBy || 'admin',
            dateAdded: new Date().toISOString(),
            status: 'not_activated',
            firstLoginDate: null,
            lastLoginDate: null,
            profileComplete: false,
            lastActive: null,
            isProfileComplete: false,
            sessionActive: false,
            picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Member')}&background=28a745&color=fff&bold=true`
        };

        await writeJSONFile('members.json', members);
        console.log(`✅ New member added: ${normalizedEmail}`);
        
        res.json({ success: true, member: members[normalizedEmail] });
    } catch (error) {
        console.error('Error adding member:', error);
        res.status(500).json({ error: 'Failed to add member' });
    }
});

// Remove authorized member
app.delete('/api/members/:email', async (req, res) => {
    try {
        const email = decodeURIComponent(req.params.email).toLowerCase().trim();
        const members = await readJSONFile('members.json');

        if (!members[email]) {
            return res.status(404).json({ error: 'Member not found' });
        }

        delete members[email];
        await writeJSONFile('members.json', members);
        console.log(`✅ Member removed: ${email}`);
        
        // Return success with the removed email for client-side session invalidation
        res.json({ 
            success: true, 
            removedEmail: email,
            message: 'Member removed successfully'
        });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// Debug endpoint to test member integration
app.get('/api/debug/member-integration/:email', async (req, res) => {
    try {
        const { email } = req.params;
        console.log(`🔍 Debug: Testing member integration for ${email}`);
        
        const members = await readJSONFile('members.json');
        const matchingMember = members[email];
        
        if (matchingMember) {
            console.log(`✅ Found member data:`, matchingMember);
            res.json({
                success: true,
                memberFound: true,
                memberData: matchingMember
            });
        } else {
            console.log(`❌ No member found for ${email}`);
            console.log(`Available members:`, Object.keys(members));
            res.json({
                success: true,
                memberFound: false,
                availableMembers: Object.keys(members)
            });
        }
    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Import test dataset
app.post('/api/import-test-data', async (req, res) => {
    try {
        console.log('🧪 Importing test dataset...');
        
        // Read the test dataset
        const testData = await readJSONFile('test-dataset.json');
        
        // Import members (preserve admin users)
        const currentMembers = await readJSONFile('members.json');
        const updatedMembers = { ...testData.members };
        await writeJSONFile('members.json', updatedMembers);
        console.log(`✅ Imported ${Object.keys(testData.members).length} test members`);
        
        // Import users (preserve admin users)
        const currentUsers = await readJSONFile('users.json');
        const adminUsers = {};
        Object.keys(currentUsers).forEach(key => {
            if (currentUsers[key].role === 'administrator' || currentUsers[key].provider === 'admin' && currentUsers[key].email.includes('soccermanager.local')) {
                adminUsers[key] = currentUsers[key];
            }
        });
        
        const updatedUsers = { ...adminUsers, ...testData.users };
        await writeJSONFile('users.json', updatedUsers);
        console.log(`✅ Imported ${Object.keys(testData.users).length} test users (preserved ${Object.keys(adminUsers).length} admin users)`);
        
        // Import signups
        const currentSignups = await readJSONFile('signups.json');
        const updatedSignups = { ...currentSignups, ...testData.signups };
        await writeJSONFile('signups.json', updatedSignups);
        console.log(`✅ Imported ${Object.keys(testData.signups).length} test signup weeks`);
        
        res.json({
            success: true,
            imported: {
                members: Object.keys(testData.members).length,
                users: Object.keys(testData.users).length,
                signupWeeks: Object.keys(testData.signups).length,
                preservedAdmins: Object.keys(adminUsers).length
            }
        });
        
    } catch (error) {
        console.error('Error importing test data:', error);
        res.status(500).json({ error: 'Failed to import test data', details: error.message });
    }
});

// Get test dataset info
app.get('/api/test-data-info', async (req, res) => {
    try {
        const testData = await readJSONFile('test-dataset.json');
        
        const membersList = Object.keys(testData.members).map(email => ({
            email,
            name: testData.members[email].name,
            skillLevel: testData.members[email].skillLevel,
            status: testData.members[email].status,
            positions: testData.members[email].positions
        }));
        
        const usersList = Object.keys(testData.users).map(id => ({
            id,
            name: testData.users[id].name,
            email: testData.users[id].email,
            provider: testData.users[id].provider,
            skillLevel: testData.users[id].skillLevel
        }));
        
        res.json({
            success: true,
            testData: {
                members: membersList,
                users: usersList,
                signupWeeks: Object.keys(testData.signups),
                totalMembers: membersList.length,
                totalUsers: usersList.length,
                totalSignupWeeks: Object.keys(testData.signups).length
            }
        });
        
    } catch (error) {
        console.error('Error getting test data info:', error);
        res.status(500).json({ error: 'Failed to get test data info' });
    }
});

// Data version configuration for client localStorage management
app.get('/api/config/data-version', async (req, res) => {
    try {
        // Read current data version configuration
        let versionConfig = await readJSONFile('data-version-config.json');
        
        // Default configuration if file doesn't exist
        if (!versionConfig || Object.keys(versionConfig).length === 0) {
            versionConfig = {
                version: '2025.9.28.1',
                requiresClear: false,
                reason: 'version update',
                lastUpdated: new Date().toISOString()
            };
        }
        
        res.json(versionConfig);
    } catch (error) {
        console.error('Error getting data version config:', error);
        res.status(500).json({ error: 'Failed to get data version config' });
    }
});

// Set data version configuration (for admin-triggered resets)
app.post('/api/config/data-version', async (req, res) => {
    try {
        const { version, requiresClear, reason } = req.body;
        
        if (!version) {
            return res.status(400).json({ error: 'Version is required' });
        }
        
        const versionConfig = {
            version: version,
            requiresClear: requiresClear || false,
            reason: reason || 'admin data reset',
            lastUpdated: new Date().toISOString()
        };
        
        await writeJSONFile('data-version-config.json', versionConfig);
        
        console.log(`📱 Data version config updated:`, versionConfig);
        
        res.json({ 
            success: true, 
            message: 'Data version configuration updated',
            config: versionConfig
        });
    } catch (error) {
        console.error('Error updating data version config:', error);
        res.status(500).json({ error: 'Failed to update data version config' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
async function startServer() {
    await ensureDataDirectory();
    app.listen(PORT, () => {
        console.log(`🚀 Soccer Management Server running on http://localhost:${PORT}`);
        console.log(`📁 Data directory: ${DATA_DIR}`);
        console.log(`🌐 Frontend: http://localhost:${PORT}`);
        console.log(`🔌 API Health: http://localhost:${PORT}/api/health`);
    });
}

startServer().catch(console.error);