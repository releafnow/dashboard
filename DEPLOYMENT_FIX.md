# Fix: React Router 404 on Refresh

## Solution: Serve React App Through Express Server

Instead of deploying the client as a separate static site, we now serve it through the Express server. This ensures all React Router routes work correctly on refresh.

## What Changed

1. **Server (`server/server.js`)**:
   - Added code to serve static files from `client/build`
   - Added catch-all route to serve `index.html` for all non-API routes
   - This allows React Router to handle client-side routing

2. **Client Files**:
   - Removed hardcoded `localhost:5000` URLs
   - Changed to relative paths (e.g., `/uploads/profiles/...`)

3. **Build Process (`render.yaml`)**:
   - Updated to build client first, then server
   - The server now includes the built React app

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. Make sure `render.yaml` is in your repository root
2. In Render dashboard:
   - Delete the old **Static Site** service (`releafnow-dashboard`)
   - Keep only the **Web Service** (`releafnow-server`)
   - The server will now serve both API and frontend

3. Update Render Web Service settings:
   - **Build Command**: `cd client && npm install && npm run build && cd ../server && npm install`
   - **Start Command**: `cd server && npm start`

4. Redeploy the service

### Option 2: Manual Configuration in Render

1. Go to your Web Service settings
2. Update **Build Command**:
   ```
   cd client && npm install && npm run build && cd ../server && npm install
   ```
3. Update **Start Command**:
   ```
   cd server && npm start
   ```
4. Save and redeploy

## How It Works

1. During build, React app is built to `client/build`
2. Express server serves:
   - API routes at `/api/*`
   - Uploaded files at `/uploads/*`
   - Static React files at `/*` (JS, CSS, images)
   - `index.html` for all other routes (React Router handles routing)

3. When you refresh `/login`:
   - Express receives request for `/login`
   - No API route matches
   - Catch-all route serves `index.html`
   - React Router takes over and shows the Login page ✅

## Testing

After redeployment:
1. Visit: `https://releafnow-server.onrender.com/login`
2. Refresh the page (F5)
3. Should work without 404! ✅

## Important Notes

- You no longer need a separate Static Site service
- The single Web Service handles everything
- All API calls use relative paths (e.g., `/api/users/profile/me`)
- Upload URLs use relative paths (e.g., `/uploads/profiles/photo.jpg`)

