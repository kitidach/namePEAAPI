import { dataStore } from "../../../_shared/data-loader";
import { errorResponse, jsonResponse } from "../../../_shared/response";

/**
 * Office Grouping Tool
 * 
 * Takes comma-separated office names and returns a grouped summary.
 * Accepts: shortName, fullName, suffix-only, code, aliases.
 * 
 * Example:
 *   Input:  กฟส.รณ.,กฟส.ภผม.   OR  รณ.,ภผม.   OR  เรณูนคร,ภูผาม่าน
 *   Output: กฟจ.(นพ.,ขก.),กฟส.(ธพ.,ชมพ.,รณ.,ภผม.)
 * 
 * GET /api/v1/tools/group-offices?names=กฟส.รณ.,กฟส.ภผม.
 */

interface OfficeRecord {
  code: string;
  shortName: string;
  fullName: string;
  shortName8: string;
  shortName17: string;
  parent43Name: string;
  parent8Name: string;
  parent17Name: string;
  aliases?: string[];
  [key: string]: unknown;
}

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  const namesParam = url.searchParams.get("names") || "";

  if (!namesParam.trim()) {
    return jsonResponse(
      errorResponse("INVALID_QUERY", "Missing 'names' parameter. Provide comma-separated office names."),
      400, "none"
    );
  }

  const offices = dataStore.offices as unknown as OfficeRecord[];

  // Build multiple lookup maps for flexible input
  const byShortName = new Map<string, OfficeRecord>();
  const byFullName = new Map<string, OfficeRecord>();
  const byCode = new Map<string, OfficeRecord>();
  const bySuffix = new Map<string, OfficeRecord>();
  const byFullSuffix = new Map<string, OfficeRecord>();
  const byAlias = new Map<string, OfficeRecord>();

  for (const o of offices) {
    byShortName.set(o.shortName, o);
    byFullName.set(o.fullName, o);
    byCode.set(o.code, o);

    // suffix from shortName: "กฟส.รณ." → "รณ."
    const suf = extractSuffix(o.shortName);
    if (suf && !bySuffix.has(suf)) bySuffix.set(suf, o);

    // suffix from fullName: "กฟส.เรณูนคร" → "เรณูนคร"
    const fsuf = extractSuffix(o.fullName);
    if (fsuf && !byFullSuffix.has(fsuf)) byFullSuffix.set(fsuf, o);

    // aliases
    if (o.aliases) {
      for (const a of o.aliases) {
        if (!byAlias.has(a)) byAlias.set(a, o);
      }
    }
  }

  /** Resolve any input format to an office */
  function resolveOffice(input: string): OfficeRecord | undefined {
    if (byShortName.has(input)) return byShortName.get(input);
    if (byFullName.has(input)) return byFullName.get(input);
    if (byCode.has(input)) return byCode.get(input);
    if (byAlias.has(input)) return byAlias.get(input);
    if (bySuffix.has(input)) return bySuffix.get(input);
    if (byFullSuffix.has(input)) return byFullSuffix.get(input);
    // Try adding prefix
    for (const pfx of ["กฟส.", "กฟจ."]) {
      if (byShortName.has(pfx + input)) return byShortName.get(pfx + input);
      if (byFullName.has(pfx + input)) return byFullName.get(pfx + input);
    }
    return undefined;
  }

  // Parse input
  const inputNames = namesParam
    .split(/[,，\s]+/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  // Collect groups
  const groupKFJ = new Set<string>();
  const groupKFS = new Set<string>();
  const heads: string[] = [];
  const inputs: string[] = [];
  const notFound: string[] = [];
  const foundOffices: { input: string; matched: string; code: string; shortName8: string; parent17Name: string; parent43Head: string }[] = [];

  for (const name of inputNames) {
    const office = resolveOffice(name);
    if (!office) {
      notFound.push(name);
      continue;
    }

    // 1. Collect parent8 (always กฟจ.)
    const kfj8 = extractSuffix(office.shortName8);
    if (kfj8 && !groupKFJ.has(kfj8)) {
      groupKFJ.add(kfj8);
    }

    // 2. Find intermediate head
    const sn17 = office.shortName17;
    const prefix17 = extractPrefix(sn17);

    if (prefix17 === "กฟส") {
      const headSuffix = extractSuffix(sn17);
      if (headSuffix && !groupKFS.has(headSuffix)) {
        groupKFS.add(headSuffix);
        heads.push(headSuffix);
      }
    } else {
      const parent43Head = byFullName.get(office.parent43Name);
      if (parent43Head && parent43Head.shortName !== office.shortName) {
        const headPrefix = extractPrefix(parent43Head.shortName);
        const headSuffix = extractSuffix(parent43Head.shortName);
        if (headSuffix) {
          if (headPrefix === "กฟจ") {
            if (!groupKFJ.has(headSuffix)) groupKFJ.add(headSuffix);
          } else {
            if (!groupKFS.has(headSuffix)) {
              groupKFS.add(headSuffix);
              heads.push(headSuffix);
            }
          }
        }
      }
    }

    // 3. Add the input office itself
    const inputPrefix = extractPrefix(office.shortName);
    const inputSuffix = extractSuffix(office.shortName);
    if (inputSuffix) {
      if (inputPrefix === "กฟจ") {
        if (!groupKFJ.has(inputSuffix)) groupKFJ.add(inputSuffix);
      } else if (!groupKFS.has(inputSuffix)) {
        groupKFS.add(inputSuffix);
        inputs.push(inputSuffix);
      }
    }

    foundOffices.push({
      input: name,
      matched: office.shortName,
      code: office.code,
      shortName8: office.shortName8,
      parent17Name: office.parent17Name,
      parent43Head: office.parent43Name,
    });
  }

  // Build formatted output
  const parts: string[] = [];
  if (groupKFJ.size > 0) {
    parts.push(`กฟจ.(${[...groupKFJ].join(",")})`);
  }
  if (heads.length > 0 || inputs.length > 0) {
    parts.push(`กฟส.(${[...heads, ...inputs].join(",")})`);
  }

  const formatted = parts.join(",\n");

  return jsonResponse({
    success: true,
    data: {
      formatted,
      detail: {
        กฟจ: [...groupKFJ],
        กฟส: { heads: [...heads], inputs: [...inputs] },
      },
      offices: foundOffices,
      notFound,
    },
    meta: {
      inputCount: inputNames.length,
      foundCount: foundOffices.length,
      notFoundCount: notFound.length,
    },
    error: null,
  }, 200, "none");
};

function extractPrefix(shortName: string): string {
  const match = shortName.match(/^(กฟจ|กฟส|กฟฉ)\./);
  return match ? match[1] : "";
}

function extractSuffix(shortName: string): string {
  const match = shortName.match(/^(?:กฟจ|กฟส|กฟฉ)\.(.*)/);
  return match ? match[1] : shortName;
}
