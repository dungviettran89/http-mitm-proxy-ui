// Test Case 6: Error Status Codes
const https = require('https');

console.log('Making request that should return 404 to Postman Echo...');

const options = {
  hostname: 'postman-echo.com',
  port: 443,
  path: '/status/404',  // This endpoint returns the specified status code
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
    console.log('Error request completed successfully!');
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.end();
