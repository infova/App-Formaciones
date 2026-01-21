require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// Create connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'formaciones_db',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize database tables
async function initializeDatabase() {
  // First, connect without a database selection to ensure the DB exists
  const connectionForCreate = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306
  });

  try {
    const dbName = process.env.DB_NAME || 'formaciones_db';
    await connectionForCreate.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database '${dbName}' verified/created`);
  } catch (err) {
    console.error('Error creating database:', err);
  } finally {
    await connectionForCreate.end();
  }

  const connection = await pool.getConnection();

  try {
    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        brands VARCHAR(255) DEFAULT 'All',
        lastLogin DATETIME
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create records table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS records (
        id VARCHAR(255) PRIMARY KEY,
        fechaAlta VARCHAR(255),
        marca VARCHAR(255),
        nombre VARCHAR(255),
        apellidos VARCHAR(255),
        email VARCHAR(255),
        telefono VARCHAR(255),
        concesionario VARCHAR(255),
        tipoAcceso VARCHAR(255),
        data TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Create clients table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Initialize default clients
    const [clientRows] = await connection.query('SELECT COUNT(*) as count FROM clients');
    if (clientRows[0].count === 0) {
      const clients = ['Kia', 'Hyundai', 'Kia Canarias'];
      for (const client of clients) {
        await connection.query('INSERT INTO clients (name) VALUES (?)', [client]);
      }
      console.log('Default clients created');
    }

    // Create default admin user if not exists
    const [userRows] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (userRows[0].count === 0) {
      console.log('Creating default admin user...');
      const hash = bcrypt.hashSync('admin123', 10);
      await connection.query(
        'INSERT INTO users (username, password, role, brands) VALUES (?, ?, ?, ?)',
        ['admin', hash, 'admin', 'All']
      );
      console.log('Default user created: admin / admin123');
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Initialize on module load
initializeDatabase().catch(err => {
  console.error('Failed to initialize database (Server still running for debug):', err);
});

module.exports = pool;
