import { queryOffices } from "./office-service";
import { dataStore } from "./data-loader";

/**
 * Shared export logic for PEA office data.
 * Used by both public and protected export endpoints.
 */

export interface ExportParams {
  q?: string;
  size?: string;
  parent8?: string;
  groupCode?: string;
  sort?: string;
  order?: "asc" | "desc";
  format?: string;
}

export interface ExportResult {
  offices: unknown[];
  totalExported: number;
  filename: string;
  format: "json" | "csv";
}

const CSV_COLUMNS = [
  "code", "shortName", "fullName", "size", "index",
  "parent43Name", "parent17Name", "parent8Name",
  "regionName", "groupCode", "groupNum",
];

/**
 * Build the export dataset from query parameters.
 * Shared by public and protected endpoints.
 */
export function buildExport(url: URL): ExportResult {
  const format = (url.searchParams.get("format") || "json") as "json" | "csv";
  const q = url.searchParams.get("q") || "";
  const size = url.searchParams.get("size") || "";
  const parent8 = url.searchParams.get("parent8") || "";
  const groupCode = url.searchParams.get("groupCode") || "";
  const sort = url.searchParams.get("sort") || "index";
  const order = (url.searchParams.get("order") as "asc" | "desc") || "asc";

  const hasFilters = !!(q || size || parent8 || groupCode || (sort !== "index") || (order !== "asc"));

  let offices;
  if (hasFilters) {
    const { results } = queryOffices({
      q: q || undefined,
      size: size || undefined,
      parent8: parent8 || undefined,
      groupCode: groupCode || undefined,
      sort,
      order,
      page: 1,
      limit: 9999,
    });
    offices = results;
  } else {
    offices = dataStore.offices;
  }

  const date = new Date().toISOString().slice(0, 10);
  const suffix = buildFilenameSuffix(q, size, parent8, groupCode);
  const filename = `pea-offices${suffix}-${date}.${format}`;

  return { offices, totalExported: offices.length, filename, format };
}

/**
 * Format the export result as a downloadable Response.
 */
export function formatExportResponse(
  result: ExportResult,
  extraHeaders: Record<string, string> = {}
): Response {
  const { offices, totalExported, filename, format } = result;

  const baseHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "X-Total-Exported",
    "Cache-Control": "public, max-age=300",
    "X-Total-Exported": String(totalExported),
    ...extraHeaders,
  };

  if (format === "csv") {
    const rows = [CSV_COLUMNS.join(",")];
    for (const o of offices) {
      const row = CSV_COLUMNS.map((h) => {
        const val = (o as unknown as Record<string, unknown>)[h];
        if (val == null) return "";
        const s = String(val);
        return (s.includes(",") || s.includes('"') || s.includes("\n"))
          ? `"${s.replace(/"/g, '""')}"` : s;
      });
      rows.push(row.join(","));
    }
    const bom = "\uFEFF";
    return new Response(bom + rows.join("\r\n"), {
      headers: {
        ...baseHeaders,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return new Response(JSON.stringify(offices, null, 2), {
    headers: {
      ...baseHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/**
 * Build a short, descriptive filename suffix from active filters.
 */
function buildFilenameSuffix(q: string, size: string, parent8: string, groupCode: string): string {
  const parts: string[] = [];
  if (size) parts.push(`size-${size}`);
  if (groupCode) parts.push(`group-${groupCode}`);
  if (parent8) parts.push("parent8");
  if (q) {
    const safe = q.replace(/[^a-zA-Z0-9\u0E00-\u0E7F]/g, "").slice(0, 15);
    if (safe) parts.push(`q-${safe}`);
  }
  if (parts.length === 0) return "-all";
  if (parts.length === 1) return `-${parts[0]}`;
  return "-filtered";
}

/** Valid export formats */
export const VALID_FORMATS = ["json", "csv"];
