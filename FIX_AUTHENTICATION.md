# Fix Authentication Issue - Clear Browser Storage

## Problem
```
Auth middleware error: JsonWebTokenError: jwt malformed
POST /api/auth/refresh 401
```

The JWT token stored in browser is malformed/invalid.

## Solution Steps

### Method 1: Clear Browser Storage (Recommended)

**In Browser DevTools (F12):**

1. **Open Console tab** and run these commands:

```javascript
// Clear all cookies
document.cookie.split(";").forEach(function(c) {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});

// Clear localStorage
localStorage.clear();

// Clear sessionStorage
sessionStorage.clear();

// Verify it's cleared
console.log('Cookies:', document.cookie);
console.log('localStorage:', localStorage.length);
console.log('sessionStorage:', sessionStorage.length);
```

2. **Reload the page** (F5 or Ctrl+R)

3. **Login again** with your credentials

4. **Check if dashboard works** without logout loop

---

### Method 2: Manual Clear via DevTools

1. **Open DevTools** (F12)
2. **Go to Application tab** (Chrome) or Storage tab (Firefox)
3. **Expand Cookies** → Select `http://localhost:3000`
4. **Delete the `accessToken` cookie** (right-click → Delete)
5. **Expand Local Storage** → Select `http://localhost:3000`
6. **Clear all items** (right-click → Clear)
7. **Reload page** and **login again**

---

### Method 3: Clear Browser Data

**Chrome:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cookies and other site data"
3. Time range: "Last hour" or "All time"
4. Click "Clear data"

**Firefox:**
1. Press `Ctrl + Shift + Delete`
2. Select "Cookies" and "Site Data"
3. Time range: "Everything"
4. Click "Clear Now"

---

## Verify Fix Works

After clearing and logging in fresh:

1. **Check token is set properly:**
```javascript
// In Browser Console (F12)
console.log('Token:', document.cookie);
console.log('localStorage:', localStorage);
```

2. **Check refresh endpoint:**
```javascript
// Should return 200 now
fetch('http://localhost:5001/api/auth/refresh', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

Expected response:
```json
{
  "success": true,
  "message": "Token refreshed successfully"
}
```

3. **Test dashboard access** - should work without logout loop

---

## If Issue Persists

### Check Frontend Token Handling

**Check frontend login code:**

```javascript
// frontend/src/services/authService.js or similar

// CORRECT: Store token from cookie (httpOnly)
// Backend sets: res.cookie('accessToken', token, { httpOnly: true })
// Frontend: No need to manually store - browser handles it

// INCORRECT: Manually storing "undefined" or invalid token
// localStorage.setItem('token', undefined); // ❌ DON'T DO THIS
```

**Verify credentials: 'include' is set:**

```javascript
// All API calls should include credentials
fetch('/api/endpoint', {
  credentials: 'include', // ✅ Required for httpOnly cookies
  // ...
})
```

---

## Additional Debugging

If you still see malformed JWT after clearing:

**Check what's being stored:**

```javascript
// In Browser Console
console.log('accessToken cookie:',
  document.cookie.split(';')
    .find(c => c.trim().startsWith('accessToken='))
);
```

**Check if token is valid JWT format:**

```javascript
// JWT should have format: xxxxx.yyyyy.zzzzz (3 parts separated by dots)
const token = 'paste_your_token_here';
console.log('Token parts:', token.split('.').length); // Should be 3
```

**Common malformed token issues:**
- `"undefined"` string stored as token
- `"null"` string stored as token
- Empty string `""`
- Token without dots (not JWT format)
- Corrupted/truncated token

---

## Root Cause Summary

The original issue was:
1. ✅ **FIXED:** Missing `/api/auth/refresh` routes
2. ✅ **FIXED:** `verifyToken` rejecting expired tokens
3. ⚠️ **CURRENT:** Old malformed token in browser storage

**Solution:** Clear browser storage → Fresh login → New valid token → Refresh works

---

## Test Plan After Fix

1. ✅ Login successfully
2. ✅ Access dashboard without immediate logout
3. ✅ Token refresh happens automatically (check Network tab)
4. ✅ Dashboard remains accessible for 24+ hours
5. ✅ No infinite logout loop

If all 5 pass → Issue completely resolved! 🎉
