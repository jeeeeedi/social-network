package utils

import (
	"errors"
	"regexp"
	"strings"
)

func ValidateEmail(email string) error {
	email = strings.TrimSpace(email)

	if email == "" {
		return errors.New("email is required")
	}

	if len(email) > 254 {
		return errors.New("email too long")
	}

	// Basic email format
	pattern := `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
	if !regexp.MustCompile(pattern).MatchString(email) {
		return errors.New("invalid email format")
	}

	return nil
}

func ValidatePassword(password string) error {
	password = strings.TrimSpace(password)

	if password == "" {
		return errors.New("password is required")
	}

	// Minimum length (industry standard)
	if len(password) < 8 {
		return errors.New("password must be at least 8 characters")
	}

	// Maximum length (prevent DoS attacks)
	if len(password) > 128 {
		return errors.New("password too long")
	}

	return nil
}

// For registration - stronger requirements (commented out for testing)
/*
func ValidatePasswordStrength(password string) error {
	// First do basic validation
	if err := ValidatePassword(password); err != nil {
		return err
	}

	// Check complexity
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
	hasSpecial := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).MatchString(password)

	if !hasUpper {
		return errors.New("password must contain at least one uppercase letter")
	}
	if !hasLower {
		return errors.New("password must contain at least one lowercase letter")
	}
	if !hasNumber {
		return errors.New("password must contain at least one number")
	}
	if !hasSpecial {
		return errors.New("password must contain at least one special character")
	}

	return nil
}
*/
