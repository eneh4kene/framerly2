# 🛠️ Framerly AR Engine - Setup & Troubleshooting Guide

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup HTTPS (Required for AR)
```bash
npm run setup-https
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Access the Application
- **Desktop**: `https://localhost:3000`
- **Mobile**: `https://[YOUR_IP]:3000` (replace [YOUR_IP] with your computer's IP)

## 🔧 Common Issues & Solutions

### Issue 1: "This site can't provide a secure connection"
**Error**: `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`

**Solution**:
1. Run the HTTPS setup script:
   ```bash
   npm run setup-https
   ```

2. If OpenSSL isn't available, the app will still work but show a certificate warning
3. **Important**: Click "Advanced" → "Proceed to localhost (unsafe)" in your browser

### Issue 2: AR Buttons Don't Work
**Symptoms**: Buttons respond but no AR functionality

**Causes & Solutions**:
- **Missing HTTPS**: AR requires HTTPS. Follow Issue 1 solution
- **No Camera Permission**: Grant camera access when prompted
- **Unsupported Browser**: Use Chrome Android 79+ or iOS Safari 13+
- **No WebXR Support**: App will fall back to 3D preview mode

### Issue 3: "WebXR not supported"
**Solutions**:
1. **Android**: Use Chrome 79+ or Samsung Internet 13+
2. **iOS**: Use Safari 13+ (will use USDZ fallback)
3. **Desktop**: Enable WebXR in Chrome flags: `chrome://flags/#webxr-incubations`

### Issue 4: Camera Permission Denied
**Solutions**:
1. **Manual Grant**: Click the camera icon in address bar
2. **Reset Permissions**: Go to site settings and reset permissions
3. **HTTPS Required**: Ensure you're using HTTPS, not HTTP

## 📱 Mobile Testing

### Android (Chrome)
1. Open `https://[YOUR_IP]:3000`
2. Accept certificate warning
3. Grant camera permissions
4. Point camera at walls
5. Tap detected surfaces to place objects

### iOS (Safari)
1. Open `https://[YOUR_IP]:3000`
2. Accept certificate warning
3. Grant camera permissions
4. Uses USDZ AR Quick Look fallback
5. Tap buttons to launch AR

## 🔍 Debug Information

### Check AR Support
Open browser console and run:
```javascript
window.getARState()
```

### Enable Debug Logging
```javascript
localStorage.setItem('framerly_debug', 'true')
```

### Check WebXR Support
```javascript
navigator.xr?.isSessionSupported('immersive-ar')
```

## 🌐 Network Configuration

### Find Your IP Address
**Windows**:
```cmd
ipconfig
```

**macOS/Linux**:
```bash
ifconfig
```

### Firewall Settings
Ensure port 3000 is open in your firewall for mobile testing.

## 🎯 Testing Steps

1. **Start Server**: `npm run dev`
2. **Check HTTPS**: Verify green lock icon or certificate warning
3. **Test Camera**: Should prompt for camera permissions
4. **Check Console**: Look for WebXR support messages
5. **Test Placement**: Point at walls, tap to place objects

## 🛡️ Security Notes

- Self-signed certificates will show warnings (this is normal)
- Only grant camera permissions to trusted development servers
- Use proper SSL certificates for production deployment

## 📊 Performance Tips

- **Mobile**: Use Chrome for best performance
- **Desktop**: Enable hardware acceleration
- **Network**: Use local network for faster loading
- **Memory**: Close other apps when testing AR

## 🔄 Reset Instructions

If you encounter persistent issues:

1. **Clear Browser Data**: Clear cache and cookies
2. **Reset Permissions**: Clear site permissions
3. **Restart Server**: Stop and restart development server
4. **Regenerate Certificates**: Run `npm run setup-https` again

## 📞 Support

If issues persist:
1. Check browser console for errors
2. Verify WebXR support on your device
3. Ensure HTTPS is properly configured
4. Test with different browsers/devices

---

**Built with ❤️ by the Framerly Team** 