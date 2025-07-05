# 🔧 Fix HTTPS SSL Error for Framerly AR

## ❌ Current Issue
You're seeing: **"This site can't provide a secure connection - ERR_SSL_VERSION_OR_CIPHER_MISMATCH"**

## ✅ Solution Steps

### Step 1: Access the Application
The development server is running on: `https://192.168.1.174:3000`

### Step 2: Bypass Certificate Warning
When you see the SSL error page:

1. **Click "Advanced"** (or "Show Details")
2. **Click "Proceed to 192.168.1.174 (unsafe)"** 
3. **OR** Click "Accept the risk and continue"

> ⚠️ **This is normal for development!** Self-signed certificates always show this warning.

### Step 3: Grant Camera Permissions
1. Browser will ask for camera permissions
2. **Click "Allow"** or "Yes"
3. This is required for AR functionality

### Step 4: Test AR Functionality
1. **Frame Mode**: Click to place artwork on walls
2. **Neon Mode**: Click to place neon signs
3. Point camera at walls to detect surfaces
4. Tap detected surfaces to place objects

## 🔍 Alternative Access Methods

### Method 1: Use localhost
Try accessing: `https://localhost:3000`
- May have better certificate support
- Same steps to bypass warnings

### Method 2: Use HTTP (Limited)
Access: `http://192.168.1.174:3000`
- ❌ AR won't work (requires HTTPS)
- ✅ Can test UI and fallback mode

### Method 3: Different Browser
Try these browsers in order:
1. **Chrome** (best AR support)
2. **Edge** (good compatibility)
3. **Firefox** (basic support)

## 📱 Mobile Testing

### Android (Chrome/Samsung Internet)
1. Open `https://192.168.1.174:3000`
2. Tap "Advanced" → "Proceed to site"
3. Grant camera permissions
4. Point at walls and tap to place objects

### iOS (Safari)
1. Open `https://192.168.1.174:3000`
2. Tap "Advanced" → "Proceed to site"
3. Grant camera permissions
4. Will use USDZ AR Quick Look fallback

## 🎯 Testing Checklist

- [ ] Can access the site (bypass SSL warning)
- [ ] Can see the Frame/Neon mode buttons
- [ ] Camera permission granted
- [ ] Buttons respond when clicked
- [ ] AR mode activates (or shows preview mode)
- [ ] Can place objects by tapping

## 🔧 If Still Not Working

### Check Console for Errors
1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Look for any error messages
4. Run: `window.getARState()` to check AR status

### Verify Network
1. Ensure you're on the same network as the server
2. Try your computer's other IP addresses if available
3. Check firewall isn't blocking port 3000

### WebXR Support
Run in browser console:
```javascript
navigator.xr?.isSessionSupported('immersive-ar').then(supported => {
  console.log('AR supported:', supported);
});
```

## 🚀 Quick Test Command

In browser console, test the AR engine:
```javascript
// Check if AR is available
console.log('WebXR available:', !!navigator.xr);
console.log('User agent:', navigator.userAgent);

// Test AR support
if (navigator.xr) {
  navigator.xr.isSessionSupported('immersive-ar').then(supported => {
    console.log('Immersive AR supported:', supported);
  });
}
```

## 📞 Success Indicators

✅ **Working correctly when you see:**
- Site loads with frame/neon buttons
- Camera permission granted
- Status shows "AR Ready" or "Preview mode"
- Tapping buttons shows some response
- Objects can be placed (even in preview mode)

❌ **Still having issues if:**
- Site won't load at all
- Buttons don't respond
- No camera permission prompt
- Console shows critical errors

---

**Remember**: SSL warnings are normal for development servers. The key is to bypass them and test the AR functionality! 