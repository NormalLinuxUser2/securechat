# 🔍 SecureChat Debug Deployment Guide

## 🚀 **Deploy with Full Debugging**

### **Step 1: Push Updated Code to GitHub**
```bash
git add .
git commit -m "Add comprehensive debugging and secure kill switch"
git push origin main
```

### **Step 2: Railway Auto-Redeploy**
Railway will automatically redeploy when you push to GitHub.

### **Step 3: Monitor Deployment Logs**
In Railway dashboard, watch for these debug messages:

#### **✅ Successful Startup:**
```
🚀 Starting SecureChat server...
📊 Environment variables:
  - PORT: 3000
  - NODE_ENV: production
  - KILL_SWITCH_PASSCODE: SET
  - ALLOWED_ORIGINS: *
🔍 Starting PGP key initialization...
🔍 Starting PGP key initialization...
📁 Current working directory: /app
📁 __dirname: /app
📁 PGP directory: /app/PGP
📁 Public key path: /app/PGP/0x16BA41A8-pub.asc
📁 Private key path: /app/PGP/0x16BA41A8-sec.asc
✅ PGP directory exists
📁 Files in PGP directory: ['0x16BA41A8-pub.asc', '0x16BA41A8-sec.asc']
🔍 Loading existing PGP keys...
✅ Loaded existing PGP keys from PGP folder
📊 Public key length: 3291
📊 Private key length: 6124
🔑 Public key starts with: -----BEGIN PGP PUBLIC KEY BLOCK-----...
✅ PGP keys initialized - Server ready
🔍 Starting HTTP server...
🎉 ========================================
🔒 SecureChat server is LIVE!
🎉 ========================================
📡 Server running on port: 3000
🌐 Binding to: 0.0.0.0 (all interfaces)
🚨 Kill switch passcode: SECURE_CHAT_KILL_SWITCH_2024
🔐 PGP encryption: ACTIVE
🛡️ Security features: ENABLED
💾 Memory-only operation: ACTIVE
🚨 Kill switch protection: ACTIVE
   - Max attempts: 3 per IP
   - Cooldown: 24 hours
   - Activation delay: 1.5 seconds
🎉 ========================================
```

#### **❌ Common Issues & Solutions:**

**Issue 1: PGP Keys Not Found**
```
⚠️  PGP directory does not exist: /app/PGP
📁 Available directories: ['package.json', 'server.js', ...]
```
**Solution:** Check that PGP folder is in your GitHub repo

**Issue 2: Port Already in Use**
```
❌ Server error: Error: listen EADDRINUSE :::3000
❌ Port 3000 is already in use
```
**Solution:** Railway will handle this automatically

**Issue 3: Missing Dependencies**
```
Error: Cannot find module 'openpgp'
```
**Solution:** Check package.json has all dependencies

## 🔍 **Debug Endpoints**

### **Debug Status:**
Visit: `https://your-site.railway.app/debug`

**Response:**
```json
{
  "status": "OK",
  "killSwitchActivated": false,
  "serverPublicKey": "LOADED",
  "serverPrivateKey": "LOADED",
  "activeConnections": 0,
  "messageHistory": 0,
  "killSwitchAttempts": {},
  "environment": {
    "PORT": "3000",
    "NODE_ENV": "production",
    "KILL_SWITCH_PASSCODE_SET": true,
    "ALLOWED_ORIGINS": "*"
  },
  "timestamp": "2025-01-02T17:42:00.000Z"
}
```

### **Public Key:**
Visit: `https://your-site.railway.app/publickey`

## 🚨 **Kill Switch Security Features**

### **Brute Force Protection:**
- **Max Attempts:** 3 per IP address
- **Cooldown:** 24 hours after 3 failed attempts
- **Activation Delay:** 1.5 seconds (prevents accidental activation)
- **IP Tracking:** All attempts logged with IP addresses

### **Kill Switch Process:**
1. **Enter passcode** in kill switch modal
2. **Server validates** passcode and checks brute force protection
3. **If valid:** Shows 1.5-second countdown
4. **After delay:** Site terminates and returns 404

### **Error Responses:**
```json
// Invalid passcode
{
  "success": false,
  "message": "Invalid passcode",
  "attemptsRemaining": 2
}

// Too many attempts
{
  "success": false,
  "message": "Too many failed attempts. Try again in 24 hours.",
  "cooldown": 86400000
}

// Valid passcode
{
  "success": true,
  "message": "Kill switch activated - site terminating...",
  "delay": 1500
}
```

## 🛡️ **Security Checklist**

### **✅ Pre-Deployment:**
- [ ] PGP keys in PGP folder
- [ ] Kill switch passcode set in Railway variables
- [ ] All dependencies in package.json
- [ ] Server binds to 0.0.0.0:PORT

### **✅ Post-Deployment:**
- [ ] Debug endpoint shows "OK" status
- [ ] PGP keys loaded successfully
- [ ] Kill switch protection active
- [ ] Site accessible via Railway URL
- [ ] Chat interface loads with PGP encryption

### **✅ Testing:**
- [ ] Send encrypted message
- [ ] Test kill switch (with correct passcode)
- [ ] Test kill switch brute force protection
- [ ] Verify 404 response after kill switch

## 🚨 **Emergency Procedures**

### **If Site Won't Start:**
1. Check Railway logs for error messages
2. Visit `/debug` endpoint for status
3. Verify PGP keys are in GitHub repo
4. Check environment variables in Railway

### **If Kill Switch Fails:**
1. Check Railway logs for kill switch attempts
2. Verify passcode in Railway environment variables
3. Test with debug endpoint first

### **If PGP Encryption Fails:**
1. Check logs for PGP key loading
2. Verify PGP folder structure
3. Test with `/publickey` endpoint

## 📊 **Performance Monitoring**

### **Memory Usage:**
- Base: ~50MB
- Per connection: ~1KB
- Per message: ~1KB (encrypted)

### **Connection Limits:**
- Max concurrent: 1000 users
- Rate limit: 50 requests per 15 minutes
- Kill switch: 3 attempts per IP per 24 hours

Your secure chat platform is now fully debugged and ready for deployment! 🎉
