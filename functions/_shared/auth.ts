import { errorResponse, jsonResponse } from "./response";

/**
 * API Key Authentication Helper
 *
 * Validates requests against the API_KEY environment secret.
 * Designed for Cloudflare Pages Functions (edge runtime).
 *
 * Usage modes:
 *   - OPTIONAL: validateApiKey() — returns { valid, response? }
 *   - REQUIRED: requireApiKey()  — returns Response | null
 */

interface AuthResult {
  valid: boolean;
  response?: Response;
}

interface Env {
  API_KEY?: string;
}

/**
 * Validate API key (optional mode).
 * Returns { valid: true } if key is valid OR if no key is configured.
 * Returns { valid: false, response } if key is provided but wrong.
 *
 * Use this when the endpoint should work without a key,
 * but reject explicitly bad keys.
 */
export function validateApiKey(request: Request, env: Env): AuthResult {
  const provided = request.headers.get("x-api-key");
  const expected = env?.API_KEY;

  // If no API_KEY configured in env, allow all requests
  if (!expected) {
    return { valid: true };
  }

  // If client didn't send a key, allow (optional mode)
  if (!provided) {
    return { valid: true };
  }

  // If client sent a key, it must match
  if (timingSafeEqual(provided, expected)) {
    return { valid: true };
  }

  return {
    valid: false,
    response: jsonResponse(
      errorResponse("UNAUTHORIZED", "Invalid API key"),
      401, "none"
    ),
  };
}

/**
 * Require API key (strict mode).
 * Returns null if valid, or a 401 Response if invalid/missing.
 *
 * Use this for endpoints that MUST be protected.
 *
 * Example:
 *   const denied = requireApiKey(request, env);
 *   if (denied) return denied;
 */
export function requireApiKey(request: Request, env: Env): Response | null {
  const provided = request.headers.get("x-api-key");
  const expected = env?.API_KEY;

  // If no API_KEY configured, block all (fail secure)
  if (!expected) {
    console.warn("[Auth] API_KEY not configured — blocking request");
    return jsonResponse(
      errorResponse("UNAUTHORIZED", "API key required"),
      401, "none"
    );
  }

  // Key required but not provided
  if (!provided) {
    return jsonResponse(
      errorResponse("UNAUTHORIZED", "Missing API key. Use header: x-api-key"),
      401, "none"
    );
  }

  // Key must match
  if (timingSafeEqual(provided, expected)) {
    return null; // allowed
  }

  return jsonResponse(
    errorResponse("UNAUTHORIZED", "Invalid API key"),
    401, "none"
  );
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Falls back to simple comparison if crypto.subtle is unavailable.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  // Use simple XOR comparison (constant time for same-length strings)
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
