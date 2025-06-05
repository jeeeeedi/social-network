# From the root directory, run the following commands:
# `make start` runs both the backend and frontend servers in parallel.
# `make stop` stops both servers.

.PHONY: start stop backend frontend

# Run both backend and frontend in parallel
start: 
	@echo "Starting backend and frontend..."
	$(MAKE) backend &
	$(MAKE) frontend &
	wait

# Run backend
backend:
	cd backend && go run main.go

# Run frontend
frontend:
	cd frontend && npm start

# Stop both backend and frontend servers
stop:
	@echo "Stopping backend (8080) and frontend (3000)..."
	@lsof -ti :8080 | xargs kill -9 || echo "No process on port 8080"
	@lsof -ti :3000 | xargs kill -9 || echo "No process on port 3000"