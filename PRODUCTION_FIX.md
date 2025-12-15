# Fix: Dashboard Not Working in Production

## Problem
Dashboard works in development but shows empty content in production because API calls fail due to cross-origin issues.

## Solution Applied

All components now use `axiosInstance` from `client/src/config/axios.js` which:
1. **Automatically detects production environment**
2. **Sets the correct API base URL** based on deployment:
   - If `REACT_APP_API_URL` is set → uses that URL
   - If on `releafnow-dashboard.onrender.com` → automatically uses `https://releafnow-server.onrender.com`
   - Otherwise → uses relative paths (when served from Express server)

3. **Automatically includes auth tokens** in all requests

## Configuration Needed on Render

### For Static Site Service (`releafnow-dashboard`):

1. Go to Render Dashboard → Static Site → Settings
2. Go to "Environment" section
3. Add environment variable:
   - **Key**: `REACT_APP_API_URL`
   - **Value**: `https://releafnow-server.onrender.com`
4. Save and redeploy

This ensures all API calls from the static site go to the correct server.

## Files Updated

All components now use `axiosInstance`:
- ✅ Dashboard.js
- ✅ AuthContext.js
- ✅ Trees.js
- ✅ Profile.js
- ✅ Users.js
- ✅ Analytics.js
- ✅ TokenManagement.js
- ✅ Register.js
- ✅ TreeForm.js

## Testing

After deploying with the environment variable:
1. Visit `https://releafnow-dashboard.onrender.com`
2. Login
3. Dashboard should now load data correctly ✅
