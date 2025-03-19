const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Default port
const PORT = process.env.PORT || 3001;

// MIME types
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// Create server
const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Parse URL
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Normalize pathname
  pathname = pathname === '/' ? '/index.html' : pathname;
  
  // Map pathname to file path
  const filePath = path.join(process.cwd(), 'public', pathname);
  
  // Get file extension
  const ext = path.extname(filePath);
  
  // Set content type
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  
  // Read file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // If file not found, check if it's widget.html
      if (pathname === '/widget.html') {
        // Create a simple widget test page
        const widgetHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Widget Test</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
  </style>
</head>
<body>
  <h1>Widget Test Page</h1>
  <div id="widget-container"></div>
  <script src="/widget.js"></script>
</body>
</html>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(widgetHtml);
        return;
      }
      
      // If file not found, check if it's auth-test.html
      if (pathname === '/auth-test.html') {
        // Create a simple auth test page
        const authTestHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auth Test</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      margin: 0;
      padding: 20px;
    }
    .test-section {
      background-color: white;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    button {
      background-color: #4CAF50;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #45a049;
    }
  </style>
</head>
<body>
  <h1>Auth Test Page</h1>
  
  <div class="test-section">
    <h2>Widget Test</h2>
    <p>Test the widget functionality:</p>
    <div id="widget-container"></div>
  </div>
  
  <div class="test-section">
    <h2>Manual Tests</h2>
    <p>Use these buttons to test specific functionality:</p>
    <button id="test-phone">Test Phone Input</button>
    <button id="test-otp">Test OTP Verification</button>
    <button id="test-success">Test Success State</button>
    <button id="test-error">Test Error State</button>
  </div>
  
  <div class="test-section">
    <h2>Test Results</h2>
    <pre id="test-results">No tests run yet.</pre>
  </div>
  
  <script src="/widget.js"></script>
  <script>
    // Test buttons
    document.getElementById('test-phone').addEventListener('click', function() {
      document.getElementById('test-results').textContent = 'Testing phone input...';
      // Add test logic here
    });
    
    document.getElementById('test-otp').addEventListener('click', function() {
      document.getElementById('test-results').textContent = 'Testing OTP verification...';
      // Add test logic here
    });
    
    document.getElementById('test-success').addEventListener('click', function() {
      document.getElementById('test-results').textContent = 'Testing success state...';
      // Add test logic here
    });
    
    document.getElementById('test-error').addEventListener('click', function() {
      document.getElementById('test-results').textContent = 'Testing error state...';
      // Add test logic here
    });
  </script>
</body>
</html>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(authTestHtml);
        return;
      }
      
      // If file not found, return 404
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    
    // Return file
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Local staging server running at http://localhost:${PORT}/`);
}); 