// Test Case 1: Basic GET Request Logging
const https = require('https');

console.log('Making GET request to Postman Echo...');

const options = {
  hostname: 'postman-echo.com',
  port: 443,
  path: '/get',
  method: 'GET',
  headers: {
    'User-Agent': 'http-mitm-proxy-ui-test-client/1.0'
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
    console.log('GET request completed successfully!');
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.end();
