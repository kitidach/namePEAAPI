import { getOfficeByCode } from "../../../../_shared/office-service";
import { successResponse, errorResponse, jsonResponse } from "../../../../_shared/response";

export const onRequestGet: PagesFunction<unknown, "code"> = async ({ params }) => {
  const code = (params.code as string || "").trim();

  if (!code || code.length > 20) {
    return jsonResponse(errorResponse("INVALID_QUERY", "Invalid office code"), 400, "none");
  }

  const office = getOfficeByCode(code);
  if (!office) {
    return jsonResponse(errorResponse("OFFICE_NOT_FOUND", `Office '${code}' not found`), 404, "none");
  }
  return jsonResponse(successResponse(office), 200, "static");
};
