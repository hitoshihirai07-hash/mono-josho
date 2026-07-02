export type RankingItem = {
  code?: string;
  rank?: number | string;
  previousRank?: number | string | null;
  delta?: number;
  isNew?: boolean;
  name?: string;
  price?: number | string;
  previousPrice?: number | string | null;
  priceChange?: number | null;
  previousComparisonReady?: boolean;
  dayComparisonReady?: boolean;
  dayPreviousRank?: number | string | null;
  dayDelta?: number;
  dayIsNew?: boolean;
  dayPreviousPrice?: number | string | null;
  dayPriceChange?: number | null;
  weekComparisonReady?: boolean;
  weekPreviousRank?: number | string | null;
  weekDelta?: number;
  weekIsNew?: boolean;
  weekPreviousPrice?: number | string | null;
  weekPriceChange?: number | null;
  image?: string;
  reviewAverage?: number | string | null;
  reviewCount?: number | string;
  category?: string;
  categoryKey?: string;
  sourceKey?: string;
  sourceLabel?: string;
  genreId?: string;
  platformKey?: string;
  platformLabel?: string;
  itemTypeKey?: string;
  itemTypeLabel?: string;
  url?: string;
  affiliateUrl?: string;
  shopName?: string;
  fetchedAt?: string;
};

export type RankingChangeKey = "new" | "rising" | "falling" | "price-drop";
export type RankingComparisonWindow = "latest" | "day" | "week";

export type RankingPayload = {
  updatedAt?: string | null;
  status?: string;
  items?: RankingItem[];
};

export type RankingGroup = {
  key: string;
  label: string;
  shortLabel?: string;
  href: string;
  description: string;
  items: RankingItem[];
};

export const platformDefinitions = [
  {
    key: "overall",
    label: "テレビゲーム総合",
    shortLabel: "総合",
    href: "/games/#overall-ranking",
    description: "楽天のテレビゲーム総合ジャンルのランキングです。"
  },
  {
    key: "switch",
    label: "Nintendo Switchランキング",
    shortLabel: "Switch",
    href: "/games/switch/",
    description: "楽天のNintendo Switchジャンルから取得するSwitch専用ランキングです。"
  },
  {
    key: "playstation",
    label: "PlayStationランキング",
    shortLabel: "PS5 / PS4",
    href: "/games/playstation/",
    description: "PS5ランキングとPS4ランキングを混ぜずに別々に確認できます。"
  }
] as const;

export const gameSourceDefinitions = [
  {
    key: "games-overall",
    label: "テレビゲーム総合ランキング",
    shortLabel: "総合",
    href: "/games/#overall-ranking",
    description: "楽天のテレビゲーム総合ジャンルから取得します。"
  },
  {
    key: "switch",
    label: "Nintendo Switchランキング",
    shortLabel: "Switch",
    href: "/games/switch/",
    description: "楽天のNintendo Switchジャンルから取得します。"
  },
  {
    key: "ps5",
    label: "PlayStation 5ランキング",
    shortLabel: "PS5",
    href: "/games/playstation/#ps5-ranking",
    description: "楽天のプレイステーション5ジャンルから取得します。"
  },
  {
    key: "ps4",
    label: "PlayStation 4ランキング",
    shortLabel: "PS4",
    href: "/games/playstation/#ps4-ranking",
    description: "楽天のプレイステーション4ジャンルから取得します。"
  }
] as const;

export const typeDefinitions = [
  {
    key: "software",
    label: "ゲームソフト",
    description: "発売中・予約受付中のソフト、限定版、特典付き商品。"
  },
  {
    key: "hardware",
    label: "本体・セット",
    description: "ゲーム機本体、本体セット、同梱版。"
  },
  {
    key: "accessory",
    label: "周辺機器",
    description: "コントローラー、ケース、保護用品、充電機器など。"
  },
  {
    key: "other",
    label: "その他",
    description: "分類しきれないゲーム関連商品。"
  }
] as const;

const toComparableText = (value = "") =>
  value.toString().toLowerCase().replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );

export const formatUpdated = (updatedAt?: string | null, fallback = "更新準備中") => {
  if (!updatedAt) return fallback;

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo"
  }).format(new Date(updatedAt)).replaceAll("/", ".");
};

export const formatPublishedDate = (updatedAt?: string | null, fallback = "データ更新待ち") => {
  if (!updatedAt) return fallback;

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "long",
    timeZone: "Asia/Tokyo"
  }).format(new Date(updatedAt));
};

export const getAllItems = (ranking: RankingPayload): RankingItem[] =>
  Array.isArray(ranking.items) ? ranking.items : [];

export const sortByRank = (items: RankingItem[] = []) =>
  [...items].sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));

export const getStationeryItems = (ranking: RankingPayload) =>
  sortByRank(
    getAllItems(ranking).filter((item) => !item.categoryKey || item.categoryKey === "stationery")
  );

export const getNewItems = (ranking: RankingPayload, limit = 3) =>
  sortByRank(getAllItems(ranking).filter((item) => item.isNew)).slice(0, limit);

export const getRisingItems = (ranking: RankingPayload, limit = 3) =>
  getChangeItems(getAllItems(ranking), "rising", limit);

export const getFallingItems = (ranking: RankingPayload, limit = 3) =>
  getChangeItems(getAllItems(ranking), "falling", limit);

export const getPriceDropItems = (ranking: RankingPayload, limit = 3) =>
  getChangeItems(getAllItems(ranking), "price-drop", limit);

export const getChangeItems = (
  items: RankingItem[] = [],
  changeKey: RankingChangeKey,
  limit = 10,
  comparisonWindow: RankingComparisonWindow = "latest"
) => {
  const filtered = items.filter((item) => {
    const values = getComparisonValues(item, comparisonWindow);
    if (!values.ready) return false;
    if (changeKey === "new") return values.isNew;
    if (changeKey === "rising") return !values.isNew && values.delta > 0;
    if (changeKey === "falling") return !values.isNew && values.delta < 0;
    return !values.isNew && values.priceChange < 0;
  });

  const sorted = [...filtered].sort((a, b) => {
    const aValues = getComparisonValues(a, comparisonWindow);
    const bValues = getComparisonValues(b, comparisonWindow);
    if (changeKey === "rising") {
      return bValues.delta - aValues.delta || Number(a.rank || 9999) - Number(b.rank || 9999);
    }

    if (changeKey === "falling") {
      return aValues.delta - bValues.delta || Number(a.rank || 9999) - Number(b.rank || 9999);
    }

    if (changeKey === "price-drop") {
      return aValues.priceChange - bValues.priceChange || Number(a.rank || 9999) - Number(b.rank || 9999);
    }

    return Number(a.rank || 9999) - Number(b.rank || 9999);
  });

  return sorted.slice(0, limit);
};

export const getComparisonValues = (
  item: RankingItem,
  comparisonWindow: RankingComparisonWindow = "latest"
) => {
  if (comparisonWindow === "day") {
    return {
      ready: Boolean(item.dayComparisonReady),
      previousRank: item.dayPreviousRank,
      delta: Number(item.dayDelta || 0),
      isNew: Boolean(item.dayIsNew),
      previousPrice: item.dayPreviousPrice,
      priceChange: Number(item.dayPriceChange || 0)
    };
  }

  if (comparisonWindow === "week") {
    return {
      ready: Boolean(item.weekComparisonReady),
      previousRank: item.weekPreviousRank,
      delta: Number(item.weekDelta || 0),
      isNew: Boolean(item.weekIsNew),
      previousPrice: item.weekPreviousPrice,
      priceChange: Number(item.weekPriceChange || 0)
    };
  }

  return {
    ready: Boolean(item.previousComparisonReady ?? item.previousRank ?? item.isNew),
    previousRank: item.previousRank,
    delta: Number(item.delta || 0),
    isNew: Boolean(item.isNew),
    previousPrice: item.previousPrice,
    priceChange: Number(item.priceChange || 0)
  };
};

export const comparisonLabel = (comparisonWindow: RankingComparisonWindow) => {
  if (comparisonWindow === "day") return "24時間前";
  if (comparisonWindow === "week") return "7日前";
  return "前回取得";
};

export const getPlatformRankingItems = (ranking: RankingPayload) =>
  getGameItems(ranking).filter((item) => ["switch", "ps5", "ps4"].includes(item.sourceKey || ""));

export const dedupeByCode = (items: RankingItem[] = []) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const code = item.code || `${item.sourceKey}:${item.name}`;
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
};

export const getTodayHighlights = (items: RankingItem[] = [], limit = 3) => {
  const candidates = dedupeByCode(
    items.filter((item) => ["switch", "ps5", "ps4"].includes(item.sourceKey || ""))
  );
  const changed = candidates
    .filter((item) => {
      const values = getComparisonValues(item, "day");
      return values.ready && (values.isNew || values.delta > 0 || values.priceChange < 0);
    })
    .sort((a, b) => {
      const aValues = getComparisonValues(a, "day");
      const bValues = getComparisonValues(b, "day");
      const score = (values: ReturnType<typeof getComparisonValues>, item: RankingItem) =>
        (values.isNew ? Math.max(0, 40 - Number(item.rank || 40)) : 0) +
        Math.max(0, values.delta) * 10 +
        Math.max(0, -values.priceChange) / 100;
      return score(bValues, b) - score(aValues, a);
    });

  if (changed.length >= limit) return changed.slice(0, limit);
  const used = new Set(changed.map((item) => item.code));
  const leaders = candidates
    .filter((item) => !used.has(item.code))
    .sort((a, b) => Number(a.rank || 9999) - Number(b.rank || 9999));
  return [...changed, ...leaders].slice(0, limit);
};

export const getNextUpdateLabel = (updatedAt?: string | null) => {
  const base = updatedAt ? new Date(updatedAt) : new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(base);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const hour = value("hour");
  const nextHour = [8, 13, 20].find((candidate) => candidate > hour);
  return nextHour ? `本日 ${String(nextHour).padStart(2, "0")}:00頃` : "翌日 08:00頃";
};

export const detectGamePlatform = (name = "") => {
  const text = toComparableText(name);

  if (/(nintendo switch|switch|スイッチ|任天堂|joy-con|joycon|プロコン)/.test(text)) {
    return { platformKey: "switch", platformLabel: "Nintendo Switch" };
  }

  if (/(playstation|プレイステーション|プレステ|ps5|ps 5|ps4|ps 4|dualshock|dualsense)/.test(text)) {
    return { platformKey: "playstation", platformLabel: "PlayStation" };
  }

  return { platformKey: "overall", platformLabel: "テレビゲーム総合" };
};

export const detectGameType = (name = "") => {
  const text = toComparableText(name);

  if (/(本体|console|同梱版|ディスクドライブ|digital edition)/.test(text)) {
    return { itemTypeKey: "hardware", itemTypeLabel: "本体・セット" };
  }

  if (
    /(コントローラー|joy-con|joycon|dualsense|dualshock|プロコン|周辺機器|ケース|保護|フィルム|充電|スタンド|ケーブル|カバー|収納|ヘッドセット|micro.?sd|メモリーカード)/.test(text)
  ) {
    return { itemTypeKey: "accessory", itemTypeLabel: "周辺機器" };
  }

  if (/(ソフト|ゲーム|版|特典|予約|パッケージ|ダウンロード)/.test(text)) {
    return { itemTypeKey: "software", itemTypeLabel: "ゲームソフト" };
  }

  return { itemTypeKey: "other", itemTypeLabel: "その他" };
};

export const enrichGameItem = (item: RankingItem): RankingItem => {
  const platform = item.platformKey && item.platformLabel
    ? { platformKey: item.platformKey, platformLabel: item.platformLabel }
    : detectGamePlatform(item.name);
  const type = item.itemTypeKey && item.itemTypeLabel
    ? { itemTypeKey: item.itemTypeKey, itemTypeLabel: item.itemTypeLabel }
    : detectGameType(item.name);

  return {
    ...item,
    ...platform,
    ...type
  };
};

export const getGameItems = (ranking: RankingPayload) =>
  sortByRank(
    getAllItems(ranking)
      .filter((item) => item.categoryKey === "games")
      .map(enrichGameItem)
  );

export const getGameOverallItems = (ranking: RankingPayload) =>
  sortByRank(
    getGameItems(ranking).filter((item) => !item.sourceKey || item.sourceKey === "games-overall")
  );

export const getGameSourceItems = (ranking: RankingPayload, sourceKey: string) =>
  sortByRank(getGameItems(ranking).filter((item) => item.sourceKey === sourceKey));

export const getGameSourceGroups = (items: RankingItem[] = []) =>
  gameSourceDefinitions.map((definition) => ({
    ...definition,
    items: sortByRank(items.filter((item) => item.sourceKey === definition.key))
  }));

export const getPlatformGroups = (items: RankingItem[] = []): RankingGroup[] =>
  platformDefinitions.map((definition) => ({
    ...definition,
    items: sortByRank(items.filter((item) => (item.platformKey || "overall") === definition.key))
  }));

export const getTypeGroups = (items: RankingItem[] = []) =>
  typeDefinitions.map((definition) => ({
    ...definition,
    items: sortByRank(items.filter((item) => (item.itemTypeKey || "other") === definition.key))
  }));

export const getPlatformItems = (ranking: RankingPayload, platformKey: string) =>
  getGameItems(ranking).filter((item) => (item.platformKey || "overall") === platformKey);

export const getItemUrl = (item: RankingItem) => item.affiliateUrl || item.url || "";

export const createItemListSchema = (items: RankingItem[], pageUrl: string) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  url: pageUrl,
  itemListElement: items.slice(0, 10).map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    url: getItemUrl(item) || pageUrl
  }))
});
