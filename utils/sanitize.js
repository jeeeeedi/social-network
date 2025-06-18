export const sanitize = (str) => {
  // Remove script tags
  let sanitized = str.replace(/<script.*?>.*?<\/script>/gi, "");
  // Escape special HTML characters
  sanitized = sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  return sanitized;
};