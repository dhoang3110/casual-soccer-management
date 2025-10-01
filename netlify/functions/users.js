// netlify/functions/users.js
const fs = require('fs');
const path = require('path');

// Simple file-based storage (for small apps)
const USERS_FILE = '/tmp/users.json';

// Initialize users file if it doesn't exist
function initializeUsersFile() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({}));
  }
}

// Read users from file
function readUsers() {
  initializeUsersFile();
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(data);
}

// Write users to file
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const method = event.httpMethod;
    const path = event.path;

    switch (method) {
      case 'GET':
        // Get all users
        const users = readUsers();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(users)
        };

      case 'POST':
        // Add/update user
        const newUser = JSON.parse(event.body);
        const allUsers = readUsers();
        allUsers[newUser.id] = newUser;
        writeUsers(allUsers);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(newUser)
        };

      case 'PUT':
        // Update user
        const userData = JSON.parse(event.body);
        const userId = event.queryStringParameters?.id;
        
        if (!userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'User ID required' })
          };
        }

        const users = readUsers();
        if (users[userId]) {
          users[userId] = { ...users[userId], ...userData };
          writeUsers(users);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(users[userId])
          };
        } else {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'User not found' })
          };
        }

      case 'DELETE':
        // Delete user
        const deleteUserId = event.queryStringParameters?.id;
        
        if (!deleteUserId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'User ID required' })
          };
        }

        const usersToUpdate = readUsers();
        delete usersToUpdate[deleteUserId];
        writeUsers(usersToUpdate);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'User deleted' })
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};