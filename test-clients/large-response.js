// Test Case 5: Large Response Handling
const https = require('https');

console.log('Making request for large response to Postman Echo...');

// Postman Echo will echo back whatever we send in the data field
// Let's send a large JSON object to get a large response back
const largeData = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  profile: {
    bio: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ',
    skills: ['JavaScript', 'TypeScript', 'Node.js', 'Express', 'Vue.js', 'React', 'Angular', 'HTML5', 'CSS3', 'SQL', 'MongoDB', 'PostgreSQL', 'AWS', 'Docker', 'Kubernetes'],
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zip: '12345',
      country: 'USA'
    },
    preferences: {
      newsletter: true,
      notifications: {
        email: true,
        sms: false,
        push: true
      },
      theme: 'dark',
      language: 'en-US'
    }
  },
  // Add some repetitive data to make it larger
  items: Array.from({length: 50}, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    description: `This is a detailed description for item number ${i + 1}. It contains various information about the item's properties, usage instructions, and related details. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
    price: Math.floor(Math.random() * 100) + 1,
    quantity: Math.floor(Math.random() * 10) + 1,
    tags: [`tag${i % 5}`, `category${Math.floor(i / 10)}`, `feature${i % 3}`],
    metadata: {
      created: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      updated: new Date().toISOString(),
      version: `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 100)}`
    }
  }))
};

const options = {
  hostname: 'postman-echo.com',
  port: 443,
  path: '/post',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'http-mitm-proxy-ui-test-client/1.0'
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Response Headers Received:', Object.keys(res.headers).length);
  
  let data = '';
  res.on('data', chunk => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`Response Body Length: ${data.length} characters`);
    console.log('Large response request completed successfully!');
    // Just show first and last 200 chars to avoid flooding console
    if (data.length > 400) {
      console.log('Response Preview:', data.substring(0, 200) + '...' + data.substring(data.length - 200));
    } else {
      console.log('Response Body:', data);
    }
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(JSON.stringify(largeData));
req.end();
