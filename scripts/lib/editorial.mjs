const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const PLATFORM_LABELS = {
  switch: "Switch",
  ps5: "PS5",
  ps4: "PS4"
};

const toYmd = (date) => {
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0")
  ].join("-");
};

const addDays = (ymd, days) => {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

export function getJstWeekInfo(input = new Date()) {
  const date = new Date(input);
  const shifted = new Date(date.getTime() + JST_OFFSET_MS);
  const day = shifted.getUTCDay() || 7;
  const monday = new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() - day + 1
  ));
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstDay = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 4);
  const week = 1 + Math.round((thursday - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  const weekYear = thursday.getUTCFullYear();
  const startDate = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, "0")}-${String(monday.getUTCDate()).padStart(2, "0")}`;
  const endDate = addDays(startDate, 6);
  const display = (ymd) => {
    const [, month, dayOfMonth] = ymd.split("-").map(Number);
    return `${month}月${dayOfMonth}日`;
  };

  return {
    weekKey: `${weekYear}-W${String(week).padStart(2, "0")}`,
    startDate,
    endDate,
    periodLabel: `${weekYear}年${display(startDate)}〜${display(endDate)}`
  };
}

const uniqueByCode = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.code || seen.has(item.code)) return false;
    seen.add(item.code);
    return true;
  });
};

const sourceItems = (items = []) =>
  uniqueByCode(items.filter((item) => ["switch", "ps5", "ps4"].includes(item.sourceKey)));

const formatPrice = (value) => `¥${Number(value || 0).toLocaleString("ja-JP")}`;

export function selectWeeklyPoints(items = []) {
  const candidates = sourceItems(items);
  const used = new Set();
  const points = [];

  const addPoint = (item, kind, title, body) => {
    if (!item || used.has(item.code)) return false;
    used.add(item.code);
    points.push({
      kind,
      sourceKey: item.sourceKey,
      itemCode: item.code,
      itemName: item.name,
      title,
      body
    });
    return true;
  };

  const rising = [...candidates]
    .filter((item) => item.weekComparisonReady && !item.weekIsNew && Number(item.weekDelta) > 0)
    .sort((a, b) => Number(b.weekDelta) - Number(a.weekDelta) || Number(a.rank) - Number(b.rank))[0];
  if (rising) {
    addPoint(
      rising,
      "rank-rise",
      `${PLATFORM_LABELS[rising.sourceKey]}で${rising.name}が上昇`,
      `${rising.name}は${PLATFORM_LABELS[rising.sourceKey]}ランキングで前週${rising.weekPreviousRank}位から${rising.rank}位へ、${rising.weekDelta}ランク上昇しました。`
    );
  }

  const priceDrop = [...candidates]
    .filter((item) => item.weekComparisonReady && !item.weekIsNew && Number(item.weekPriceChange) < 0)
    .sort((a, b) => Number(a.weekPriceChange) - Number(b.weekPriceChange))[0];
  if (priceDrop) {
    addPoint(
      priceDrop,
      "price-drop",
      `${PLATFORM_LABELS[priceDrop.sourceKey]}で${formatPrice(Math.abs(priceDrop.weekPriceChange))}値下がり`,
      `${priceDrop.name}は前週${formatPrice(priceDrop.weekPreviousPrice)}から${formatPrice(priceDrop.price)}へ、${formatPrice(Math.abs(priceDrop.weekPriceChange))}値下がりしました。`
    );
  }

  const newItem = [...candidates]
    .filter((item) => item.weekComparisonReady && item.weekIsNew)
    .sort((a, b) => Number(a.rank) - Number(b.rank))[0];
  if (newItem) {
    addPoint(
      newItem,
      "new",
      `${PLATFORM_LABELS[newItem.sourceKey]}に${newItem.name}が新登場`,
      `${newItem.name}が${PLATFORM_LABELS[newItem.sourceKey]}ランキング${newItem.rank}位に新しく入りました。`
    );
  }

  const leaders = [...candidates].sort((a, b) => Number(a.rank) - Number(b.rank));
  for (const leader of leaders) {
    if (points.length >= 3) break;
    addPoint(
      leader,
      "leader",
      `${PLATFORM_LABELS[leader.sourceKey]}の上位は${leader.name}`,
      `${leader.name}は現在の${PLATFORM_LABELS[leader.sourceKey]}ランキングで${leader.rank}位、価格は${formatPrice(leader.price)}です。`
    );
  }

  return points.slice(0, 3);
}

export function generateWeeklyEditorial(ranking = {}, overrides = {}, now = new Date()) {
  const week = getJstWeekInfo(now);
  const items = Array.isArray(ranking.items) ? ranking.items : [];
  const automaticPoints = selectWeeklyPoints(items);
  const meaningfulCount = automaticPoints.filter((point) => point.kind !== "leader").length;
  const ready = items.some((item) => item.weekComparisonReady);
  const override = overrides?.weeks?.[week.weekKey] || null;
  const overridePoints = Array.isArray(override?.points)
    ? override.points.filter((point) => point?.title && point?.body).slice(0, 3)
    : [];
  const points = overridePoints.length ? overridePoints : automaticPoints;
  const firstNames = points.slice(0, 2).map((point) => point.itemName || point.title);
  const automaticHeadline = ready
    ? `${week.periodLabel}のゲームランキングで動いた3商品`
    : `${week.periodLabel}のゲームランキング比較を準備中`;
  const automaticSummary = ready && points.length
    ? `${firstNames.join("、")}など、Switch・PS5・PS4の7日間の順位・価格変化を確認します。`
    : "7日前との比較データがそろい次第、実際の商品名・順位差・価格差を自動で掲載します。";
  const updatedAt = ranking.updatedAt || new Date(now).toISOString();

  return {
    weekKey: week.weekKey,
    periodLabel: week.periodLabel,
    headline: override?.headline || automaticHeadline,
    summary: override?.summary || automaticSummary,
    points,
    publishedAt: `${week.startDate}T00:00:00+09:00`,
    updatedAt,
    authorName: override ? "モノ上昇便編集部" : "モノ上昇便データ編集部",
    generationMode: override ? "manual-override" : "automatic",
    comparisonReady: ready,
    archiveEligible: Boolean(overridePoints.length === 3 || (ready && meaningfulCount >= 2 && points.length === 3)),
    dataDisclosure: override
      ? "ランキングデータから作成した自動下書きを編集部が確認・上書きしています。"
      : "楽天市場の機種別ランキングを7日前と比較し、順位・価格の変化から自動生成しています。"
  };
}

export function rotateArchive(current, next, archive = {}) {
  const weeks = Array.isArray(archive.weeks) ? archive.weeks : [];
  if (!current?.weekKey || current.weekKey === next.weekKey || !current.archiveEligible) {
    return { version: 1, weeks };
  }

  const withoutCurrent = weeks.filter((week) => week.weekKey !== current.weekKey);
  return {
    version: 1,
    weeks: [current, ...withoutCurrent].sort((a, b) => b.weekKey.localeCompare(a.weekKey))
  };
}
