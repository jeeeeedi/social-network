package utils

import (
	"regexp"
	"strings"
)

// Sanitize removes all HTML tags and escapes angle brackets.
func Sanitize(input string) string {
	// Remove all HTML tags
	re := regexp.MustCompile(`(?i)<.*?>`)
	sanitized := re.ReplaceAllString(input, "")
	// Escape any remaining angle brackets
	sanitized = strings.ReplaceAll(sanitized, "<", "&lt;")
	sanitized = strings.ReplaceAll(sanitized, ">", "&gt;")
	return sanitized
}
