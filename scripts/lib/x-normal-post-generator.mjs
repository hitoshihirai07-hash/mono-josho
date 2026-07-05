const plainWeightedLength = (value = "") => {
  let length = 0;
  for (const character of String(value)) {
    length += /[\u0000-\u007f]/.test(character) ? 1 : 2;
  }
  return length;
};

const urlPattern = /https?:\/\/[^\s]+/g;

/** XのURL短縮を反映した、おおまかな文字数。 */
export const weightedXLength = (value = "") => {
  const text = String(value);
  let length = 0;
  let cursor = 0;
  for (const match of text.matchAll(urlPattern)) {
    length += plainWeightedLength(text.slice(cursor, match.index));
    length += 23;
    cursor = Number(match.index) + match[0].length;
  }
  return length + plainWeightedLength(text.slice(cursor));
};

export const X_NORMAL_POST_THEMES = [
  { key: "ranking-view", label: "ランキングの見方" },
  { key: "buying-check", label: "買う前の確認" },
  { key: "game-choice", label: "ゲーム選び・遊ぶ時間" },
  { key: "new-and-standard", label: "新作と定番" },
  { key: "observation", label: "観測メモ" }
];

const POSTS = [
  {
    id: "ranking-view-change",
    themeKey: "ranking-view",
    title: "順位より、変化を見る",
    note: "ランキングの数字を使わず、アカウントの見方を伝える投稿です。",
    text: "ランキングで見たいのは、何位かだけではなく「昨日までと比べてどう動いたか」。\n\nずっと強い定番と、急に動き始めた商品では意味が違う。変化があると、理由を見たくなる。"
  },
  {
    id: "ranking-view-hint",
    themeKey: "ranking-view",
    title: "ランキングは答えではなくヒント",
    note: "買いを断定せず、自然にデータを見る姿勢を出せます。",
    text: "順位が上がったからといって、すぐに「買い」とは限らない。\n\nただ、急に動き始めた商品は、何かきっかけがあったのかを見る入口にはなる。ランキングは答えより、気になる商品を探すためのヒントだと思う。"
  },
  {
    id: "ranking-view-mix",
    themeKey: "ranking-view",
    title: "新作だけではない動き",
    note: "新作・定番・周辺機器が混ざる、ゲームランキングらしい話です。",
    text: "ゲームのランキングは、新作だけが動くわけではない。\n\n定番、再販、価格変化、周辺機器。何が混ざっているかを見ると、その日の動きが少し分かりやすい。"
  },
  {
    id: "buying-check-conditions",
    themeKey: "buying-check",
    title: "条件をそろえて比べる",
    note: "価格だけで決めない、買う前の確認投稿です。",
    text: "ゲームを買う時、ランキングや価格だけで決めない方がいいと思う。\n\n同じタイトルでも、新品か中古か、特典付きか、本体セットかで見えている価格はかなり変わる。安く見えた時ほど、内容を一度確認してから選びたい。"
  },
  {
    id: "buying-check-version",
    themeKey: "buying-check",
    title: "同じタイトルでも中身が違う",
    note: "通常版・限定版・中古などを自然に確認するよう促せます。",
    text: "同じゲームでも、通常版・限定版・中古・特典付きで条件はかなり違う。\n\nタイトルと価格だけを見比べるより、何が付くのか、状態はどうかまで確認してから決める方が後悔しにくい。"
  },
  {
    id: "buying-check-playable",
    themeKey: "buying-check",
    title: "遊べる条件も確認",
    note: "対応機種や遊び方にも触れられる、実用寄りの投稿です。",
    text: "買う前に最後に見たいのは、「自分の環境でちゃんと遊べるか」。\n\n対応機種、ダウンロード版かパッケージ版か、必要な容量や周辺機器。気になるタイトルほど、ここを確認してから選びたい。"
  },
  {
    id: "game-choice-time",
    themeKey: "game-choice",
    title: "遊ぶ時間で選ぶ",
    note: "夜の投稿に合う、積みゲーを増やしにくい考え方です。",
    text: "新作を発売日に買う楽しさもあるし、少し待って自分に合うタイミングで買うのも正解。\n\n「今すぐ遊びたいか」「遊ぶ時間を作れそうか」を考えてから選ぶ方が、積みゲーになりにくい気がする。"
  },
  {
    id: "game-choice-finish",
    themeKey: "game-choice",
    title: "最後まで遊べそうか",
    note: "ゲーム選びを少しだけ自分ごとに寄せる投稿です。",
    text: "気になるゲームが増えるほど、「買うか」より「最後まで遊べそうか」を考えるようになった。\n\n短く遊びたい週と、じっくり入り込みたい週では選ぶ一本も変わる。その時の自分に合うゲームを選びたい。"
  },
  {
    id: "game-choice-weekend",
    themeKey: "game-choice",
    title: "週末の一本を決める",
    note: "金曜〜日曜の夜にも使いやすい投稿です。",
    text: "週末に遊ぶ一本を決める時は、新作かどうかより「今の気分に合うか」を大事にしたい。\n\n短時間で区切れるゲーム、じっくり進めたいゲーム。遊べる時間から逆算すると、選びやすくなる。"
  },
  {
    id: "new-and-standard-release",
    themeKey: "new-and-standard",
    title: "発売日に買う楽しさ",
    note: "新作への期待を否定せず、落ち着いた判断も添えられます。",
    text: "発売日に買うワクワクは、やっぱり特別。\n\n一方で、少し情報がそろってから自分に合うか考えるのも悪くない。新作をすぐ遊ぶ楽しさと、待って選ぶ楽しさはどちらもある。"
  },
  {
    id: "new-and-standard-standard",
    themeKey: "new-and-standard",
    title: "定番が動く面白さ",
    note: "ランキングを直接出さずに、定番タイトルの魅力へ触れます。",
    text: "新作が注目される時期でも、長く遊ばれている定番がふと動くのは面白い。\n\n誰かが初めて手に取る時期は、人それぞれ。発売から時間が経ったゲームにも、選ばれる理由が残っている。"
  },
  {
    id: "new-and-standard-wait",
    themeKey: "new-and-standard",
    title: "待つのも選び方",
    note: "値下がりや再販を断定せずに、待つ判断を自然に書けます。",
    text: "気になるゲームをすぐ買うか、少し待つか。\n\n待てば必ず良いとは限らないけれど、遊ぶ予定や欲しい版を整理する時間にはなる。買うタイミングも、ゲーム選びの一部だと思う。"
  },
  {
    id: "observation-sudden",
    themeKey: "observation",
    title: "急に動く商品が気になる",
    note: "モノ上昇便らしい、短い観測メモです。",
    text: "ランキングを見ていて面白いのは、上位の商品より急に動き出した商品の方だったりする。\n\nずっと強い定番ももちろんすごい。でも昨日まで目立たなかったものが上がると、「何かあったのかな」と気になる。"
  },
  {
    id: "observation-search",
    themeKey: "observation",
    title: "見つけ方の変化",
    note: "データを見るアカウントの役割を、宣伝せずに伝えます。",
    text: "ゲームを探す時、最初から欲しい一本が決まっている日もあれば、何となく見ていて気になる一本に出会う日もある。\n\nランキングの変化は、後者のきっかけになりやすい。"
  },
  {
    id: "observation-small-change",
    themeKey: "observation",
    title: "小さな変化にも理由がある",
    note: "大きな上昇だけを追わない姿勢に使えます。",
    text: "大きく順位が動いた日だけでなく、小さな変化が続く商品も気になる。\n\n一日では分からなくても、数日分を見ると流れが見えてくることがある。"
  }
];

const themeLabel = (themeKey) =>
  X_NORMAL_POST_THEMES.find((theme) => theme.key === themeKey)?.label || "夜の通常投稿";

const hash = (value = "") => {
  let result = 0;
  for (const character of String(value)) {
    result = (result * 31 + character.codePointAt(0)) >>> 0;
  }
  return result;
};

const getDateKey = () => new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

/**
 * 夜の通常投稿向けに、ランキングの数値を出さない投稿案を返す。
 * 直近で使ったテンプレートは、候補が残る限り除外する。
 */
export function generateNormalXPostOptions(options = {}) {
  const themeKey = X_NORMAL_POST_THEMES.some((theme) => theme.key === options.themeKey)
    ? options.themeKey
    : "auto";
  const excludedTemplateIds = new Set(
    Array.isArray(options.excludeTemplateIds) ? options.excludeTemplateIds : []
  );
  const limit = Math.min(6, Math.max(1, Number(options.limit || 3)));
  const allByTheme = themeKey === "auto"
    ? POSTS
    : POSTS.filter((post) => post.themeKey === themeKey);
  const available = allByTheme.filter((post) => !excludedTemplateIds.has(post.id));
  const pool = available.length >= Math.min(limit, allByTheme.length) ? available : allByTheme;
  const seed = `${options.seed ?? 0}:${getDateKey()}:${themeKey}`;
  const start = pool.length ? hash(seed) % pool.length : 0;
  const items = pool.length
    ? Array.from({ length: Math.min(limit, pool.length) }, (_, index) => pool[(start + index) % pool.length])
    : [];

  return {
    status: items.length ? "ready" : "empty",
    items: items.map((post) => ({
      ...post,
      themeLabel: themeLabel(post.themeKey),
      weightedLength: weightedXLength(post.text),
      remaining: 280 - weightedXLength(post.text)
    }))
  };
}

export function generateNormalXPost(options = {}) {
  const result = generateNormalXPostOptions({ ...options, limit: 1 });
  const post = result.items[0];
  return post
    ? { status: "ready", ...post }
    : { status: "empty", text: "", weightedLength: 0, remaining: 280 };
}
