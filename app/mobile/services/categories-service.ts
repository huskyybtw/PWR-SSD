import { useCallback, useEffect, useState } from "react";

import {
  addCategory as addCategoryToRepository,
  DEFAULT_CATEGORIES,
  listCategories,
  replaceCategories,
} from "@/repositories/categories-repository";

export function useCategoriesService() {
  const [categories, setLocalCategories] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const storedCategories = await listCategories();

      if (!active) return;

      if (storedCategories && storedCategories.length > 0) {
        setLocalCategories(storedCategories);
      } else {
        setLocalCategories(DEFAULT_CATEGORIES);
        await replaceCategories(DEFAULT_CATEGORIES);
      }

      setIsReady(true);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const addCategory = useCallback(async (name: string) => {
    setLocalCategories((current) => {
      if (current.includes(name)) return current;
      const next = [...current, name];
      addCategoryToRepository(name);
      return next;
    });
  }, []);

  return { categories, isReady, addCategory };
}
