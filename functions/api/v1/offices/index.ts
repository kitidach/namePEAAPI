import { queryOffices } from "../../../_shared/office-service";
import { successResponse, errorResponse, paginationMeta, jsonResponse } from "../../../_shared/response";
import { OfficeQueryParams } from "../../../_shared/types";

const ALLOWED_SORTS = ["code", "shortName", "fullName", "size", "index", "groupCode"] as const;
const ALLOWED_SIZES = ["L", "M", "S", "XS"] as const;
const MAX_LIMIT = 200;

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const params = url.searchParams;

  // ─── Validate & parse inputs ───
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const rawLimit = parseInt(params.get("limit") || "50", 10) || 50;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));

  const rawSort = params.get("sort") || "index";
  if (rawSort && !(ALLOWED_SORTS as readonly string[]).includes(rawSort)) {
    return jsonResponse(
      errorResponse("INVALID_QUERY", `Invalid sort field: '${rawSort}'. Allowed: ${ALLOWED_SORTS.join(", ")}`),
      400, "none"
    );
  }
  const sort = rawSort;

  const order = params.get("order") === "desc" ? "desc" : "asc";

  const rawSize = params.get("size")?.toUpperCase();
  if (rawSize && !(ALLOWED_SIZES as readonly string[]).includes(rawSize)) {
    return jsonResponse(
      errorResponse("INVALID_QUERY", `Invalid size: '${rawSize}'. Allowed: ${ALLOWED_SIZES.join(", ")}`),
      400, "none"
    );
  }

  const q = params.get("q")?.trim();
  if (q && q.length > 100) {
    return jsonResponse(
      errorResponse("INVALID_QUERY", "Search query too long (max 100 characters)"),
      400, "none"
    );
  }

  const queryParams: OfficeQueryParams = {
    q: q || undefined,
    size: rawSize || undefined,
    parent8: params.get("parent8") || undefined,
    parent17: params.get("parent17") || undefined,
    parent43: params.get("parent43") || undefined,
    region: params.get("region") || undefined,
    groupCode: params.get("groupCode") || undefined,
    page, limit, sort, order,
  };

  const { results, total } = queryOffices(queryParams);
  const meta = paginationMeta(total, page, limit);
  return jsonResponse(successResponse(results, meta), 200, "query");
};
