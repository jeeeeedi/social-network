# BACKEND DOCKERFILE

FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install build dependencies for CGO
RUN apk add --no-cache gcc musl-dev

COPY backend/go.mod backend/go.sum ./
RUN go mod download && go mod verify

COPY backend/ ./

## No need to install the sqlite3 command-line tool inside the container?
# RUN apk add --no-cache sqlite

# Enable CGO for sqlite3
ENV CGO_ENABLED=1

RUN go build -o server .

# Final image
FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/server .
COPY backend/db ./db
EXPOSE 8080

CMD ["./server"]
