# From the root directory, run the following commands:
# `make start` runs both the backend and frontend servers in parallel.
# `make stop` stops both servers.
# `make clean` cleans up build artifacts and processes.

.PHONY: start stop backend frontend open-chrome clean check-ports wait-for-backend wait-for-frontend dev

# Clean up build artifacts and stop all processes
clean:
	@echo "Cleaning up..."
	@rm -rf .next
	@rm -rf node_modules/.cache
	$(MAKE) stop

# Check if ports are available
check-ports:
	@echo "Checking if ports 3000 and 8080 are available..."
	@if lsof -ti tcp:3000 >/dev/null 2>&1; then \
		echo "Port 3000 is already in use. Killing existing process..."; \
		lsof -ti tcp:3000 | xargs kill -9 || true; \
		sleep 2; \
	fi
	@if lsof -ti tcp:8080 >/dev/null 2>&1; then \
		echo "Port 8080 is already in use. Killing existing process..."; \
		lsof -ti tcp:8080 | xargs kill -9 || true; \
		sleep 2; \
	fi

# Wait for backend to be ready
wait-for-backend:
	@echo "Waiting for backend to be ready..."
	@for i in {1..30}; do \
		if curl -s http://localhost:8080 >/dev/null 2>&1; then \
			echo "Backend is ready!"; \
			break; \
		fi; \
		echo "Waiting for backend... ($$i/30)"; \
		sleep 1; \
	done

# Wait for frontend to be ready
wait-for-frontend:
	@echo "Waiting for frontend to be ready..."
	@for i in {1..30}; do \
		if curl -s http://localhost:3000 >/dev/null 2>&1; then \
			echo "Frontend is ready!"; \
			break; \
		fi; \
		echo "Waiting for frontend... ($$i/30)"; \
		sleep 1; \
	done

# Development mode (recommended)
dev: check-ports
	@echo "Starting development servers..."
	@echo "Backend will run on http://localhost:8080"
	@echo "Frontend will run on http://localhost:3000"
	$(MAKE) backend &
	$(MAKE) wait-for-backend
	$(MAKE) frontend &
	$(MAKE) wait-for-frontend
	$(MAKE) open-chrome
	@echo "Both servers are ready! Press Ctrl+C to stop."
	wait

# Run both backend and frontend in parallel (improved)
start: check-ports
	@echo "Starting backend and frontend..."
	@echo "Backend will run on http://localhost:8080"
	@echo "Frontend will run on http://localhost:3000"
	$(MAKE) backend &
	sleep 3
	$(MAKE) frontend &
	sleep 5
	$(MAKE) open-chrome
	@echo "Both servers started! Check terminal output for any errors."
	@echo "Press Ctrl+C to stop both servers."
	wait

# Run backend
backend:
	@echo "Starting Go backend server..."
	cd backend && go run main.go

# Run frontend (Next.js)
frontend:
	@echo "Starting Next.js frontend server..."
	npm run dev

# Stop both backend and frontend servers
stop:
	@echo "Stopping backend (8080) and frontend (3000)..."
	@lsof -ti tcp:3000 | xargs kill -9 2>/dev/null || echo "No process on port 3000"
	@lsof -ti tcp:8080 | xargs kill -9 2>/dev/null || echo "No process on port 8080"
	@echo "All servers stopped."

# Open the frontend in Chrome in incognito mode
open-chrome:
	@echo "Opening browser..."
	open -na "Google Chrome" --args --incognito http://localhost:3000/

# Quick restart
restart: stop clean start