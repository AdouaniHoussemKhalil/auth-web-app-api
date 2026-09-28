import { z } from "zod";

export const MAX_PAGE_SIZE = 100;

// Paramètres de pagination (chaîne de requête) : ?page=1&limit=20
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
});

export const consumersListSchema = paginationSchema.extend({
  // Recherche partielle, insensible à la casse, sur l'adresse e-mail.
  email: z.string().trim().min(1).max(254).optional(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export const paginate = <T>(data: T[], total: number, { page, limit }: Pagination) => ({
  data,
  page,
  limit,
  total,
  isSuccess: true,
});
