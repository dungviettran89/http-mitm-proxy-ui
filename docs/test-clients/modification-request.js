// Test Case 8: Request/Response Modification (Conceptual)
// Note: Actual modification requires UI-based breakpoints or programmatic proxy API
// This test demonstrates what we expect to see when modification works

const https = require('https');

console.log('Testing request that would be modified by breakpoint...');
console.log('NOTE: To test actual modification, set a breakpoint in the UI for this request');

const options = {
  hostname: 'postman-echo.com',
  port: 443,
  path: '/post',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'http-mitm-proxy-ui-test-client/1.0',
    'X-Original-Header': 'this-should-be-modified-or-removed'
  }
};

const postData = {
  originalField: 'this-value-may-be-changed',
  test: 'modification-test',
  timestamp: new Date().toISOString()
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response Body:', data);
    console.log('Modification test request completed!');
    console.log('Check UI to see if request was intercepted and possibly modified');
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(JSON.stringify(postData));
req.end();
