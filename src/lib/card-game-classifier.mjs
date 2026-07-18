export const cardGameFranchiseDefinitions = [
  { key: "pokemon", label: "ポケモンカード", pageLabel: "ポケモンカード", slug: "pokemon-card" },
  { key: "yu-gi-oh", label: "遊戯王", pageLabel: "遊戯王カード", slug: "yu-gi-oh" },
  { key: "one-piece", label: "ONE PIECE", pageLabel: "ONE PIECEカードゲーム", slug: "one-piece" },
  { key: "duel-masters", label: "デュエル・マスターズ", pageLabel: "デュエル・マスターズ", slug: "duel-masters" },
  { key: "dragon-ball", label: "ドラゴンボール" },
  { key: "other", label: "その他" }
];

const franchisePatterns = [
  ["pokemon", /(ポケモン|ポケットモンスター|pokemon)/],
  ["yu-gi-oh", /(遊戯王|yu[\s-]?gi[\s-]?oh|yugioh)/],
  ["one-piece", /(one[\s-]?piece|ワンピース)/],
  ["duel-masters", /(デュエル[・\s-]?マスターズ|デュエマ|duel masters)/],
  ["dragon-ball", /(ドラゴンボール|dragon ball)/]
];

const productTypeDefinitions = [
  {
    key: "supply",
    label: "カードサプライ",
    pattern: /(スリーブ|カードケース|デッキケース|ローダー|プロテクター|プレイマット|ファイル|バインダー|収納|保護ケース)/
  },
  {
    key: "deck",
    label: "構築済みデッキ",
    pattern: /(構築済み|スターター(?:セット|デッキ)?|スタートデッキ|デッキセット|deck)/
  },
  {
    key: "box",
    label: "BOX",
    pattern: /(^|[^a-z])box([^a-z]|$)|ボックス|1box|シュリンク付き/
  },
  {
    key: "pack",
    label: "パック",
    pattern: /(拡張パック|ブースターパック|ハイクラスパック|ブースター|pack)/
  },
  {
    key: "single",
    label: "シングルカード",
    pattern: /(シングルカード|カード単品|シングル販売)/
  }
];

const attributeDefinitions = [
  { key: "preorder", label: "予約", pattern: /(予約|発売予定)/ },
  { key: "unopened", label: "未開封", pattern: /(未開封|シュリンク付き)/ }
];

const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0xfee0)
    )
    .replace(/\s+/g, " ")
    .trim();

const labelForFranchise = (key) =>
  cardGameFranchiseDefinitions.find((definition) => definition.key === key)?.label || "その他";

export function classifyCardGameProduct(name = "", caption = "") {
  const text = normalizeText(`${name} ${caption}`);
  const franchiseKey = franchisePatterns.find(([, pattern]) => pattern.test(text))?.[0] || "other";
  const productType = productTypeDefinitions.find((definition) => definition.pattern.test(text)) || {
    key: "other",
    label: "カードゲーム商品"
  };
  const attributes = attributeDefinitions.filter((definition) => definition.pattern.test(text));

  return {
    cardFranchiseKey: franchiseKey,
    cardFranchiseLabel: labelForFranchise(franchiseKey),
    cardProductTypeKey: productType.key,
    cardProductTypeLabel: productType.label,
    cardAttributeKeys: attributes.map((definition) => definition.key),
    cardAttributeLabels: attributes.map((definition) => definition.label)
  };
}

export function getCardGameFilterKeys(item = {}) {
  const classification = item.cardFranchiseKey
    ? item
    : classifyCardGameProduct(item.name || "", item.itemCaption || "");
  return [classification.cardFranchiseKey || "other"];
}
