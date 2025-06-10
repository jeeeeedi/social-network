#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Social Network Full Setup Script ===${NC}"
echo -e "${YELLOW}This script will set up all components of the project, including frontend and backend dependencies.${NC}"
echo -e "${YELLOW}It includes updates and additions based on recent project changes.${NC}"
echo ""

# Check if Node.js is installed (for frontend)
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js for the frontend.${NC}"
    echo -e "${YELLOW}You can download it from https://nodejs.org/ or use a package manager like Homebrew (brew install node).${NC}"
    exit 1
fi

echo -e "${GREEN}Node.js is installed. Version: $(node -v)${NC}"

# Check if npm is installed (for frontend)
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm for the frontend.${NC}"
    echo -e "${YELLOW}npm is usually installed with Node.js. Check https://nodejs.org/ for installation.${NC}"
    exit 1
fi

echo -e "${GREEN}npm is installed. Version: $(npm -v)${NC}"

# Check if Go is installed (for backend)
if ! command -v go &> /dev/null; then
    echo -e "${RED}Go is not installed. Please install Go for the backend.${NC}"
    echo -e "${YELLOW}You can download it from https://golang.org/ or use a package manager like Homebrew (brew install go).${NC}"
    exit 1
fi

echo -e "${GREEN}Go is installed. Version: $(go version)${NC}"

# Check if sqlite3 is installed
if ! command -v sqlite3 &> /dev/null; then
    echo -e "${YELLOW}Warning: SQLite3 command line tool not found. Database migrations may fail.${NC}"
    echo -e "${YELLOW}Consider installing SQLite3 before proceeding (e.g., brew install sqlite on macOS).${NC}"
    echo ""
fi

# Setup frontend dependencies
# CHANGE NOTE: This ensures all frontend dependencies are installed, including React, MUI, and related packages.
# These are critical for the React application with Material-UI components added during project updates.
echo -e "${GREEN}Setting up frontend dependencies...${NC}"
cd frontend || { echo -e "${RED}Frontend directory not found!${NC}"; exit 1; }
echo "Installing frontend dependencies (including React, MUI, and others as per package.json)..."
npm install
cd ..

echo -e "${GREEN}Frontend dependencies installed.${NC}"

# Setup backend (Go project in root)
# CHANGE NOTE: No changes here from the original setup.sh; ensuring Go dependencies are tidy for the backend.
echo -e "${GREEN}Setting up backend (Go)...${NC}"
echo "Installing Go dependencies..."
go mod tidy

echo -e "${GREEN}Backend Go dependencies installed.${NC}"

# Run database migrations
# CHANGE NOTE: No changes here; ensuring database setup is complete as per original setup.
echo -e "${GREEN}Setting up database...${NC}"
echo "Running migrations..."
if make migrateup; then
    echo -e "${GREEN}Database migrations completed successfully.${NC}"
else
    echo -e "${RED}Database migrations failed. Check your setup or ensure SQLite is installed.${NC}"
    echo -e "${YELLOW}Continuing setup despite migration failure; you may need to resolve this manually.${NC}"
fi

echo ""
# CHANGE NOTE: Added detailed instructions for starting both frontend and backend with updated context.
echo -e "${GREEN}Full Setup Complete!${NC}"
echo -e "You can now start the applications:"
echo -e "${YELLOW}Frontend:${NC} cd frontend && npm start"
echo -e "${YELLOW}   - This will start the React development server, typically on port 3000."
echo -e "${YELLOW}   - Ensure the backend is running to handle API requests (proxy set to http://localhost:8080)."
echo -e "${YELLOW}Backend:${NC} go run main.go"
echo -e "${YELLOW}   - This will start the Go backend server, typically on port 8080."
echo -e "${YELLOW}   - Run this in a separate terminal if developing locally."
echo ""
# CHANGE NOTE: Added note about project updates and new dependencies.
echo -e "${GREEN}Notes on Updates:${NC}"
echo -e "${YELLOW} - Material-UI (MUI) and related packages (@emotion/react, @emotion/styled) have been integrated for UI components.${NC}"
echo -e "${YELLOW} - Proxy setting added in frontend/package.json to forward API requests to backend (http://localhost:8080).${NC}"
echo -e "${YELLOW} - Removed root npm install as root dependencies were deemed unnecessary after review.${NC}"
echo ""
echo -e "${GREEN}Happy coding!${NC}" 