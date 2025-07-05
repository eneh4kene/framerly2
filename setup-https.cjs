const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create certificates directory
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

console.log('🔐 Setting up HTTPS certificates for AR development...');

try {
  // Check if OpenSSL is available
  execSync('openssl version', { stdio: 'ignore' });
  
  // Generate private key
  console.log('📝 Generating private key...');
  execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'ignore' });
  
  // Generate certificate
  console.log('📜 Generating certificate...');
  execSync(`openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=Dev/L=Dev/O=Framerly/CN=localhost"`, { stdio: 'ignore' });
  
  console.log('✅ SSL certificates generated successfully!');
  console.log(`🔑 Key: ${keyPath}`);
  console.log(`📄 Cert: ${certPath}`);
  
  // Update Vite config to use certificates
  const viteConfigPath = path.join(__dirname, 'vite.config.ts');
  const viteConfig = `import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import fs from 'fs';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    https: {
      key: fs.readFileSync('./certs/key.pem'),
      cert: fs.readFileSync('./certs/cert.pem'),
    },
    cors: true,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['three']
  }
});`;
  
  fs.writeFileSync(viteConfigPath, viteConfig);
  console.log('⚙️ Updated Vite config to use certificates');
  
  console.log('\n🚀 Setup complete! Now run:');
  console.log('   npm run dev');
  console.log('\n📱 For mobile testing:');
  console.log('   1. Go to https://localhost:3000 (or your IP)');
  console.log('   2. Accept the certificate warning');
  console.log('   3. Grant camera permissions');
  console.log('   4. Point camera at walls to detect surfaces');
  
} catch (error) {
  console.log('❌ OpenSSL not found. Using basic HTTPS setup...');
  console.log('💡 The app will still work but may show certificate warnings');
  console.log('\n🚀 You can still run:');
  console.log('   npm run dev');
  console.log('\n📱 For mobile testing:');
  console.log('   1. Go to https://localhost:3000 (or your IP)');
  console.log('   2. Accept the certificate warning');
  console.log('   3. Grant camera permissions');
  console.log('   4. Point camera at walls to detect surfaces');
} 