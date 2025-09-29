#!/bin/bash

# Soccer Management Server Management Script
# Usage: ./manage-servers.sh [start|stop|restart|status]

BACKEND_PORT=3000
FRONTEND_PORT=8000
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -ti:$port >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to get PID of process on port
get_pid() {
    local port=$1
    lsof -ti:$port 2>/dev/null
}

# Function to stop servers
stop_servers() {
    print_status "Stopping servers..."
    
    # Stop backend server (Node.js on port 3000)
    if check_port $BACKEND_PORT; then
        backend_pid=$(get_pid $BACKEND_PORT)
        print_status "Stopping backend server (PID: $backend_pid)..."
        kill -9 $backend_pid 2>/dev/null
        sleep 1
        if ! check_port $BACKEND_PORT; then
            print_success "Backend server stopped"
        else
            print_error "Failed to stop backend server"
        fi
    else
        print_warning "Backend server is not running"
    fi
    
    # Stop frontend server (Python HTTP server on port 8000)
    if check_port $FRONTEND_PORT; then
        frontend_pid=$(get_pid $FRONTEND_PORT)
        print_status "Stopping frontend server (PID: $frontend_pid)..."
        kill -9 $frontend_pid 2>/dev/null
        sleep 1
        if ! check_port $FRONTEND_PORT; then
            print_success "Frontend server stopped"
        else
            print_error "Failed to stop frontend server"
        fi
    else
        print_warning "Frontend server is not running"
    fi
}

# Function to start servers
start_servers() {
    print_status "Starting servers..."
    
    # Check if ports are already in use
    if check_port $BACKEND_PORT; then
        print_warning "Backend port $BACKEND_PORT is already in use"
    else
        # Start backend server (Node.js)
        print_status "Starting backend server on port $BACKEND_PORT..."
        cd "$PROJECT_DIR"
        nohup node server.js > backend.log 2>&1 &
        backend_pid=$!
        sleep 2
        if check_port $BACKEND_PORT; then
            print_success "Backend server started (PID: $backend_pid)"
            echo "  URL: http://localhost:$BACKEND_PORT"
            echo "  Health: http://localhost:$BACKEND_PORT/api/health"
        else
            print_error "Failed to start backend server"
            echo "Check backend.log for errors"
        fi
    fi
    
    if check_port $FRONTEND_PORT; then
        print_warning "Frontend port $FRONTEND_PORT is already in use"
    else
        # Start frontend server (Python HTTP)
        print_status "Starting frontend server on port $FRONTEND_PORT..."
        cd "$PROJECT_DIR"
        nohup python3 -m http.server $FRONTEND_PORT > frontend.log 2>&1 &
        frontend_pid=$!
        sleep 2
        if check_port $FRONTEND_PORT; then
            print_success "Frontend server started (PID: $frontend_pid)"
            echo "  URL: http://localhost:$FRONTEND_PORT"
        else
            print_error "Failed to start frontend server"
            echo "Check frontend.log for errors"
        fi
    fi
}

# Function to check server status
check_status() {
    print_status "Checking server status..."
    
    # Check backend server
    if check_port $BACKEND_PORT; then
        backend_pid=$(get_pid $BACKEND_PORT)
        print_success "Backend server is running (PID: $backend_pid)"
        echo "  Port: $BACKEND_PORT"
        echo "  URL: http://localhost:$BACKEND_PORT"
        
        # Test backend health
        if curl -s http://localhost:$BACKEND_PORT/api/health >/dev/null 2>&1; then
            print_success "Backend server is responding"
        else
            print_warning "Backend server is running but not responding"
        fi
    else
        print_error "Backend server is not running"
    fi
    
    echo ""
    
    # Check frontend server
    if check_port $FRONTEND_PORT; then
        frontend_pid=$(get_pid $FRONTEND_PORT)
        print_success "Frontend server is running (PID: $frontend_pid)"
        echo "  Port: $FRONTEND_PORT"
        echo "  URL: http://localhost:$FRONTEND_PORT"
        
        # Test frontend
        if curl -I http://localhost:$FRONTEND_PORT >/dev/null 2>&1; then
            print_success "Frontend server is responding"
        else
            print_warning "Frontend server is running but not responding"
        fi
    else
        print_error "Frontend server is not running"
    fi
}

# Function to restart servers
restart_servers() {
    print_status "Restarting servers..."
    stop_servers
    sleep 2
    start_servers
}

# Function to show usage
show_usage() {
    echo "Soccer Management Server Management Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start    - Start both backend and frontend servers"
    echo "  stop     - Stop both servers"
    echo "  restart  - Stop and start both servers"
    echo "  status   - Check server status"
    echo "  help     - Show this help message"
    echo ""
    echo "Servers:"
    echo "  Backend:  Node.js server on port $BACKEND_PORT"
    echo "  Frontend: Python HTTP server on port $FRONTEND_PORT"
    echo ""
    echo "Examples:"
    echo "  $0 start     # Start both servers"
    echo "  $0 stop      # Stop both servers"
    echo "  $0 status    # Check if servers are running"
    echo ""
}

# Main script logic
case "${1:-}" in
    "start")
        start_servers
        ;;
    "stop")
        stop_servers
        ;;
    "restart")
        restart_servers
        ;;
    "status")
        check_status
        ;;
    "help"|"-h"|"--help")
        show_usage
        ;;
    "")
        print_error "No command specified"
        echo ""
        show_usage
        exit 1
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac