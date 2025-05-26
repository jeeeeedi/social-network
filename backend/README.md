# Social Network Backend

This is the Go backend server for the Social Network application.

## Prerequisites

- Go (v1.21 or newer)
- SQLite3
- CGO enabled (for SQLite driver)

## Setup

1. Install Go dependencies:
   ```bash
   # From the project root
   go mod tidy
   ```

2. Set up the database:
   ```bash
   # From the project root
   make migrateup
   ```

3. Start the development server:
   ```bash
   # From the project root
   go run main.go
   ```

4. For production build:
   ```bash
   go build -o social-network main.go
   ./social-network
   ```

## Project Structure

```
backend/
├── handlers/       # HTTP request handlers
├── middleware/     # HTTP middleware functions
├── models/         # Data models and database operations
└── utils/          # Utility functions
```

## Dependencies

This project uses only approved Go packages:

- `github.com/gorilla/mux` - HTTP router and URL matcher
- `github.com/gorilla/websocket` - WebSocket implementation
- `github.com/mattn/go-sqlite3` - SQLite3 driver
- `github.com/gofrs/uuid` - UUID generation
- `golang.org/x/crypto/bcrypt` - Password hashing
- Standard Go library packages

## Environment Variables

Create a `.env` file in the project root (optional):

```
PORT=8000
DB_PATH=./db/socnet.db
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user  
- `GET /api/auth/me` - Get current user information
- `POST /api/auth/logout` - Logout a user

### Users
- `GET /api/users/{id}` - Get user profile
- `PUT /api/users/{id}` - Update user profile

### Posts
- `GET /api/posts` - Get user feed
- `POST /api/posts` - Create a new post
- `GET /api/posts/{id}` - Get specific post
- `POST /api/posts/{id}/comments` - Add comment to post

### Groups
- `GET /api/groups` - List groups
- `POST /api/groups` - Create a group
- `GET /api/groups/{id}` - Get group details
- `POST /api/groups/{id}/join` - Join a group

### WebSocket
- `/ws` - WebSocket endpoint for real-time features

More endpoints will be documented as they are implemented.

## Development

### Running Tests
```bash
go test ./...
```

### Code Formatting
```bash
go fmt ./...
```

### Building
```bash
go build -o bin/social-network main.go
``` 