export const GAME_TYPE_LABELS = {
  software: "ゲームソフト",
  hardware: "本体・セット",
  accessory: "周辺機器",
  download: "ダウンロード版・コード",
  other: "その他"
};

export const GAME_ATTRIBUTE_LABELS = {
  used: "中古",
  imported: "輸入・海外版",
  preorder: "予約商品",
  bonus: "特典付き",
  "hardware-bundle": "本体セット"
};

const normalize = (value = "") =>
  value.toString().normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();

const includesAny = (text, patterns) => patterns.some((pattern) => pattern.test(text));

export function classifyGameProduct(name = "", details = "", context = {}) {
  const text = normalize(`${name} ${details}`);
  const attributes = [];

  const isUsed = includesAny(text, [
    /【中古】|\[中古\]|（中古）|\(中古\)/,
    /中古(?:品|ゲーム|ソフト|本体|版|ps|switch|プレイステーション|ニンテンドー)/,
    /(?:^|\s)used(?:\s+(?:game|console|software))?(?:\s|$)/
  ]);
  const isImported = includesAny(text, [
    /輸入版|海外版|北米版|欧州版|ヨーロッパ版|アジア版|韓国版/,
    /(?:^|\s)(?:import|international|us|usa|european)\s+(?:version|edition)(?:\s|$)/
  ]);
  const isPreorder = includesAny(text, [
    /予約(?:受付|商品|販売|注文|開始|受付中)/,
    /ご予約|発売予定|入荷予約/,
    /pre[\s-]?order/
  ]);
  const hasBonus = includesAny(text, [
    /特典(?:付き|付|あり|同梱)/,
    /購入特典|予約特典|限定特典|封入特典|永久封入特典|初回特典|店舗特典/
  ]);

  if (isUsed) attributes.push("used");
  if (isImported) attributes.push("imported");
  if (isPreorder) attributes.push("preorder");
  if (hasBonus) attributes.push("bonus");

  const hardware = includesAny(text, [
    /ゲーム機本体|本体(?:単品|セット|同梱)?/,
    /デジタル[・\s-]?エディション/,
    /(?:^|\s)console(?:\s|$)/,
    /playstation\s*5\s*pro(?!\s*(?:用|対応))/,
    /nintendo\s*switch\s*2\s*(?:本体|multi-language system)/
  ]);
  const hardwareBundle = hardware && includesAny(text, [
    /本体セット|本体.{0,12}(?:セット|同梱|パック)|同梱版|同梱セット|ダブルパック|2台セット|すぐに遊べるセット/
  ]);
  if (hardwareBundle) attributes.push("hardware-bundle");

  const accessory = includesAny(text, [
    /コントローラー|ゲームパッド|アケコン|ファイトスティック/,
    /joy[\s-]?con|dual[\s-]?sense|dual[\s-]?shock|プロコン/,
    /周辺機器|ディスクドライブ|ヘッドセット/,
    /(?:保護|液晶)フィルム|収納ケース|本体ケース|充電スタンド|充電器/,
    /micro[\s-]?sd|メモリーカード|usbプロケーブル/
  ]);
  const download = includesAny(text, [
    /ダウンロード版|ダウンロード専用|ダウンロードコード|オンラインコード/,
    /ゲームコード版|プロダクトコード版|コード版/,
    /オンライン利用券|追加コンテンツ|dlc(?:版|コード)/
  ]);
  const software = includesAny(text, [
    /ゲームソフト|ソフト(?:単品|のみ)?/,
    /パッケージ版|通常版|限定版|豪華版/,
    /コレクターズ(?:エディション|版)/,
    /【(?:switch|ps5|ps4)】|\[(?:switch|ps5|ps4)\]/
  ]) || (
    ["switch", "ps5", "ps4"].includes(context?.sourceKey) &&
    (isUsed || isImported || isPreorder || hasBonus)
  );

  let itemTypeKey = "other";
  if (hardware) itemTypeKey = "hardware";
  else if (accessory) itemTypeKey = "accessory";
  else if (download) itemTypeKey = "download";
  else if (software) itemTypeKey = "software";

  const confidence = itemTypeKey === "other"
    ? "low"
    : itemTypeKey === "software" && context?.sourceKey === "games-overall"
      ? "medium"
      : "high";

  return {
    itemTypeKey,
    itemTypeLabel: GAME_TYPE_LABELS[itemTypeKey],
    gameAttributeKeys: [...new Set(attributes)],
    gameAttributeLabels: [...new Set(attributes)].map((key) => GAME_ATTRIBUTE_LABELS[key]),
    gameClassificationConfidence: confidence
  };
}

export function getGameFilterKeys(item = {}) {
  return [...new Set([
    item.itemTypeKey || "other",
    ...(Array.isArray(item.gameAttributeKeys) ? item.gameAttributeKeys : [])
  ])];
}
