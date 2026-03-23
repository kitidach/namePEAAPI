import { dataStore } from "./data-loader";
import { Office, OfficeQueryParams, HierarchyPath } from "./types";
import { matchesSearch } from "./normalize";

export function queryOffices(params: OfficeQueryParams): { results: Office[]; total: number; } {
  let filtered = [...dataStore.offices];

  if (params.q) {
    const q = params.q;
    filtered = filtered.filter((o) => matchesSearch(o.searchTokens, q));
  }
  if (params.size) filtered = filtered.filter((o) => o.size === params.size);
  if (params.parent8) filtered = filtered.filter((o) => o.parent8Id === params.parent8 || o.parent8Name === params.parent8);
  if (params.parent17) filtered = filtered.filter((o) => o.parent17Id === params.parent17 || o.parent17Name === params.parent17);
  if (params.parent43) filtered = filtered.filter((o) => o.parent43Id === params.parent43 || o.parent43Name === params.parent43);
  if (params.region) filtered = filtered.filter((o) => o.regionId === params.region || o.regionName === params.region);
  if (params.groupCode) filtered = filtered.filter((o) => o.groupCode === params.groupCode);

  const sortKey = params.sort as keyof Office;
  const mul = params.order === "desc" ? -1 : 1;
  filtered.sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * mul;
    return String(va).localeCompare(String(vb), "th") * mul;
  });

  const total = filtered.length;
  const start = (params.page - 1) * params.limit;
  return { results: filtered.slice(start, start + params.limit), total };
}

export function getOfficeByCode(code: string) { return dataStore.getOffice(code); }

export function getOfficePath(code: string): HierarchyPath | null {
  const office = dataStore.getOffice(code);
  if (!office) return null;
  return {
    region: dataStore.region,
    group8: dataStore.getGroup8(office.parent8Id) || null,
    group17: dataStore.getGroup17(office.parent17Id) || null,
    group43: dataStore.getGroup43(office.parent43Id) || null,
    office,
  };
}
