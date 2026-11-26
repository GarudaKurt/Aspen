import { WishlistView } from "@/features/favorites/components/wishlist-view";
import { getPublishedBusinessCards } from "@/features/tenancy/api/public-catalog";
export const revalidate = 0;
export default async function WishlistPage() {
  const result = await getPublishedBusinessCards().then(
    (availableBusinesses) => ({ availableBusinesses, error: undefined }),
    () => ({ availableBusinesses: [], error: "Your saved businesses could not be loaded. Please refresh to try again." }),
  );
  return <WishlistView {...result} />;
}
