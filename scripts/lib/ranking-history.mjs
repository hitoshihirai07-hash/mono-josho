const HOUR_MS = 60 * 60 * 1000;

export const comparisonKey = (sourceKey, code) => `${sourceKey || "unknown"}:${code || "unknown"}`;

export function compactSnapshot(items = [], fetchedAt = new Date().toISOString()) {
  return {
    fetchedAt,
    items: items.map((item) => ({
      sourceKey: item.sourceKey || item.categoryKey || "unknown",
      code: item.code,
      rank: Number(item.rank),
      price: Number(item.price)
    }))
  };
}

export function appendSnapshot(history = {}, snapshot, limit = 30) {
  const snapshots = Array.isArray(history.snapshots) ? history.snapshots : [];
  return {
    version: 1,
    snapshots: [...snapshots, snapshot]
      .filter((entry) => entry?.fetchedAt && Array.isArray(entry.items))
      .sort((a, b) => new Date(a.fetchedAt).getTime() - new Date(b.fetchedAt).getTime())
      .slice(-limit)
  };
}

export function findComparisonSnapshot(
  snapshots = [],
  now,
  targetHours,
  toleranceHours
) {
  const nowMs = new Date(now).getTime();
  const targetMs = nowMs - targetHours * HOUR_MS;
  const maxDifferenceMs = toleranceHours * HOUR_MS;

  const candidates = snapshots
    .filter((snapshot) => {
      const time = new Date(snapshot?.fetchedAt).getTime();
      return Number.isFinite(time) && time < nowMs;
    })
    .map((snapshot) => ({
      snapshot,
      difference: Math.abs(new Date(snapshot.fetchedAt).getTime() - targetMs)
    }))
    .sort((a, b) => a.difference - b.difference);

  return candidates[0] && candidates[0].difference <= maxDifferenceMs
    ? candidates[0].snapshot
    : null;
}

export function createSnapshotIndex(snapshot) {
  const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
  return new Map(items.map((item) => [comparisonKey(item.sourceKey, item.code), item]));
}

export function sourceHasBaseline(snapshot, sourceKey) {
  return Boolean(snapshot?.items?.some((item) => item.sourceKey === sourceKey));
}

export function buildComparisonFields({
  sourceKey,
  code,
  rank,
  price,
  snapshot,
  prefix
}) {
  const ready = sourceHasBaseline(snapshot, sourceKey);
  const previous = ready
    ? createSnapshotIndex(snapshot).get(comparisonKey(sourceKey, code))
    : null;
  const previousRank = Number(previous?.rank);
  const previousPrice = Number(previous?.price);
  const currentRank = Number(rank);
  const currentPrice = Number(price);
  const hasPreviousRank = Number.isFinite(previousRank) && previousRank > 0;
  const hasPreviousPrice = Number.isFinite(previousPrice) && previousPrice > 0;

  return {
    [`${prefix}ComparisonReady`]: ready,
    [`${prefix}PreviousRank`]: hasPreviousRank ? previousRank : null,
    [`${prefix}Delta`]: hasPreviousRank ? previousRank - currentRank : 0,
    [`${prefix}IsNew`]: ready && !previous,
    [`${prefix}PreviousPrice`]: hasPreviousPrice ? previousPrice : null,
    [`${prefix}PriceChange`]: hasPreviousPrice ? currentPrice - previousPrice : null
  };
}
