import { WishlistView } from "@/features/favorites/components/wishlist-view";
import { getPublishedBusinessCards } from "@/features/tenancy/api/queries";
export const dynamic = "force-dynamic";
export default async function WishlistPage() {
  const result = await getPublishedBusinessCards().then(
    (availableBusinesses) => ({ availableBusinesses, error: undefined }),
    () => ({ availableBusinesses: [], error: "Your saved businesses could not be loaded. Please refresh to try again." }),
  );
  return <WishlistView {...result} />;
}
