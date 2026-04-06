// Test Case 3: Request with Custom Headers
const https = require('https');

console.log('Making request with custom headers to Postman Echo...');

const options = {
  hostname: 'postman-echo.com',
  port: 443,
  path: '/headers',
  method: 'GET',
  headers: {
    'User-Agent': 'http-mitm-proxy-ui-test-client/1.0',
    'X-Test-Header': 'test-value',
    'X-Client-Version': '1.0.0',
    'X-Request-ID': Math.random().toString(36).substring(2, 15)
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
    console.log('Headers request completed successfully!');
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.end();
