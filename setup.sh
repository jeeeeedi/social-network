#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Social Network Setup Script ===${NC}"
echo -e "${YELLOW}This script will set up both frontend and backend components${NC}"
echo ""

# Check if Node.js is installed (for frontend)
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js for the frontend.${NC}"
    exit 1
fi

# Check if npm is installed (for frontend)
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm for the frontend.${NC}"
    exit 1
fi

# Check if Go is installed (for backend)
if ! command -v go &> /dev/null; then
    echo -e "${RED}Go is not installed. Please install Go for the backend.${NC}"
    exit 1
fi

# Check if sqlite3 is installed
if ! command -v sqlite3 &> /dev/null; then
    echo -e "${YELLOW}Warning: SQLite3 command line tool not found. Database migrations may fail.${NC}"
    echo -e "${YELLOW}Consider installing SQLite3 before proceeding.${NC}"
    echo ""
fi

# Setup frontend
echo -e "${GREEN}Setting up frontend...${NC}"
cd frontend || { echo -e "${RED}Frontend directory not found!${NC}"; exit 1; }
echo "Installing frontend dependencies..."
npm install
cd ..

# Setup backend
echo -e "${GREEN}Setting up backend (Go)...${NC}"
echo "Installing Go dependencies..."
go mod tidy

# Run database migrations
echo -e "${GREEN}Setting up database...${NC}"
echo "Running migrations..."
make migrateup

echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo -e "You can now start the applications:"
echo -e "${YELLOW}Frontend:${NC} cd frontend && npm start"
echo -e "${YELLOW}Backend:${NC} go run main.go"
echo ""
echo -e "${GREEN}Happy coding!${NC}" 