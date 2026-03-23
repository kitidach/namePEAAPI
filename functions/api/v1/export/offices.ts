import { buildExport, formatExportResponse, VALID_FORMATS } from "../../../_shared/export-service";
import { errorResponse, jsonResponse } from "../../../_shared/response";

/**
 * PUBLIC export endpoint — no API key required.
 * Used by the dashboard frontend.
 *
 * GET /api/v1/export/offices?format=csv|json&q=...&size=...
 */
export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const format = url.searchParams.get("format") || "json";

  if (!VALID_FORMATS.includes(format)) {
    return jsonResponse(
      errorResponse("INVALID_FORMAT", `Invalid format '${format}'. Use: json, csv`),
      400, "none"
    );
  }

  const result = buildExport(url);
  return formatExportResponse(result);
};
