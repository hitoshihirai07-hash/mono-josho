const byOrder = (a, b) =>
  Number(a?.sortOrder || 9999) - Number(b?.sortOrder || 9999) ||
  String(a?.displayName || "").localeCompare(String(b?.displayName || ""), "ja");

export function validateCategoryConfig(config = {}) {
  const categories = Array.isArray(config.categories) ? config.categories : [];
  const errors = [];
  const categoryIds = new Set();
  const sourceKeys = new Set();

  for (const category of categories) {
    if (!category?.id) {
      errors.push("カテゴリIDがない設定があります。");
      continue;
    }
    if (categoryIds.has(category.id)) {
      errors.push(`カテゴリIDが重複しています: ${category.id}`);
    }
    categoryIds.add(category.id);

    const sources = Array.isArray(category.sources) ? category.sources : [];
    if (category.enabled && !sources.some((source) => source?.enabled)) {
      errors.push(`有効カテゴリに取得元がありません: ${category.id}`);
    }

    for (const source of sources) {
      if (!source?.sourceKey) {
        errors.push(`取得元キーがない設定があります: ${category.id}`);
        continue;
      }
      if (sourceKeys.has(source.sourceKey)) {
        errors.push(`取得元キーが重複しています: ${source.sourceKey}`);
      }
      sourceKeys.add(source.sourceKey);
      if (category.enabled && source.enabled && !source.genreId && !source.envGenreId) {
        errors.push(`有効な取得元に楽天ジャンルIDの指定がありません: ${source.sourceKey}`);
      }
    }
  }

  return errors;
}

export function getEnabledCategories(config = {}) {
  return (Array.isArray(config.categories) ? config.categories : [])
    .filter((category) => category?.enabled)
    .sort(byOrder);
}

export function getHomeCategories(config = {}) {
  return getEnabledCategories(config).filter((category) => category.showOnHome);
}

export function getNavigationItems(config = {}) {
  const items = [];
  for (const category of getEnabledCategories(config)) {
    if (category.showInNav && category.route) {
      items.push({
        id: category.id,
        label: category.shortName || category.displayName,
        href: category.route,
        categoryId: category.id,
        sortOrder: Number(category.sortOrder || 9999)
      });
    }

    for (const child of (Array.isArray(category.children) ? category.children : []).filter(
      (candidate) => candidate?.enabled && candidate?.showInNav && candidate?.route
    ).sort(byOrder)) {
      items.push({
        id: child.id,
        label: child.displayName,
        href: child.route,
        categoryId: category.id,
        sourceKey: child.sourceKey,
        sortOrder: Number(category.sortOrder || 9999) + Number(child.sortOrder || 0) / 1000
      });
    }
  }
  return items.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEnabledRankingSources(config = {}, env = {}) {
  const errors = validateCategoryConfig(config);
  if (errors.length > 0) {
    throw new Error(`カテゴリ設定が不正です:\n- ${errors.join("\n- ")}`);
  }

  return getEnabledCategories(config).flatMap((category) =>
    (Array.isArray(category.sources) ? category.sources : [])
      .filter((source) => source?.enabled)
      .map((source) => {
        const configuredId = source.envGenreId ? env[source.envGenreId] : null;
        const genreId = configuredId || source.genreId;
        if (!genreId) {
          throw new Error(`有効な取得元の楽天ジャンルIDが未設定です: ${source.sourceKey}`);
        }
        return {
          id: String(genreId),
          key: category.id,
          label: source.displayName || category.displayName,
          categoryLabel: category.displayName,
          sourceKey: source.sourceKey,
          sourceLabel: source.sourceLabel,
          platformKey: source.platformKey,
          platformLabel: source.platformLabel
        };
      })
  );
}
