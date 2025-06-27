package utils

import (
	"encoding/json"
	"net/http"
)

// SendErrorResponse sends a standardized JSON error response
func SendErrorResponse(w http.ResponseWriter, statusCode int, message string) {
	w.WriteHeader(statusCode)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"message": message,
	})
}

// SendSuccessResponse sends a standardized JSON success response
func SendSuccessResponse(w http.ResponseWriter, data map[string]interface{}) {
	data["success"] = true
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

// GetNotificationStatus converts request status to notification status
func GetNotificationStatus(requestStatus string) string {
	if requestStatus == "declined" {
		return "declined"
	}
	return "read"
}
