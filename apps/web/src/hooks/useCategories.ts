import { useQuery } from "@tanstack/react-query";
import type { CategoryDTO } from "@finpilot/shared";
import { api } from "../lib/api";
import { qk } from "../lib/queryKeys";

export function useCategories() {
  const query = useQuery({
    queryKey: qk.categories,
    queryFn: async () => (await api.get<{ items: CategoryDTO[] }>("/categories")).items,
    staleTime: 10 * 60_000,
  });
  const byId = new Map((query.data ?? []).map((c) => [c.id, c]));
  return { ...query, categories: query.data ?? [], byId };
}
