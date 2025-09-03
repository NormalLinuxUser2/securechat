# 🚀 Railway 502 Error Fix Guide

## 🔧 **Railway Configuration Settings**

### **Step 1: Railway Dashboard Settings**
In your Railway project dashboard:

1. **Go to Settings → Deploy**
2. **Set these values:**
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
   - **Health Check Timeout:** `100`

### **Step 2: Environment Variables**
In Railway dashboard → Variables tab, add:
```
KILL_SWITCH_PASSCODE=YOUR_SECURE_PASSCODE_HERE
ALLOWED_ORIGINS=*
NODE_ENV=production
PORT=3000
```

### **Step 3: Service Configuration**
1. **Go to your service in Railway**
2. **Click on the service name**
3. **Go to Settings → Networking**
4. **Set Port:** `3000`
5. **Enable Health Checks:** `Yes`

## 🛠️ **Build Configuration Files Added**

### **✅ nixpacks.toml** (Railway build config)
```toml
[phases.setup]
nixPkgs = ["nodejs", "npm"]

[phases.install]
cmds = ["npm install"]

[phases.build]
cmds = ["echo 'Build complete'"]

[start]
cmd = "npm start"
```

### **✅ railway.json** (Railway deployment config)
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100
  }
}
```

### **✅ package.json** (Updated scripts)
```json
{
  "scripts": {
    "start": "node server.js",
    "build": "echo 'No build step required'",
    "postinstall": "echo 'Dependencies installed successfully'"
  }
}
```

## 🔍 **Health Check Endpoints**

### **Health Check:** `/health`
- Returns: `{"status": "OK", "timestamp": "..."}`
- Used by Railway to verify app is running

### **Debug Endpoint:** `/debug`
- Returns: Full system status
- Use this to troubleshoot issues

## 🚨 **Common 502 Error Causes & Fixes**

### **Issue 1: Port Configuration**
**Problem:** App not binding to correct port
**Fix:** 
- Set Railway port to `3000`
- Verify `PORT` environment variable

### **Issue 2: Health Check Failing**
**Problem:** Railway can't reach health endpoint
**Fix:**
- Set health check path to `/health`
- Increase timeout to `100` seconds

### **Issue 3: Build Failing**
**Problem:** Dependencies not installing
**Fix:**
- Check `package.json` has all dependencies
- Verify Node.js version compatibility

### **Issue 4: Start Command Wrong**
**Problem:** Railway doesn't know how to start app
**Fix:**
- Set start command to `npm start`
- Verify `server.js` exists

## 📋 **Deployment Checklist**

### **✅ Before Deploy:**
- [ ] All files pushed to GitHub
- [ ] `nixpacks.toml` present
- [ ] `railway.json` present
- [ ] `package.json` has correct scripts
- [ ] PGP folder with keys included

### **✅ Railway Settings:**
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] Port: `3000`
- [ ] Health check: `/health`
- [ ] Environment variables set

### **✅ After Deploy:**
- [ ] Check Railway logs for startup messages
- [ ] Visit `/health` endpoint
- [ ] Visit `/debug` endpoint
- [ ] Test main site loads
- [ ] Test Gmail interface appears

## 🔧 **Manual Railway Configuration**

If automatic detection fails:

1. **Go to Railway Dashboard**
2. **Select your project**
3. **Click "Settings"**
4. **Go to "Deploy" tab**
5. **Set these manually:**
   ```
   Build Command: npm install
   Start Command: npm start
   Health Check Path: /health
   Health Check Timeout: 100
   ```

6. **Go to "Variables" tab**
7. **Add environment variables:**
   ```
   KILL_SWITCH_PASSCODE=YOUR_PASSCODE
   NODE_ENV=production
   ```

## 🚀 **Deploy Steps**

1. **Push updated code to GitHub:**
   ```bash
   git add .
   git commit -m "Fix Railway 502 error with proper config"
   git push origin main
   ```

2. **Railway will auto-redeploy**

3. **Monitor logs for:**
   ```
   🚀 Starting SecureChat server...
   ✅ PGP keys initialized - Server ready
   🔒 SecureChat server is LIVE!
   ```

4. **Test endpoints:**
   - `https://your-site.railway.app/health`
   - `https://your-site.railway.app/debug`
   - `https://your-site.railway.app/` (main Gmail interface)

## 🎯 **Expected Results**

After fixing 502 error:
- ✅ Site loads with orange/black Gmail interface
- ✅ Health check returns 200 OK
- ✅ Debug endpoint shows system status
- ✅ PGP encryption working
- ✅ Kill switch functional
- ✅ Bob character appears with random dialogue
- ✅ Static HTML files served properly

Your Gmail-disguised secure chat with Bob should now work perfectly! 📧🔒🤖
