const http = require('http');

function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, body: data }));
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function run() {
    try {
        const id = 'TEST_' + Date.now();
        const record = {
            id: id,
            fechaAlta: '2025-01-01',
            marca: 'Kia',
            nombre: 'Test',
            apellidos: 'Phone',
            telefono: '123456789',
            email: 'test@test.com',
            concesionario: 'Test Dealer',
            tipoAcceso: 'Tablet'
        };

        console.log('Creating record with telefono:', record.telefono);
        const createRes = await request({
            hostname: 'localhost', port: 3000, path: '/api/records', method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, JSON.stringify(record));
        console.log('Create Response:', createRes.statusCode, createRes.body);

        console.log('Fetching records...');
        const getRes = await request({
            hostname: 'localhost', port: 3000, path: '/api/records', method: 'GET'
        });

        const allRecords = JSON.parse(getRes.body);
        const myRecord = allRecords.find(r => r.id === id);

        if (myRecord) {
            console.log('Fetched Record:', myRecord);
            console.log('Telefono present?', 'telefono' in myRecord);
            console.log('Telefono value:', myRecord.telefono);
        } else {
            console.log('Record not found!');
        }

        // Cleanup
        await request({ hostname: 'localhost', port: 3000, path: '/api/records/' + id, method: 'DELETE' });

    } catch (e) {
        console.error(e);
    }
}

run();
