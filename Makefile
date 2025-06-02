# From the root directory, run: make start
# This runs both the backend and frontend servers in parallel.

.PHONY: start backend frontend

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
