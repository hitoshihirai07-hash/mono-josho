export type RankingItem = {
  code?: string;
  rank?: number | string;
  previousRank?: number | string | null;
  delta?: number;
  isNew?: boolean;
  name?: string;
  price?: number | string;
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
  }).format(new Date(updatedAt));
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
  sortByRank(getAllItems(ranking).filter((item) => Number(item.delta || 0) > 0)).slice(0, limit);

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
