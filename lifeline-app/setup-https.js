const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 Setting up HTTPS for mobile testing...');

try {
  // Check if mkcert is available
  execSync('mkcert --version', { stdio: 'pipe' });
  console.log('✅ mkcert found');
} catch (error) {
  console.log('❌ mkcert not found. Installing...');
  try {
    execSync('npm install -g mkcert', { stdio: 'inherit' });
  } catch (installError) {
    console.log('❌ Failed to install mkcert globally. Please install manually:');
    console.log('   Windows: choco install mkcert');
    console.log('   Or download from: https://github.com/FiloSottile/mkcert/releases');
    process.exit(1);
  }
}

try {
  // Install local CA
  execSync('mkcert -install', { stdio: 'inherit' });
  console.log('✅ Local CA installed');
  
  // Generate certificates
  const certDir = path.join(__dirname, 'certs');
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir);
  }
  
  execSync(`mkcert -key-file ${certDir}/key.pem -cert-file ${certDir}/cert.pem localhost 127.0.0.1 10.133.250.197`, { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  
  console.log('✅ HTTPS certificates generated');
  console.log('📱 Now you can access the app via: https://10.133.250.197:3000');
  console.log('🔧 To start with HTTPS, run: npm run dev:https');
  
} catch (error) {
  console.log('❌ Failed to generate certificates:', error.message);
  console.log('📱 Alternative: Use Chrome with --unsafely-treat-insecure-origin-as-secure flag');
  console.log('   Windows: chrome.exe --unsafely-treat-insecure-origin-as-secure=http://10.133.250.197:3000');
  process.exit(1);
}
