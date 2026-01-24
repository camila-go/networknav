/**
 * Security Module Exports
 * 
 * This module provides security utilities for the application:
 * - Rate limiting
 * - CSRF protection
 * - Content moderation
 */

// Rate limiting
export {
  checkRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  withRateLimit,
  RATE_LIMITS,
  type RateLimitAction,
} from './rateLimit';

// CSRF protection
export {
  generateCsrfToken,
  validateCsrfToken,
  withCsrfProtection,
  setCsrfCookie,
  getOrCreateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from './csrf';

// Content moderation
export {
  moderateContent,
  moderateMultiple,
  moderateProfile,
  containsHarmfulContent,
  sanitizeText,
  type ModerationResult,
} from './contentModeration';

