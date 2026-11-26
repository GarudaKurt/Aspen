import "server-only";
import { unstable_cache } from "next/cache";
import * as queries from "./queries";
import { CATALOG_TAG } from "./catalog-invalidation";

// Only these anonymous, RLS-filtered reads may enter the shared Next data cache.
const namespace = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "unconfigured";
const policy = { tags: [CATALOG_TAG], revalidate: 60 };
export const getPublishedBusinessCards = unstable_cache(queries.getPublishedBusinessCards, [namespace, "public-cards-v1"], policy);
export const getPublishedBusiness = unstable_cache(queries.getPublishedBusiness, [namespace, "public-profile-v1"], policy);
export const getPublishedBusinessServices = unstable_cache(queries.getPublishedBusinessServices, [namespace, "public-services-v1"], policy);
