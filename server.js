require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./server/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// --- AUTH ROUTES ---

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        const user = rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        const match = bcrypt.compareSync(password, user.password);
        if (match) {
            // Update last login
            const now = new Date();
            await db.query('UPDATE users SET lastLogin = ? WHERE id = ?', [now, user.id]);

            // Return user info sans password
            const { password, ...userInfo } = user;
            userInfo.lastLogin = now.toISOString();
            res.json({ success: true, user: userInfo });
        } else {
            res.status(401).json({ error: 'Contraseña incorrecta' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// --- DATA ROUTES ---

app.get('/api/records', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT data FROM records');
        const data = rows.map(r => JSON.parse(r.data));
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener datos' });
    }
});

app.post('/api/records', async (req, res) => {
    const record = req.body;
    try {
        await db.query(`
            INSERT INTO records (id, fechaAlta, marca, nombre, apellidos, email, telefono, concesionario, tipoAcceso, data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            JSON.stringify(record)
        ]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al guardar' });
    }
});

app.put('/api/records/:id', async (req, res) => {
    const { id } = req.params;
    const record = req.body;
    try {
        await db.query(`
            UPDATE records 
            SET fechaAlta=?, marca=?, nombre=?, apellidos=?, email=?, telefono=?, concesionario=?, tipoAcceso=?, data=?
            WHERE id=?
        `, [
            record.fechaAlta,
            record.marca,
            record.nombre,
            record.apellidos,
            record.email,
            record.telefono || '',
            record.concesionario,
            record.tipoAcceso,
            JSON.stringify(record),
            id
        ]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar' });
    }
});

app.delete('/api/records/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM records WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

// --- CLIENT MANAGEMENT ROUTES ---

app.get('/api/clients', async (req, res) => {
    try {
        const [clients] = await db.query('SELECT * FROM clients');
        res.json(clients);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
});

app.post('/api/clients', async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nombre obligatorio' });
    try {
        await db.query('INSERT INTO clients (name) VALUES (?)', [name]);
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El cliente ya existe' });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al crear cliente' });
    }
});

app.put('/api/clients/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        await db.query('UPDATE clients SET name = ? WHERE id = ?', [name, id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar cliente' });
    }
});

app.delete('/api/clients/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM clients WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar cliente' });
    }
});

// --- USER MANAGEMENT ROUTES ---

app.get('/api/users', async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, username, role, brands, lastLogin FROM users');
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

app.post('/api/users', async (req, res) => {
    const { username, password, role, brands } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Faltan datos' });

    try {
        const hash = bcrypt.hashSync(password, 10);
        await db.query(
            'INSERT INTO users (username, password, role, brands) VALUES (?, ?, ?, ?)',
            [username, hash, role || 'user', brands || 'All']
        );
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }
        console.error(err);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { password, role, brands } = req.body;

    try {
        if (password) {
            const hash = bcrypt.hashSync(password, 10);
            await db.query(
                'UPDATE users SET password = ?, role = ?, brands = ? WHERE id = ?',
                [hash, role || 'user', brands || 'All', id]
            );
        } else {
            await db.query(
                'UPDATE users SET role = ?, brands = ? WHERE id = ?',
                [role || 'user', brands || 'All', id]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar usuario' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar usuario' });
    }
});

// --- MIGRATION ROUTE ---
app.post('/api/migrate', async (req, res) => {
    const records = req.body;
    if (!Array.isArray(records)) return res.status(400).json({ error: 'Invalid data format' });

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        for (const item of records) {
            await connection.query(`
                INSERT INTO records (id, fechaAlta, marca, nombre, apellidos, email, telefono, concesionario, tipoAcceso, data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                fechaAlta=VALUES(fechaAlta), marca=VALUES(marca), nombre=VALUES(nombre),
                apellidos=VALUES(apellidos), email=VALUES(email), telefono=VALUES(telefono),
                concesionario=VALUES(concesionario), tipoAcceso=VALUES(tipoAcceso), data=VALUES(data)
            `, [
                item.id,
                item.fechaAlta,
                item.marca,
                item.nombre,
                item.apellidos,
                item.email,
                item.telefono || '',
                item.concesionario,
                item.tipoAcceso,
                JSON.stringify(item)
            ]);
        }

        await connection.commit();
        res.json({ success: true, count: records.length });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Migration failed' });
    } finally {
        connection.release();
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
