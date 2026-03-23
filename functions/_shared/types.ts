// ─── Domain Types ───────────────────────────────────────────────────

export interface Office {
  code: string;
  shortName: string;
  fullName: string;
  size: "L" | "M" | "S" | "XS";
  index: number | null;
  parent43Id: string;
  parent43Name: string;
  parent17Id: string;
  parent17Name: string;
  parent8Id: string;
  parent8Name: string;
  regionId: string;
  regionName: string;
  shortName8: string;
  shortName17: string;
  groupCode: string;
  groupNum: number | null;
  aliases: string[];
  warehouseGroup: string;
  businessTypeCode: string;
  searchTokens: string[];
}

export interface Group8 {
  id: string;
  name: string;
  shortName: string;
  regionId: string;
}

export interface Group17 {
  id: string;
  code: string;
  name: string;
  shortName: string;
  parent8Id: string;
  regionId: string;
}

export interface Group43 {
  id: string;
  name: string;
  shortName: string;
  parent17Id: string;
  parent8Id: string;
  regionId: string;
}

export interface Region {
  id: string;
  code: string;
  name: string;
  shortName: string;
}

export interface HierarchyNode {
  id?: string;
  code?: string;
  name?: string;
  shortName: string;
  fullName?: string;
  size?: string;
  type: "region" | "group8" | "group17" | "group43" | "office";
  children?: HierarchyNode[];
}

export interface MasterData {
  _meta: {
    version: string;
    generatedAt: string;
    sourceFile: string;
    description: string;
    totalOffices?: number;
    dataHash?: string;
  };
  region: Region;
  groups8: Group8[];
  groups17: Group17[];
  groups43: Group43[];
  offices: Office[];
  hierarchy: { region: Region; children: HierarchyNode[]; };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta: PaginationMeta | null;
  error: null;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  meta: null;
  error: { code: string; message: string; };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OfficeQueryParams {
  q?: string;
  size?: string;
  parent8?: string;
  parent17?: string;
  parent43?: string;
  region?: string;
  groupCode?: string;
  page: number;
  limit: number;
  sort: string;
  order: "asc" | "desc";
}

export interface HierarchyPath {
  region: Region;
  group8: Group8 | null;
  group17: Group17 | null;
  group43: Group43 | null;
  office: Office;
}
