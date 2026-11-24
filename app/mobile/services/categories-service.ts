import { useCallback, useEffect, useState } from "react";

import {
  addCategory as addCategoryToRepository,
  DEFAULT_CATEGORIES,
  listCategories,
} from "@/repositories/categories-repository";

export function useCategoriesService() {
  const [categories, setLocalCategories] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const storedCategories = await listCategories();
        if (!active) return;
        setLocalCategories(
          storedCategories.length > 0 ? storedCategories : DEFAULT_CATEGORIES,
        );
      } catch (error) {
        console.error("Failed to load categories", error);
        if (active) setLocalCategories(DEFAULT_CATEGORIES);
      } finally {
        if (active) setIsReady(true);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const addCategory = useCallback(async (value: string) => {
    const name = value.trim();
    if (!name) throw new Error("Category name cannot be empty.");
    // Persist first so the category can be used right away.
    await addCategoryToRepository(name);
    setLocalCategories((current) =>
      current.some((c) => c.toLowerCase() === name.toLowerCase())
        ? current
        : [...current, name],
    );
    return name;
  }, []);

  return { categories, isReady, addCategory };
}
