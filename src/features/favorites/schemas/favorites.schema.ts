import { z } from "zod";

export const favoriteBusinessIdSchema = z.string().trim().min(1).max(160);

export const favoritesStateSchema = z.object({
  favoriteIds: z.array(favoriteBusinessIdSchema).transform((ids) => [...new Set(ids)]),
});

export type FavoritesStateData = z.infer<typeof favoritesStateSchema>;
