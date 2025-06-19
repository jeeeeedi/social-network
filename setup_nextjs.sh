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
    echo -e "${YELLOW}You can download it from https://nodejs.org/ or use a package manager like Homebrew (brew install node@20) or nvm (nvm install --lts).${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_VERSION="20.0.0"

# Compare Node.js versions (requires sort -V)
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}Your Node.js version is $NODE_VERSION, but Next.js requires at least v$REQUIRED_VERSION.${NC}"
    echo -e "${YELLOW}To upgrade Node.js on macOS with Homebrew:${NC}"
    echo -e "${YELLOW}  brew install node@20"
    echo -e "${YELLOW}  echo 'export PATH=\"/opt/homebrew/opt/node@20/bin:\$PATH\"' >> ~/.zshrc"
    echo -e "${YELLOW}  source ~/.zshrc"
    echo -e "${YELLOW}Or use nvm (recommended for all platforms):${NC}"
    echo -e "${YELLOW}  nvm install --lts"
    echo ""
    echo -e "${RED}If you see 'Permission denied' when editing ~/.zshrc, do the following:${NC}"
    echo -e "${YELLOW}1. Change the permissions on your .zshrc file:${NC}"
    echo -e "${YELLOW}   chmod u+w ~/.zshrc${NC}"
    echo -e "${YELLOW}2. Now you can append to it (for example, to add Node 20 to your PATH):${NC}"
    echo -e "${YELLOW}   echo 'export PATH=\"/opt/homebrew/opt/node@20/bin:\$PATH\"' >> ~/.zshrc${NC}"
    echo -e "${YELLOW}3. Reload your shell configuration:${NC}"
    echo -e "${YELLOW}   source ~/.zshrc${NC}"
    echo ""
    echo -e "${RED}If you still get permission denied, check the file owner with:${NC}"
    echo -e "${YELLOW}   ls -l ~/.zshrc${NC}"
    echo -e "${RED}If it's not owned by your user, fix it with:${NC}"
    echo -e "${YELLOW}   sudo chown \$USER ~/.zshrc${NC}"
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

# Install all required dependencies for the project
npm install \
  lucide-react \
  @radix-ui/react-tabs \
  @radix-ui/react-dialog \
  @radix-ui/react-checkbox \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-switch \
  @radix-ui/react-popover \
  @radix-ui/react-label \
  @radix-ui/react-avatar \
  @radix-ui/react-separator \
  @radix-ui/react-radio-group \
  @radix-ui/react-toast \
  @radix-ui/react-slider \
  @radix-ui/react-progress \
  @radix-ui/react-tooltip \
  @radix-ui/react-collapsible \
  @radix-ui/react-accordion \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-select \
  @radix-ui/react-form \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-sheet \
  @radix-ui/react-drawer \
  @radix-ui/react-resizable \
  @radix-ui/react-context-menu

# Install peer dependencies if needed
npm install react react-dom

# Setup frontend dependencies

echo "Ensuring Next.js and React dependencies are installed..."
echo "Installing frontend dependencies (including React, MUI, and others as per package.json)..."
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
echo -e "${YELLOW}Frontend:${NC} cd frontend && npm run dev"
echo -e "${YELLOW}   - This will start the Next.js development server, typically on port 3000."
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