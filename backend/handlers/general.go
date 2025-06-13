package handlers

import (
	"fmt"
	"net/http"
	"social_network/middleware"
)

// HomeHandler handles the root endpoint
func HomeHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	fmt.Println("general.go called using url:", r.URL)
	fmt.Fprintf(w, "Greetings from Social Network Server")
}
