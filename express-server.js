const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = 3000;

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Create HTTPS server with basic options
const options = {
  key: Buffer.from('dummy-key'),
  cert: Buffer.from('dummy-cert')
};

try {
  const server = https.createServer(options, app);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on https://localhost:${PORT}`);
    console.log(`📱 Mobile: https://192.168.1.174:${PORT}`);
    console.log('📝 Accept certificate warnings to proceed');
  });
} catch (error) {
  console.log('HTTPS failed, starting HTTP server...');
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Mobile: http://192.168.1.174:${PORT}`);
    console.log('⚠️  Note: AR features require HTTPS');
  });
} 