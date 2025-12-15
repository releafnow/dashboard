# Production Setup Guide for Render

This guide will help you set up your Releafnow dashboard correctly in production on Render.

## Architecture

You have **2 services** on Render:
1. **Web Service** (`releafnow-server`) - Backend API server
2. **Static Site** (`releafnow-dashboard`) - Frontend React app

## Step 1: Configure Web Service (Backend)

### Environment Variables
Go to Render Dashboard → `releafnow-server` → Settings → Environment

**Required Variables:**
```
NODE_ENV=production
JWT_SECRET=your_strong_secret_key_here
CLIENT_URL=https://releafnow-dashboard.onrender.com
```

**Optional (for Google OAuth):**
```
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**Database:**
- `DATABASE_URL` is automatically set by Render when you link the database
- Make sure `releafnow-db` is linked to the web service

### Run Migrations

1. Go to Render Dashboard → `releafnow-server`
2. Click on "Shell" tab
3. Run:
```bash
cd server
npm run migrate
```

This will create all the database tables.

## Step 2: Configure Static Site (Frontend)

### Environment Variables
Go to Render Dashboard → `releafnow-dashboard` → Settings → Environment

**Required Variable:**
```
REACT_APP_API_URL=https://releafnow-server.onrender.com
```

This tells the React app where to make API calls.

### Redirects Configuration

1. Go to `releafnow-dashboard` → Settings
2. Find "Redirects/Rewrites" section
3. Add redirect:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Status**: `200`

This fixes the React Router refresh issue.

## Step 3: Update Image URLs for Production

The code currently uses `http://localhost:5000` for images. This needs to be fixed for production.

**Files to update:**
- `client/src/pages/Dashboard.js` (line 101)
- `client/src/pages/Trees.js` (line 97)
- `client/src/pages/Profile.js` (line 41)
- `client/src/pages/Users.js` (line 201)
- `client/src/components/TreeForm.js` (line 31)

Change from:
```javascript
src={`http://localhost:5000/uploads/trees/${tree.photo}`}
```

To:
```javascript
src={`/uploads/trees/${tree.photo}`}  // Relative path works in production
```

Or use the server URL:
```javascript
src={`https://releafnow-server.onrender.com/uploads/trees/${tree.photo}`}
```

## Step 4: Verify Setup

### 1. Check Database Connection
- Server logs should show successful database connection
- Run migrations if you haven't already

### 2. Check API Endpoints
Visit: `https://releafnow-server.onrender.com/api/health`
Should return: `{"status":"ok"}`

### 3. Test Frontend
- Visit: `https://releafnow-dashboard.onrender.com`
- Try logging in
- Check browser console for errors

### 4. Test API Calls
Open browser console on the frontend:
- Check Network tab
- API calls should go to `releafnow-server.onrender.com`
- Should not show CORS errors

## Troubleshooting

### Dashboard shows empty/404 errors
- ✅ Check `REACT_APP_API_URL` is set on static site
- ✅ Check redirects are configured
- ✅ Check browser console for API errors

### Can't login
- ✅ Check `JWT_SECRET` is set on server
- ✅ Check database migrations ran successfully
- ✅ Check server logs for errors

### Images not loading
- ✅ Update image URLs from `localhost:5000` to relative paths or server URL
- ✅ Check CORS is enabled on server

### API calls fail
- ✅ Verify `REACT_APP_API_URL` environment variable
- ✅ Check server is running and healthy
- ✅ Check CORS configuration allows the static site domain

## Quick Checklist

- [ ] Database linked to web service
- [ ] Migrations run successfully
- [ ] Server environment variables set (JWT_SECRET, CLIENT_URL, etc.)
- [ ] Static site environment variable set (REACT_APP_API_URL)
- [ ] Redirects configured on static site
- [ ] Image URLs updated for production
- [ ] Both services deployed successfully
- [ ] Test login and dashboard functionality
