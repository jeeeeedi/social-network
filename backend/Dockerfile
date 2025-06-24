FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ ./
RUN go build -o server .

# Final image
FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/server .
COPY backend/db ./db
EXPOSE 8080

CMD ["./server"]
