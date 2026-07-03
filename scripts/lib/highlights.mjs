const keyFor = (item) => item?.code || `${item?.sourceKey || ""}:${item?.name || ""}`;

const score = (item) =>
  (item.dayIsNew ? Math.max(0, 40 - Number(item.rank || 40)) : 0) +
  Math.max(0, Number(item.dayDelta || 0)) * 10 +
  Math.max(0, -Number(item.dayPriceChange || 0)) / 100;

export function selectTodayHighlights(items = [], limit = 3) {
  const seen = new Set();
  const changed = items
    .filter((item) => {
      const key = keyFor(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return item?.dayComparisonReady &&
        (item.dayIsNew || Number(item.dayDelta || 0) > 0 || Number(item.dayPriceChange || 0) < 0);
    })
    .sort((a, b) => score(b) - score(a));

  const games = changed.filter((item) => item.categoryKey === "games");
  if (games.length < 2) return changed.slice(0, limit);

  const selected = games.slice(0, Math.min(2, limit));
  const selectedKeys = new Set(selected.map(keyFor));
  return [
    ...selected,
    ...changed.filter((item) => !selectedKeys.has(keyFor(item)))
  ].slice(0, limit);
}
