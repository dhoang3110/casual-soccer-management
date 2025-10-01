// netlify/functions/signups.js

// In-memory storage for signups
let signupsData = {};

function getCurrentWeek() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function initializeSignupsData() {
  const currentWeek = getCurrentWeek();
  if (!signupsData[currentWeek]) {
    signupsData[currentWeek] = { 
      players: [], 
      isOpen: true,
      date: currentWeek
    };
  }
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    initializeSignupsData();
    const method = event.httpMethod;
    const currentWeek = getCurrentWeek();

    switch (method) {
      case 'GET':
        // Get current week signups
        const weekSignups = signupsData[currentWeek] || { 
          players: [], 
          isOpen: true,
          date: currentWeek
        };
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(weekSignups)
        };

      case 'POST':
        // Add player to signup
        const { playerId, action } = JSON.parse(event.body);
        
        if (!signupsData[currentWeek]) {
          signupsData[currentWeek] = { 
            players: [], 
            isOpen: true,
            date: currentWeek
          };
        }

        if (action === 'add') {
          if (!signupsData[currentWeek].players.includes(playerId)) {
            signupsData[currentWeek].players.push(playerId);
          }
        } else if (action === 'remove') {
          signupsData[currentWeek].players = signupsData[currentWeek].players.filter(id => id !== playerId);
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(signupsData[currentWeek])
        };

      case 'PUT':
        // Update signup settings (open/close)
        const { isOpen } = JSON.parse(event.body);
        
        if (!signupsData[currentWeek]) {
          signupsData[currentWeek] = { 
            players: [], 
            isOpen: false,
            date: currentWeek
          };
        }
        
        signupsData[currentWeek].isOpen = isOpen;
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(signupsData[currentWeek])
        };

      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }
  } catch (error) {
    console.error('Error in signups function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};