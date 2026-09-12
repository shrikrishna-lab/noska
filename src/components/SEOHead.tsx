import { useEffect, useRef } from "react";
import { useSEOSettings } from "../hooks/useLaunchSettings";

export default function SEOHead({ 
  path, 
  title, 
  description 
}: { 
  path: string; 
  title?: string; 
  description?: string; 
}) {
  const { seo, loading } = useSEOSettings(path);
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    const activeTitle = seo?.title || title;
    const activeDesc = seo?.description || description;

    if (activeTitle) document.title = activeTitle;
    if (activeDesc) setMeta("description", activeDesc);

    if (loading || !seo) return;
    const key = `seo-${path}`;
    if (appliedRef.current === key) return;
    appliedRef.current = key;

    if (seo.keywords) setMeta("keywords", seo.keywords);
    if (seo.robots) setMeta("robots", seo.robots);
    if (seo.og_title ?? activeTitle) setMeta("og:title", seo.og_title ?? activeTitle!);
    if (seo.og_description ?? activeDesc) setMeta("og:description", seo.og_description ?? activeDesc!);
    if (seo.og_image) setMeta("og:image", seo.og_image);
    setMeta("og:url", window.location.href);
    if (seo.twitter_card) setMeta("twitter:card", seo.twitter_card);
    if (seo.twitter_site) setMeta("twitter:site", seo.twitter_site);
    if (seo.canonical_url) {
      let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
      if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
      link.href = seo.canonical_url;
    }

    return () => {
      if (appliedRef.current === key) appliedRef.current = null;
    };
  }, [loading, seo, path]);

  return null;
}

function setMeta(name: string, content: string) {
  const selector = name.startsWith("og:") ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let el = document.querySelector(selector) as HTMLMetaElement;
  if (!el) {
    el = document.createElement("meta");
    if (name.startsWith("og:")) el.setAttribute("property", name);
    else el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
