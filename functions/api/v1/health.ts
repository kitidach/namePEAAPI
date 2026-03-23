import { dataStore } from "../../_shared/data-loader";
import { successResponse, jsonResponse } from "../../_shared/response";

export const onRequestGet: PagesFunction = async () => {
  const meta = dataStore.data._meta;
  return jsonResponse(
    successResponse({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: meta.version,
      dataVersion: meta.dataHash || "unknown",
      generatedAt: meta.generatedAt,
      totalOffices: meta.totalOffices || dataStore.offices.length,
      runtime: "cloudflare-pages-functions",
      counts: {
        offices: dataStore.offices.length,
        groups8: dataStore.groups8.length,
        groups17: dataStore.groups17.length,
        groups43: dataStore.groups43.length,
      },
    }),
    200,
    "static"
  );
};
