import type { BusinessServiceInput } from "@/features/tenancy/schemas";
import type { ServiceItem } from "./types";

/** Keep files, blob previews and signed image URLs out of Server Actions.
 * Photo bytes and metadata are handled by the dedicated service-photos API.
 */
export function serviceSaveInput(draft: Omit<ServiceItem, "id">, id?: string): BusinessServiceInput {
  return {
    id,
    title: draft.title,
    category: draft.category,
    description: draft.description,
    price: draft.price,
    duration: draft.duration,
    status: draft.status,
    photos: [],
  };
}
