FROM golang:1.23

# Required to use CGO + SQLite
ENV CGO_ENABLED=1

# Install system packages needed for SQLite
RUN apt-get update && \
    apt-get install -y gcc sqlite3 libsqlite3-dev make

# Set up Go work directory
WORKDIR /go-migrate

# Install migrate CLI with SQLite support
RUN go install -tags 'sqlite3' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Expose the migrate binary
ENTRYPOINT ["/go/bin/migrate"]
