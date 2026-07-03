import categoryData from "../data/categories.json";
import {
  getEnabledCategories as getEnabledCategoriesFromConfig,
  getHomeCategories as getHomeCategoriesFromConfig,
  getNavigationItems as getNavigationItemsFromConfig,
  validateCategoryConfig as validateCategoryConfigData
} from "../../scripts/lib/category-config.mjs";

export type CategorySource = {
  sourceKey: string;
  sourceLabel: string;
  displayName: string;
  genreId: string | null;
  envGenreId: string;
  enabled: boolean;
  platformKey?: string;
  platformLabel?: string;
};

export type CategoryChild = {
  id: string;
  displayName: string;
  route: string;
  sortOrder: number;
  enabled: boolean;
  showInNav: boolean;
  sourceKey: string;
};

export type CategoryDefinition = {
  id: string;
  displayName: string;
  shortName: string;
  route: string | null;
  sortOrder: number;
  enabled: boolean;
  parentId: string | null;
  groupId: string;
  showOnHome: boolean;
  showInNav: boolean;
  description: string;
  children: CategoryChild[];
  sources: CategorySource[];
};

export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  categoryId: string;
  sourceKey?: string;
  sortOrder: number;
};

export const categoryConfig = categoryData;
export const categoryConfigErrors = validateCategoryConfigData(categoryData);

export const getEnabledCategories = (): CategoryDefinition[] =>
  getEnabledCategoriesFromConfig(categoryData) as CategoryDefinition[];

export const getHomeCategories = (): CategoryDefinition[] =>
  getHomeCategoriesFromConfig(categoryData) as CategoryDefinition[];

export const getNavigationItems = (): NavigationItem[] =>
  getNavigationItemsFromConfig(categoryData) as NavigationItem[];

export const getCategory = (id: string) =>
  getEnabledCategories().find((category) => category.id === id);

export const getCategoryForSource = (sourceKey?: string) =>
  getEnabledCategories().find((category) =>
    category.sources.some((source) => source.sourceKey === sourceKey)
  );
