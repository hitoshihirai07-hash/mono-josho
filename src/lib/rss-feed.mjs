const escapeXml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const toRfc822 = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toUTCString();
};

export function isPublishableWeek(week) {
  return Boolean(
    week?.weekKey &&
    week?.archiveEligible &&
    Array.isArray(week.points) &&
    week.points.length === 3
  );
}

export function uniqueWeeks(weeks = []) {
  return weeks
    .filter(isPublishableWeek)
    .filter((week, index, source) =>
      source.findIndex((candidate) => candidate.weekKey === week.weekKey) === index
    )
    .sort((a, b) => b.weekKey.localeCompare(a.weekKey));
}

export function createRssXml({ title, description, site, feedPath, items }) {
  const siteUrl = site instanceof URL ? site : new URL(site);
  const feedUrl = new URL(feedPath, siteUrl).toString();
  const homeUrl = new URL("/", siteUrl).toString();
  const iconUrl = new URL("/brand/header.png", siteUrl).toString();
  const normalizedItems = Array.isArray(items) ? items : [];
  const newestDate = normalizedItems
    .map((item) => new Date(item.updatedAt || item.publishedAt))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const itemXml = normalizedItems.map((item) => {
    const url = new URL(item.href, siteUrl).toString();
    const pubDate = toRfc822(item.publishedAt || item.updatedAt);
    const summary = `${item.summary || description} ※アフィリエイト広告を利用しています。`;
    return [
      "    <item>",
      `      <title>${escapeXml(item.title)}</title>`,
      `      <link>${escapeXml(url)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
      pubDate ? `      <pubDate>${escapeXml(pubDate)}</pubDate>` : null,
      `      <description>${escapeXml(summary)}</description>`,
      `      <media:content url="${escapeXml(item.imageUrl || iconUrl)}" medium="image" type="image/png" />`,
      "    </item>"
    ].filter(Boolean).join("\n");
  }).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">',
    "  <channel>",
    `    <title>${escapeXml(title)}</title>`,
    `    <link>${escapeXml(homeUrl)}</link>`,
    `    <description>${escapeXml(description)}</description>`,
    "    <language>ja</language>",
    `    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />`,
    newestDate ? `    <lastBuildDate>${escapeXml(newestDate.toUTCString())}</lastBuildDate>` : null,
    itemXml,
    "  </channel>",
    "</rss>",
    ""
  ].filter(Boolean).join("\n");
}

export function rssResponse(xml) {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate"
    }
  });
}
