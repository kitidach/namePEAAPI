import { buildExport, formatExportResponse, VALID_FORMATS } from "../../../../_shared/export-service";
import { requireApiKey } from "../../../../_shared/auth";
import { errorResponse, jsonResponse } from "../../../../_shared/response";

/**
 * PROTECTED export endpoint — requires valid API key.
 * Used by internal systems (n8n, Apps Script, automation).
 *
 * GET /api/v1/internal/export/offices?format=csv|json&q=...&size=...
 * Header: x-api-key: YOUR_KEY
 */

interface Env { API_KEY?: string; }

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  // Require API key — reject immediately if missing/invalid
  const denied = requireApiKey(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";

  if (!VALID_FORMATS.includes(format)) {
    return jsonResponse(
      errorResponse("INVALID_FORMAT", `Invalid format '${format}'. Use: json, csv`),
      400, "none"
    );
  }

  const result = buildExport(url);
  return formatExportResponse(result, { "X-API-Protected": "true" });
};
