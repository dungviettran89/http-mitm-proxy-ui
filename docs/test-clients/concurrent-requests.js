// Test Case 7: Concurrent Requests
const https = require('https');

console.log('Making 5 concurrent requests to Postman Echo...');

const requests = [
  { path: '/get', method: 'GET', data: null },
  { path: '/post', method: 'POST', data: { test: 'concurrent1' } },
  { path: '/put', method: 'PUT', data: { test: 'concurrent2' } },
  { path: '/patch', method: 'PATCH', data: { test: 'concurrent3' } },
  { path: '/delete', method: 'DELETE', data: null }
];

let completed = 0;

requests.forEach((reqConfig, index) => {
  const options = {
    hostname: 'postman-echo.com',
    port: 443,
    path: reqConfig.path,
    method: reqConfig.method,
    headers: {
      'User-Agent': `http-mitm-proxy-ui-test-client/1.0-${index + 1}`,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    console.log(`[Request ${index + 1}] Status Code: ${res.statusCode}`);
    
    let data = '';
    res.on('data', chunk => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`[Request ${index + 1}] Completed`);
      completed++;
      if (completed === requests.length) {
        console.log('All concurrent requests completed successfully!');
      }
    });
  });

  req.on('error', error => {
    console.error(`[Request ${index + 1}] Error:`, error);
    completed++;
    if (completed === requests.length) {
      console.log('All concurrent requests completed (with errors)!');
    }
  });

  if (reqConfig.data) {
    req.write(JSON.stringify(reqConfig.data));
  }
  req.end();
});
