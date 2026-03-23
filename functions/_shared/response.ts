import { ApiSuccessResponse, ApiErrorResponse, PaginationMeta } from "./types";

export function successResponse<T>(
  data: T,
  meta: PaginationMeta | null = null
): ApiSuccessResponse<T> {
  return { success: true, data, meta, error: null };
}

export function errorResponse(code: string, message: string): ApiErrorResponse {
  return { success: false, data: null, meta: null, error: { code, message } };
}

export function paginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

// ─── Tiered Cache Control ───────────────────────────────────────────
// Static data (rarely changes): long cache with revalidation
// Dynamic queries (search/filter): shorter cache
// Errors: no caching

const CACHE_STATIC = "public, max-age=3600, stale-while-revalidate=7200";
const CACHE_QUERY  = "public, max-age=300, stale-while-revalidate=600";
const CACHE_NONE   = "no-store";

export type CacheTier = "static" | "query" | "none";

const CACHE_MAP: Record<CacheTier, string> = {
  static: CACHE_STATIC,
  query: CACHE_QUERY,
  none: CACHE_NONE,
};

/** Create a JSON Response with proper headers and tiered caching */
export function jsonResponse(
  body: unknown,
  status: number = 200,
  cache: CacheTier = "query",
  extraHeaders: Record<string, string> = {}
): Response {
  // Never cache error responses
  const effectiveCache = status >= 400 ? CACHE_MAP.none : CACHE_MAP[cache];

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": effectiveCache,
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}
