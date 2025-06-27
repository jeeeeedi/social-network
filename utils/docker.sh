#!/bin/bash
# filepath: .\social-network\docker.sh

## to run this script, navigate to root then use this command:
# chmod +x docker.sh && ./docker.sh
## OR use Git Bash command directly:
# bash docker.sh

set -e

echo "Stopping and removing running containers (if any)..."
docker-compose down

echo "Pruning stopped containers and dangling images..."
docker container prune -f
docker image prune -f

echo "Building Docker images for backend and frontend..."
docker-compose build

echo "Starting backend and frontend containers..."
docker-compose up

## to stop the containers, use:
# docker-compose down