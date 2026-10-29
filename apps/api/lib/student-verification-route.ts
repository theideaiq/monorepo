import { createAdminClient } from "@repo/database/admin";
import { NextResponse } from "next/server";
import { z } from "zod";
import { corsHeaders } from "./cors";

/**
 * For the /verify/<id> page's calls: the website's origin only, the
 * verification id from the path, and JSON answers with CORS headers.
 */
export const verificationRoute = async (
  request: Request,
  params: Promise<{ id: string }>
) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });
  const id = z.uuid().safeParse((await params).id);
  return {
    admin: createAdminClient(),
    headers,
    id: id.success ? id.data : null,
    json,
  };
};

export const localeSchema = z.enum(["ar", "en"]).default("en");
