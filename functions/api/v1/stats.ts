import { dataStore } from "../../_shared/data-loader";
import { successResponse, jsonResponse } from "../../_shared/response";

export const onRequestGet: PagesFunction = async () => {
  const offices = dataStore.offices;
  const sizeCount: Record<string, number> = { L: 0, M: 0, S: 0, XS: 0 };
  const group8Count: Record<string, number> = {};
  const groupCodeCount: Record<string, number> = {};

  for (const o of offices) {
    sizeCount[o.size] = (sizeCount[o.size] || 0) + 1;
    const g8 = o.parent8Name || "unknown";
    group8Count[g8] = (group8Count[g8] || 0) + 1;
    const gc = o.groupCode || "unknown";
    groupCodeCount[gc] = (groupCodeCount[gc] || 0) + 1;
  }

  return jsonResponse(
    successResponse({
      totalOffices: offices.length,
      bySize: sizeCount,
      byGroup8: group8Count,
      byGroupCode: groupCodeCount,
      totalGroups8: dataStore.groups8.length,
      totalGroups17: dataStore.groups17.length,
      totalGroups43: dataStore.groups43.length,
      region: dataStore.region,
    }),
    200,
    "static"
  );
};
