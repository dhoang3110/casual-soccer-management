// js/core/StateManager.js
export class StateManager {
    constructor() {
        this.state = {
            user: null,
            players: [],
            signups: {},
            currentWeek: '',
            isLoading: false,
            errors: []
        };
        
        this.subscribers = new Map();
        this.middleware = [];
    }

    // Subscribe to state changes
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            this.subscribers.get(key)?.delete(callback);
        };
    }

    // Update state and notify subscribers
    setState(updates) {
        const previousState = { ...this.state };
        
        // Apply middleware
        const action = { type: 'STATE_UPDATE', payload: updates, previousState };
        const processedAction = this.middleware.reduce((acc, middleware) => 
            middleware(acc, this.state), action
        );

        // Update state
        this.state = { ...this.state, ...processedAction.payload };

        // Notify subscribers
        Object.keys(updates).forEach(key => {
            this.subscribers.get(key)?.forEach(callback => 
                callback(this.state[key], previousState[key])
            );
        });
    }

    getState() {
        return { ...this.state };
    }

    // Add middleware for logging, validation, etc.
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }
}

// Export singleton instance
export const stateManager = new StateManager();

// Middleware examples
export const loggingMiddleware = (action, state) => {
    console.log('State Update:', action.type, action.payload);
    return action;
};

export const validationMiddleware = (action, state) => {
    // Add validation logic here
    return action;
};