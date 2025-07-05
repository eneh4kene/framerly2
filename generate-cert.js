const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Create certificates directory
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// Generate self-signed certificate with proper configuration
const openSSLCommand = `openssl req -x509 -newkey rsa:4096 -keyout "${keyPath}" -out "${certPath}" -days 365 -nodes -subj "/C=US/ST=Dev/L=Dev/O=Dev/CN=192.168.1.174" -config <(echo '[req]'; echo 'distinguished_name=req'; echo '[SAN]'; echo 'subjectAltName=DNS:localhost,DNS:192.168.1.174,IP:192.168.1.174,IP:127.0.0.1')`;

try {
  console.log('Generating SSL certificates...');
  
  // For Windows, we'll use a simpler approach
  if (process.platform === 'win32') {
    // Generate private key
    execSync(`openssl genrsa -out "${keyPath}" 2048`);
    
    // Generate certificate
    execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=Dev/L=Dev/O=Dev/CN=localhost"`);
    
    console.log('✅ SSL certificates generated successfully!');
    console.log(`Key: ${keyPath}`);
    console.log(`Cert: ${certPath}`);
    console.log('\n📱 For mobile testing:');
    console.log('1. Navigate to https://192.168.1.174:3000');
    console.log('2. Accept the certificate warning');
    console.log('3. Grant camera permissions');
    
  } else {
    // For Unix systems, use the full command
    execSync(openSSLCommand, { shell: '/bin/bash' });
    console.log('✅ SSL certificates generated successfully!');
  }
  
} catch (error) {
  console.error('❌ Error generating certificates:', error.message);
  console.log('\n🔧 Alternative: Use Vite\'s built-in HTTPS with basic config');
  
  // Create a simple config file for Vite
  const basicConfig = `
// Basic HTTPS config for Vite
export default {
  server: {
    https: true,
    host: '0.0.0.0',
    port: 3000
  }
};
`;
  
  console.log('Certificate generation failed, but Vite will use basic HTTPS.');
} 