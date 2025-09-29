// js/database/DatabaseAdapter.js
export class DatabaseAdapter {
    constructor(config) {
        this.config = config;
        this.connection = null;
    }

    async connect() {
        // Implementation depends on database choice
        throw new Error('connect() must be implemented by subclass');
    }

    async disconnect() {
        throw new Error('disconnect() must be implemented by subclass');
    }

    // CRUD operations
    async create(collection, data) {
        throw new Error('create() must be implemented by subclass');
    }

    async read(collection, query = {}) {
        throw new Error('read() must be implemented by subclass');
    }

    async update(collection, query, data) {
        throw new Error('update() must be implemented by subclass');
    }

    async delete(collection, query) {
        throw new Error('delete() must be implemented by subclass');
    }
}

// File-based implementation (current)
export class FileSystemAdapter extends DatabaseAdapter {
    constructor(dataDir) {
        super({ dataDir });
        this.fs = require('fs').promises;
        this.path = require('path');
    }

    async read(collection) {
        try {
            const filePath = this.path.join(this.config.dataDir, `${collection}.json`);
            const data = await this.fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') return {};
            throw error;
        }
    }

    // ... implement other methods
}

// PostgreSQL implementation (future)
export class PostgreSQLAdapter extends DatabaseAdapter {
    constructor(config) {
        super(config);
        this.pool = null;
    }

    async connect() {
        const { Pool } = require('pg');
        this.pool = new Pool(this.config);
        await this.pool.query('SELECT NOW()'); // Test connection
    }

    async read(table, query = {}) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`SELECT * FROM ${table}`);
            return result.rows;
        } finally {
            client.release();
        }
    }

    // ... implement other methods
}

// Factory pattern for database creation
export class DatabaseFactory {
    static create(type, config) {
        switch (type) {
            case 'filesystem':
                return new FileSystemAdapter(config.dataDir);
            case 'postgresql':
                return new PostgreSQLAdapter(config);
            default:
                throw new Error(`Unsupported database type: ${type}`);
        }
    }
}