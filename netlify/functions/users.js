// netlify/functions/users.js

// For now, we'll use a simple in-memory storage
// In production, you'd want to use a proper database like Fauna, Supabase, or Firebase

let usersData = {};

// Initialize with some default data if empty
function initializeUsersData() {
  if (Object.keys(usersData).length === 0) {
    // Load from your existing users.json data structure
    usersData = {
      "google_donghoangngoc@gmail.com": {
        "id": "google_donghoangngoc@gmail.com",
        "googleId": "google_donghoangngoc@gmail.com",
        "email": "donghoangngoc@gmail.com",
        "picture": "https://lh3.googleusercontent.com/a/ACg8ocI6QO5j7RqypSUUHw6A_NXzG-FtqrMEF64I9uOzDgUvOGQSGijF=s96-c",
        "provider": "google",
        "lastActive": Date.now(),
        "isProfileComplete": true,
        "name": "Dong Hoang",
        "skillLevel": "average",
        "skillInfo": {
          "label": "Average",
          "points": 2,
          "description": "Decent player, some experience"
        },
        "positions": ["any"],
        "sessionActive": false
      }
    };
  }
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
    initializeUsersData();
    const method = event.httpMethod;

    switch (method) {
      case 'GET':
        // Get all users
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(usersData)
        };

      case 'POST':
        // Add/update user
        const newUser = JSON.parse(event.body);
        usersData[newUser.id] = newUser;
        
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

        if (usersData[userId]) {
          usersData[userId] = { ...usersData[userId], ...userData };
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(usersData[userId])
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

        delete usersData[deleteUserId];
        
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