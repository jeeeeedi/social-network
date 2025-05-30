package utils

import (
	"log"

	"github.com/gofrs/uuid"
)

func GenerateUUID() (string, error) {
	// Create a Version 4 UUID.
	uu, err := uuid.NewV4()
	if err != nil {
		log.Fatalf("failed to generate UUID: %v", err)
		return "", err
	}
	log.Printf("generated Version 4 UUID %v", uu)
	return uu.String(), nil
}
