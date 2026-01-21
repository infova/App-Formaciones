// Migration script: SQLite to MySQL
// This script reads data from the existing SQLite database and imports it into MySQL

require('dotenv').config();
const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');
const path = require('path');

async function migrate() {
    console.log('Starting migration from SQLite to MySQL...\n');

    // Connect to SQLite
    const sqlitePath = path.join(__dirname, '..', 'app.db');
    console.log(`Reading from SQLite: ${sqlitePath}`);
    const sqlite = new Database(sqlitePath, { readonly: true });

    // Connect to MySQL
    console.log(`Connecting to MySQL: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
    const mysql_conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        // Migrate users
        console.log('\n--- Migrating users ---');
        const users = sqlite.prepare('SELECT * FROM users').all();
        console.log(`Found ${users.length} users`);

        for (const user of users) {
            let lastLogin = user.lastLogin;
            if (lastLogin && lastLogin.includes('T')) {
                lastLogin = lastLogin.replace('T', ' ').replace(/\..*$/, '');
            }

            await mysql_conn.query(`
                INSERT INTO users (id, username, password, role, brands, lastLogin)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                username=VALUES(username), password=VALUES(password), role=VALUES(role),
                brands=VALUES(brands), lastLogin=VALUES(lastLogin)
            `, [user.id, user.username, user.password, user.role, user.brands, lastLogin]);
        }
        console.log(`✓ Migrated ${users.length} users`);

        // Migrate clients
        console.log('\n--- Migrating clients ---');
        const clients = sqlite.prepare('SELECT * FROM clients').all();
        console.log(`Found ${clients.length} clients`);

        for (const client of clients) {
            await mysql_conn.query(`
                INSERT INTO clients (id, name)
                VALUES (?, ?)
                ON DUPLICATE KEY UPDATE name=VALUES(name)
            `, [client.id, client.name]);
        }
        console.log(`✓ Migrated ${clients.length} clients`);

        // Migrate records
        console.log('\n--- Migrating records ---');
        const records = sqlite.prepare('SELECT * FROM records').all();
        console.log(`Found ${records.length} records`);

        let count = 0;
        for (const record of records) {
            await mysql_conn.query(`
                INSERT INTO records (id, fechaAlta, marca, nombre, apellidos, email, telefono, concesionario, tipoAcceso, data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                fechaAlta=VALUES(fechaAlta), marca=VALUES(marca), nombre=VALUES(nombre),
                apellidos=VALUES(apellidos), email=VALUES(email), telefono=VALUES(telefono),
                concesionario=VALUES(concesionario), tipoAcceso=VALUES(tipoAcceso), data=VALUES(data)
            `, [
                record.id,
                record.fechaAlta,
                record.marca,
                record.nombre,
                record.apellidos,
                record.email,
                record.telefono || '',
                record.concesionario,
                record.tipoAcceso,
                record.data
            ]);
            count++;
            if (count % 50 === 0) {
                console.log(`  Progress: ${count}/${records.length} records`);
            }
        }
        console.log(`✓ Migrated ${records.length} records`);

        console.log('\n✅ Migration completed successfully!');
        console.log('\nSummary:');
        console.log(`  Users: ${users.length}`);
        console.log(`  Clients: ${clients.length}`);
        console.log(`  Records: ${records.length}`);

    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        throw error;
    } finally {
        sqlite.close();
        await mysql_conn.end();
    }
}

// Run migration
migrate().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
