# 🚀 Migrate to Next.js for Better HTTPS Support

## Why Next.js for WebXR?
- **Better HTTPS**: Built-in support for proper SSL certificates
- **WebXR Friendly**: Many AR/VR projects use Next.js
- **Production Ready**: Easier deployment with proper SSL
- **Better Performance**: Optimized for 3D/AR applications

## Quick Migration Steps

### 1. Create Next.js Project
```bash
npx create-next-app@latest framerly-nextjs --typescript --tailwind --app
cd framerly-nextjs
```

### 2. Install Dependencies
```bash
npm install three @types/three @types/webxr
```

### 3. Copy Your Code
```bash
# Copy from current project
cp -r src/ framerly-nextjs/src/
cp -r public/ framerly-nextjs/public/
```

### 4. Update for Next.js
- Move `src/main.ts` → `app/page.tsx`
- Update imports to use Next.js conventions
- Add `"use client"` to components using browser APIs

### 5. Configure HTTPS
```javascript
// next.config.js
module.exports = {
  async rewrites() {
    return []
  },
  // Better HTTPS support
  experimental: {
    serverActions: true,
  }
}
```

### 6. Run with HTTPS
```bash
npm run dev -- --experimental-https
```

## Advantages
- ✅ Better SSL certificate handling
- ✅ Production-ready HTTPS
- ✅ Better WebXR compatibility
- ✅ Easier deployment
- ✅ Better performance optimization 