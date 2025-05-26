package main

import (
	"fmt"
	"log"
	"net/http"

	// "social_network/db/dbTools"

	_ "github.com/mattn/go-sqlite3"
)

// var db *dbTools.DB

func main() {
	fmt.Println("Starting Social Network on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))

}
