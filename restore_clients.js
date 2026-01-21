const db = require('./server/database');

try {
    console.log('Checking clients table...');
    const count = db.prepare('SELECT count(*) as count FROM clients').get().count;
    console.log(`Current client count: ${count}`);

    if (count === 0) {
        console.log('Restoring default clients...');
        const insert = db.prepare('INSERT INTO clients (name) VALUES (?)');
        ['Kia', 'Hyundai', 'Kia Canarias'].forEach(c => {
            try {
                insert.run(c);
                console.log(`Restored: ${c}`);
            } catch (e) {
                console.log(`Skipped ${c}: ${e.message}`);
            }
        });
    } else {
        const rows = db.prepare('SELECT * FROM clients').all();
        console.log('Existing clients:', rows);
    }
} catch (e) {
    console.error('Error:', e);
}
