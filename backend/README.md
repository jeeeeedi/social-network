# Social Network Backend

This is the backend server for the Social Network application.

## Prerequisites

- Node.js (v14.0.0 or newer)
- npm
- SQLite3

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the database:
   ```bash
   # From the project root
   make migrateup
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. For production:
   ```bash
   npm start
   ```

## Available Scripts

- `npm run dev`: Starts the development server with hot-reload using nodemon
- `npm start`: Starts the server in production mode
- `npm test`: Runs tests (when implemented)

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
PORT=8000
NODE_ENV=development
JWT_SECRET=your_jwt_secret
COOKIE_SECRET=your_cookie_secret
```

## API Endpoints

### Authentication
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Login a user
- `GET /api/auth/me`: Get current user information
- `POST /api/auth/logout`: Logout a user

More endpoints will be documented as they are implemented. 