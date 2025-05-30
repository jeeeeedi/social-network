package middleware

import "net/http"

// SetCORSHeaders adds CORS headers to allow React frontend to call Go backend
func SetCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
}

func HandlePreflight(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		SetCORSHeaders(w)
		w.WriteHeader(http.StatusOK)
		return
	}
}

// CORSMiddleware wraps an http.Handler to add CORS headers
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		SetCORSHeaders(w)

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
