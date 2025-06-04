package handlers

import (
	"encoding/json"
	"net/http"
	"social_network/middleware"
)

// HomeHandler handles the root endpoint
func HomeHandler(w http.ResponseWriter, r *http.Request) {
	middleware.SetCORSHeaders(w)
	w.Header().Set("Content-Type", "application/json")
	response := map[string]string{"message": "Greetings from Social Network Server"}
	json.NewEncoder(w).Encode(response)
}
