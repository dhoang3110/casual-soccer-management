// netlify/functions/signups.js
const fs = require('fs');

const SIGNUPS_FILE = '/tmp/signups.json';

function initializeSignupsFile() {
  if (!fs.existsSync(SIGNUPS_FILE)) {
    fs.writeFileSync(SIGNUPS_FILE, JSON.stringify({}));
  }
}

function readSignups() {
  initializeSignupsFile();
  const data = fs.readFileSync(SIGNUPS_FILE, 'utf8');
  return JSON.parse(data);
}

function writeSignups(signups) {
  fs.writeFileSync(SIGNUPS_FILE, JSON.stringify(signups, null, 2));
}

function getCurrentWeek() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil((((now - startOfYear) / 86400000) + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber}`;
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
    const method = event.httpMethod;
    const currentWeek = getCurrentWeek();

    switch (method) {
      case 'GET':
        // Get current week signups
        const signups = readSignups();
        const weekSignups = signups[currentWeek] || { players: [], isOpen: false };
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(weekSignups)
        };

      case 'POST':
        // Add player to signup
        const { playerId, action } = JSON.parse(event.body);
        const allSignups = readSignups();
        
        if (!allSignups[currentWeek]) {
          allSignups[currentWeek] = { players: [], isOpen: true };
        }

        if (action === 'add') {
          if (!allSignups[currentWeek].players.includes(playerId)) {
            allSignups[currentWeek].players.push(playerId);
          }
        } else if (action === 'remove') {
          allSignups[currentWeek].players = allSignups[currentWeek].players.filter(id => id !== playerId);
        }

        writeSignups(allSignups);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(allSignups[currentWeek])
        };

      case 'PUT':
        // Update signup settings (open/close)
        const { isOpen } = JSON.parse(event.body);
        const signupsToUpdate = readSignups();
        
        if (!signupsToUpdate[currentWeek]) {
          signupsToUpdate[currentWeek] = { players: [], isOpen: false };
        }
        
        signupsToUpdate[currentWeek].isOpen = isOpen;
        writeSignups(signupsToUpdate);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(signupsToUpdate[currentWeek])
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