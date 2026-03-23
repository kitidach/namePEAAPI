import { dataStore } from "../../../_shared/data-loader";
import { successResponse, errorResponse, jsonResponse } from "../../../_shared/response";

const VALID_LEVELS = ["8", "17", "43"] as const;

export const onRequestGet: PagesFunction<unknown, "level"> = async ({ params }) => {
  const level = params.level as string;

  if (!(VALID_LEVELS as readonly string[]).includes(level)) {
    return jsonResponse(
      errorResponse("INVALID_LEVEL", `Invalid group level '${level}'. Use: ${VALID_LEVELS.join(", ")}`),
      400, "none"
    );
  }

  const data = level === "8" ? dataStore.groups8
    : level === "17" ? dataStore.groups17
    : dataStore.groups43;

  return jsonResponse(successResponse(data), 200, "static");
};
