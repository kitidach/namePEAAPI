import { dataStore } from "../../_shared/data-loader";
import { successResponse, jsonResponse } from "../../_shared/response";
import { HierarchyNode } from "../../_shared/types";

export const onRequestGet: PagesFunction = async ({ request }) => {
  const url = new URL(request.url);
  let tree = dataStore.hierarchy;

  const parent8Filter = url.searchParams.get("parent8");
  if (parent8Filter) {
    const filtered: HierarchyNode[] = tree.children.filter(
      (g8) => g8.id === parent8Filter || g8.name === parent8Filter
    );
    tree = { region: tree.region, children: filtered };
  }

  const gcFilter = url.searchParams.get("groupCode");
  if (gcFilter) {
    const filteredChildren: HierarchyNode[] = [];
    for (const g8 of tree.children) {
      const matched = (g8.children || []).filter((g17) => g17.code === gcFilter);
      if (matched.length > 0) filteredChildren.push({ ...g8, children: matched });
    }
    tree = { region: tree.region, children: filteredChildren };
  }

  return jsonResponse(successResponse(tree), 200, "static");
};
