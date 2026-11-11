import { XMLParser } from "fast-xml-parser";
import { HttpError, fetchWithTimeout, json } from "./http.mjs";

// Free, keyless RSS/Atom feeds, merged per category. Only sources whose articles
// are free to read: no hard paywalls (NYT, WSJ) or metered ones (The Verge),
// since a headline you can't open is useless in the car.
// Checked 2026-11-11: every feed returned 200; all except ScienceDaily and CNBC
// include images.
export const FEEDS = {
  general: [
    { source: "NPR", url: "https://feeds.npr.org/1001/rss.xml" },
    { source: "PBS NewsHour", url: "https://www.pbs.org/newshour/feeds/rss/headlines" },
    { source: "The Guardian", url: "https://www.theguardian.com/us-news/rss" },
    { source: "BBC", url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml" },
  ],
  technology: [
    { source: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
    { source: "Engadget", url: "https://www.engadget.com/rss.xml" },
    { source: "The Guardian", url: "https://www.theguardian.com/technology/rss" },
  ],
  business: [
    { source: "NPR", url: "https://feeds.npr.org/1006/rss.xml" },
    { source: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
    { source: "The Guardian", url: "https://www.theguardian.com/business/rss" },
    { source: "BBC", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  ],
  science: [
    { source: "NPR", url: "https://feeds.npr.org/1007/rss.xml" },
    { source: "The Guardian", url: "https://www.theguardian.com/science/rss" },
    { source: "Phys.org", url: "https://phys.org/rss-feed/" },
    { source: "ScienceDaily", url: "https://www.sciencedaily.com/rss/top/science.xml" },
  ],
  // ESPN left out: its feed has no images and some stories are ESPN+ only.
  sports: [
    { source: "CBS Sports", url: "https://www.cbssports.com/rss/headlines/" },
    { source: "Yahoo Sports", url: "https://sports.yahoo.com/rss/" },
    { source: "The Guardian", url: "https://www.theguardian.com/us/sport/rss" },
  ],
  entertainment: [
    { source: "Variety", url: "https://variety.com/feed/" },
    { source: "Deadline", url: "https://deadline.com/feed/" },
    { source: "NPR", url: "https://feeds.npr.org/1008/rss.xml" },
    { source: "The Guardian", url: "https://www.theguardian.com/culture/rss" },
  ],
};

export const NEWS_CATEGORIES = Object.keys(FEEDS);
const MAX_ARTICLES = 10;
const MAX_PER_SOURCE = 4; // keep one feed from crowding out the others

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  htmlEntities: true,
  isArray: (name) => ["item", "entry", "media:content", "media:thumbnail", "link", "enclosure"].includes(name),
});

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function textOf(v) {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in v) return String(v["#text"]);
  return "";
}

function stripHtml(s) {
  return s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

/** Accepts only absolute http(s) URLs; returns the normalized URL or null. */
export function safeHttpUrl(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

function linkOf(item) {
  for (const l of asArray(item.link)) {
    if (typeof l === "string") return l;
    if (l?.["@_href"] && (!l["@_rel"] || l["@_rel"] === "alternate")) return l["@_href"];
  }
  return textOf(item.guid);
}

function imageOf(item) {
  const media = [
    ...asArray(item["media:content"]),
    ...asArray(item["media:group"]?.["media:content"]),
  ];
  for (const m of media) {
    const type = m["@_type"] || "";
    const medium = m["@_medium"] || "";
    if (m["@_url"] && (medium === "image" || type.startsWith("image/") || (!medium && !type))) {
      return m["@_url"];
    }
  }
  const thumb = asArray(item["media:thumbnail"])[0]?.["@_url"];
  if (thumb) return thumb;
  const enc = asArray(item.enclosure).find((e) => (e["@_type"] || "").startsWith("image/"));
  if (enc) return enc["@_url"];
  const html = textOf(item["content:encoded"]) || textOf(item.content) || textOf(item.description);
  return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
}

/** Parses one RSS 2.0 or Atom document into normalized articles. */
export function parseFeed(xml, source) {
  const doc = parser.parse(xml);
  const items = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? [];
  return asArray(items)
    .map((item) => {
      const title = stripHtml(textOf(item.title));
      const url = safeHttpUrl(linkOf(item));
      const date = new Date(textOf(item.pubDate) || textOf(item.published) || textOf(item.updated) || textOf(item["dc:date"]));
      return {
        title,
        url,
        imageUrl: safeHttpUrl(imageOf(item)),
        source,
        publishedAt: Number.isNaN(date.getTime()) ? null : date.toISOString(),
      };
    })
    .filter((a) => a.title && a.url);
}

/** Merges feeds: newest first, de-duplicated, capped per source and overall. */
export function mergeArticles(lists) {
  const seen = new Set();
  const perSource = new Map();
  return lists
    .flat()
    .sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""))
    .filter((a) => {
      const key = a.title.toLowerCase();
      if (seen.has(a.url) || seen.has(key)) return false;
      const n = perSource.get(a.source) || 0;
      if (n >= MAX_PER_SOURCE) return false;
      seen.add(a.url).add(key);
      perSource.set(a.source, n + 1);
      return true;
    })
    .slice(0, MAX_ARTICLES);
}

async function fetchFeed({ source, url }) {
  const resp = await fetchWithTimeout(url, {
    timeoutMs: 5000,
    headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
  });
  if (!resp.ok) throw new Error(`${source} feed HTTP ${resp.status}`);
  return parseFeed(await resp.text(), source);
}

/** GET /api/news?category=general → { articles: [{ title, url, imageUrl, source, publishedAt }] } */
export async function news(params) {
  const category = params.get("category") || "general";
  const feeds = FEEDS[category];
  if (!feeds) throw new HttpError(400, 'Invalid "category"');

  const results = await Promise.allSettled(feeds.map(fetchFeed));
  const ok = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
  results
    .filter((r) => r.status === "rejected")
    .forEach((r) => console.warn("News feed failed:", r.reason?.message));

  if (!ok.length) throw new HttpError(502, "News feeds are unavailable right now", { retryable: true });

  return json(
    { articles: mergeArticles(ok) },
    { cache: { cdn: 900, swr: 1800, browser: 300, vary: ["category"] } }
  );
}
