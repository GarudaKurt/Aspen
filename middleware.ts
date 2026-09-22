import type { NextRequest } from "next/server";

/**
 * The project does not need request interception yet, but Next.js requires
 * the middleware entrypoint to expose a named middleware function when the
 * file exists.
 */
export function middleware(_request: NextRequest) {
  return undefined;
}

