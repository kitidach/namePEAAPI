export function normalizeSearchQuery(query: string): string {
  if (!query) return "";
  let q = query.trim();
  q = q.replace(/\s+/g, " ");
  return q;
}

export function matchesSearch(tokens: string[], query: string): boolean {
  if (!query) return true;
  const normalized = normalizeSearchQuery(query);
  const noDots = normalized.replace(/\./g, "").trim();
  for (const token of tokens) {
    if (token.includes(normalized)) return true;
    if (noDots && token.replace(/\./g, "").includes(noDots)) return true;
  }
  return false;
}
