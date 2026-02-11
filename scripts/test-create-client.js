const http = require('http');

const data = JSON.stringify({
    nombre: 'Test Cliente',
    telefono: '11-1234-5678',
    direccion: 'Test 123',
    email: 'test@test.com',
    notas: 'Cliente de prueba'
});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/clientes',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`\n📡 Status Code: ${res.statusCode}\n`);

    let body = '';
    res.on('data', (chunk) => {
        body += chunk;
    });

    res.on('end', () => {
        console.log('Response:');
        try {
            console.log(JSON.stringify(JSON.parse(body), null, 2));
        } catch (e) {
            console.log(body);
        }
    });
});

req.on('error', (error) => {
    console.error('❌ Error:', error);
});

req.write(data);
req.end();
