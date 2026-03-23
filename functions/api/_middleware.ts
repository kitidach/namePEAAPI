import { errorResponse, jsonResponse } from "../_shared/response";

/**
 * Global middleware for all /api/* routes:
 * - CORS preflight (OPTIONS) — allows x-api-key header
 * - Error boundary (try/catch)
 */
export const onRequest: PagesFunction = async (context) => {
  // Handle CORS preflight
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Error boundary
  try {
    const response = await context.next();
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[API Error]", err);
    return jsonResponse(
      errorResponse("INTERNAL_ERROR", message),
      500, "none"
    );
  }
};
