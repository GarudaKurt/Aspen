import "server-only";
import { revalidateTag } from "next/cache";

export const CATALOG_TAG = "public-business-catalog";
export function invalidatePublicCatalog() {
  revalidateTag(CATALOG_TAG, { expire: 0 });
}
