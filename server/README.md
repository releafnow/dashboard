# Releafnow Server

Backend server for the Releafnow dashboard.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the server directory:
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=releafnow
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

3. Create the PostgreSQL database:
```bash
createdb releafnow
```

4. Run migrations:
```bash
npm run migrate
```

5. Start the server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/profile/me` - Get current user profile
- `PUT /api/users/profile/me` - Update current user profile
- `PUT /api/users/profile/password` - Update password
- `PUT /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

### Trees
- `GET /api/trees` - Get all trees
- `GET /api/trees/:id` - Get tree by ID
- `POST /api/trees` - Create new tree
- `PUT /api/trees/:id` - Update tree
- `PATCH /api/trees/:id/status` - Update tree status (admin only)
- `DELETE /api/trees/:id` - Delete tree

### Tokens
- `GET /api/tokens/transactions` - Get token transactions
- `GET /api/tokens/balance` - Get user token balance
- `GET /api/tokens/balances` - Get all user balances (admin only)
- `POST /api/tokens/allocate` - Allocate tokens (admin only)
- `PATCH /api/tokens/transactions/:id/status` - Update transaction status (admin only)

### Analytics
- `GET /api/analytics` - Get analytics data



