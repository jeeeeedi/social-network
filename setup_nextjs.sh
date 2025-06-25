#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Social Network Setup Script ===${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo -e "${RED}Go is not installed. Please install Go first.${NC}"
    exit 1
fi

echo -e "${YELLOW}Installing frontend dependencies...${NC}"

# Install all required dependencies
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
  @radix-ui/react-alert-dialog \
  @radix-ui/react-context-menu \
  @radix-ui/react-scroll-area

# Install development dependencies
npm install --save-dev tailwindcss-animate @tailwindcss/line-clamp

# Clean cache
rm -rf .next

echo -e "${YELLOW}Installing backend dependencies...${NC}"

# Go to backend directory and install dependencies
cd backend 2>/dev/null || echo "Backend directory not found"
go mod tidy
cd ..

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${YELLOW}To start: make dev${NC}"