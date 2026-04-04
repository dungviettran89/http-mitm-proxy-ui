// Test Case 2: POST Request with JSON Body
const https = require('https');

console.log('Making POST request to Postman Echo...');

const postData = {
  test: 'data',
  timestamp: new Date().toISOString(),
  message: 'Hello from http-mitm-proxy-ui test client'
};

const options = {
  hostname: 'postman-echo.com',
  port: 443,
  path: '/post',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'http-mitm-proxy-ui-test-client/1.0',
    'Content-Length': Buffer.byteLength(JSON.stringify(postData))
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', data);
    console.log('POST request completed successfully!');
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(JSON.stringify(postData));
req.end();
