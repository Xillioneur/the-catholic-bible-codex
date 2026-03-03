import { createSerwistRoute } from "@serwist/turbopack";
import { NextRequest, NextResponse } from "next/server";

const { GET: originalGET, generateStaticParams: originalGenerateStaticParams, ...rest } = createSerwistRoute({
  swSrc: "src/sw.ts",
});

export const { dynamic, dynamicParams, revalidate } = rest;

export const generateStaticParams = async () => {
  const params = await originalGenerateStaticParams();
  return params.map((p) => ({
    path: p.path.split("/"),
  }));
};

export const GET = async (
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) => {
  const { path } = await params;
  return originalGET(req, {
    params: Promise.resolve({ path: path.join("/") }),
  }) as Promise<NextResponse>;
};
