# Server Management Scripts

This directory contains convenient scripts to manage both the backend and frontend servers for the Soccer Management application.

## 🖥️ For macOS/Linux Users

Use the `manage-servers.sh` script:

```bash
# Make the script executable (only needed once)
chmod +x scripts/manage-servers.sh

# Start both servers
./scripts/manage-servers.sh start

# Check server status
./scripts/manage-servers.sh status

# Stop both servers
./scripts/manage-servers.sh stop

# Restart both servers
./scripts/manage-servers.sh restart

# Show help
./scripts/manage-servers.sh help
```

## 🪟 For Windows Users

Use the `manage-servers.bat` script:

```cmd
# Start both servers
scripts\manage-servers.bat start

# Check server status
scripts\manage-servers.bat status

# Stop both servers
scripts\manage-servers.bat stop

# Restart both servers
scripts\manage-servers.bat restart

# Show help
scripts\manage-servers.bat help
```

## 🌐 Server Information

### Backend Server (Node.js)
- **Port:** 3000
- **URL:** http://localhost:3000
- **Health Check:** http://localhost:3000/api/health
- **File:** `server.js`

### Frontend Server (Python HTTP)
- **Port:** 8000  
- **URL:** http://localhost:8000
- **Serves:** Static HTML, CSS, JS files
- **Command:** `python3 -m http.server 8000`

## 📝 Log Files

When using the management scripts, server logs are saved to:
- `backend.log` - Node.js server output
- `frontend.log` - Python HTTP server output

## 🚀 Quick Start

1. **Start servers:**
   ```bash
   ./scripts/manage-servers.sh start
   ```

2. **Open your browser:**
   - Main app: http://localhost:8000
   - API health: http://localhost:3000/api/health

3. **Stop servers when done:**
   ```bash
   ./scripts/manage-servers.sh stop
   ```

## 🔧 Manual Commands

If you prefer to run servers manually:

```bash
# Backend (in one terminal)
node server.js

# Frontend (in another terminal)  
python3 -m http.server 8000
```

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Kill processes on ports 3000 and 8000
lsof -ti:3000,8000 | xargs kill -9

# Or use the stop command
./scripts/manage-servers.sh stop
```

### Check What's Running on Ports
```bash
# Check specific ports
lsof -i:3000
lsof -i:8000

# Or use the status command
./scripts/manage-servers.sh status
```

### Server Not Responding
1. Check the log files (`backend.log`, `frontend.log`)
2. Try restarting: `./scripts/manage-servers.sh restart`
3. Check for Node.js/Python installation issues

## 📱 Features

- ✅ **Colored output** for easy reading
- ✅ **Health checks** to verify servers are responding  
- ✅ **PID tracking** to manage specific processes
- ✅ **Log file creation** for debugging
- ✅ **Cross-platform** support (macOS/Linux/Windows)
- ✅ **Status monitoring** to check if servers are running
- ✅ **Safe restart** with proper shutdown sequence