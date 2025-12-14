# Releafnow Admin Dashboard

A comprehensive admin dashboard for managing tree planting activities and token rewards.

## Features

- **User Authentication**: Login, register, and Gmail OAuth integration
- **Role-based Access**: Admin and Member user roles
- **Tree Management**: Members can submit tree planting information with photos
- **Analysis Dashboard**: Comprehensive charts and analytics
- **Token Management**: Allocate and track RLF token rewards

## Tech Stack

- **Frontend**: React, React Router, Chart.js, Recharts
- **Backend**: Node.js, Express, PostgreSQL
- **Authentication**: JWT, Passport.js (Google OAuth)

## Setup Instructions

1. Install dependencies:
```bash
npm run install-all
```

2. Set up environment variables:
- Create `.env` file in `server/` directory:
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=releafnow
DB_USER=your_db_user
DB_PASSWORD=your_db_password
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

3. Set up PostgreSQL database:
```bash
createdb releafnow
cd server
npm run migrate
```

4. Start development servers:
```bash
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## User Roles

- **Admin**: Full access to manage all users, trees, and tokens
- **Member**: Can submit trees and view own data only


