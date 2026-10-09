const http = require('http');

const data = JSON.stringify({
    amount: 1,
    referralId: "test",
    deviceKey: "test",
    employeeName: "test test",
    employeeTc: "11111111111"
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/odeal/basket',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, res => {
    console.log(`statusCode: ${res.statusCode}`);
    res.on('data', d => {
        process.stdout.write(d);
    });
});

req.on('error', error => {
    console.error(error);
});

req.write(data);
req.end();
