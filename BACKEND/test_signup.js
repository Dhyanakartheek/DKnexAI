const http = require('http');

const data = JSON.stringify({
  username: "testuser2",
  email: "test2@test.com",
  password: "password123"
});

const options = {
  hostname: 'localhost',
  port: 8080,
  path: '/api/auth/signup',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', res.statusCode, body));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
