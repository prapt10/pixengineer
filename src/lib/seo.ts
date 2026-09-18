// Per-route SEO helper: updates title, meta description, canonical, and Open Graph tags.
const SITE_URL = "https://pixengineer.com";

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function setPageMeta(opts: {
  title: string;
  description: string;
  path: string; // e.g. "/about"
  ogType?: "website" | "article";
}) {
  const url = `${SITE_URL}${opts.path}`;
  document.title = opts.title;
  upsertMeta("name", "description", opts.description);
  upsertLink("canonical", url);
  upsertMeta("property", "og:title", opts.title);
  upsertMeta("property", "og:description", opts.description);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:type", opts.ogType ?? "website");
  upsertMeta("name", "twitter:title", opts.title);
  upsertMeta("name", "twitter:description", opts.description);
}
