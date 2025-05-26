package handlers

import (
	"fmt"
	"net/http"
	"social_network/middleware"
)

// HomeHandler handles the root endpoint
func HomeHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	fmt.Fprintf(w, "Greetings from Social Network Server")
}
