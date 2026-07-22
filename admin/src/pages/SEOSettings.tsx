import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSEOSettings, useUpdateSEOSettings, useRealtimeInvalidate } from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import { LoadingState } from "@/components/ui/LoadingState";
import { Search, Save } from "lucide-react";
import toast from "react-hot-toast";

const PAGES = [
  { path: "/", label: "Home" },
  { path: "/pricing", label: "Pricing" },
  { path: "/product", label: "Product" },
  { path: "/launch", label: "Launch" },
  { path: "/blog", label: "Blog" },
  { path: "/changelog", label: "Changelog" },
  { path: "/docs", label: "Docs" },
  { path: "/enterprise", label: "Enterprise" },
];

export function SEOSettingsPage() {
  const { user } = useAuth();
  const [activePage, setActivePage] = useState("/");
  const { data: seo, isLoading } = useSEOSettings(activePage);
  const updateSEO = useUpdateSEOSettings();
  useRealtimeInvalidate(["admin", "seo"], "seo_settings");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [twitterCard, setTwitterCard] = useState("summary_large_image");
  const [twitterSite, setTwitterSite] = useState("");
  const [keywords, setKeywords] = useState("");
  const [robots, setRobots] = useState("index, follow");
  const [canonical, setCanonical] = useState("");

  useEffect(() => {
    if (seo) {
      setTitle(seo.title ?? "");
      setDescription(seo.description ?? "");
      setOgImage(seo.og_image ?? "");
      setOgTitle(seo.og_title ?? "");
      setOgDescription(seo.og_description ?? "");
      setTwitterCard(seo.twitter_card ?? "summary_large_image");
      setTwitterSite(seo.twitter_site ?? "");
      setKeywords(seo.keywords ?? "");
      setRobots(seo.robots ?? "index, follow");
      setCanonical(seo.canonical_url ?? "");
    }
  }, [seo]);

  const handleSave = async () => {
    try {
      await updateSEO.mutateAsync({
        page_path: activePage,
        title: title || null, description: description || null,
        og_image: ogImage || null, og_title: ogTitle || null,
        og_description: ogDescription || null, twitter_card: twitterCard,
        twitter_site: twitterSite || null, keywords: keywords || "",
        robots: robots || "index, follow", canonical_url: canonical || null,
        admin_name: user?.name ?? "Unknown",
      });
      toast.success(`SEO settings for "${activePage}" saved`);
    } catch { toast.error("Failed to save"); }
  };

  if (isLoading) return <div className="p-6"><PageHeader title="SEO Settings" description="Manage search engine optimization" /><LoadingState count={1} /></div>;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="SEO Settings"
        description="Edit meta tags and SEO for each page"
        actions={<Button size="sm" onClick={handleSave} disabled={updateSEO.isPending}><Save className="mr-1 h-3.5 w-3.5" /> Save</Button>}
      />

      <div className="flex gap-2 flex-wrap">
        {PAGES.map((p) => (
          <Button key={p.path} variant={activePage === p.path ? "default" : "outline"} size="sm" onClick={() => setActivePage(p.path)}>
            {p.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label>Title Tag</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Page title for search results" />
            <p className="text-xs text-muted-foreground">{title.length} characters · Recommended: 50-60</p>
          </div>
          <div className="space-y-2">
            <Label>Meta Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Page description for search results" />
            <p className="text-xs text-muted-foreground">{description.length} characters · Recommended: 150-160</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Keywords</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="keyword1, keyword2" />
            </div>
            <div className="space-y-2">
              <Label>Robots</Label>
              <Select value={robots} onValueChange={setRobots}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="index, follow">Index, Follow</SelectItem>
                  <SelectItem value="noindex, follow">No Index, Follow</SelectItem>
                  <SelectItem value="index, nofollow">Index, No Follow</SelectItem>
                  <SelectItem value="noindex, nofollow">No Index, No Follow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Canonical URL</Label>
            <Input value={canonical} onChange={(e) => setCanonical(e.target.value)} placeholder="https://noska.dev/page" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="font-medium">Open Graph</p>
          <div className="space-y-2">
            <Label>OG Title</Label>
            <Input value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} placeholder="Title for social sharing" />
          </div>
          <div className="space-y-2">
            <Label>OG Description</Label>
            <Textarea value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} rows={2} placeholder="Description for social sharing" />
          </div>
          <div className="space-y-2">
            <Label>OG Image URL</Label>
            <Input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="https://noska.dev/og-image.png" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <p className="font-medium">Twitter Card</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Card Type</Label>
              <Select value={twitterCard} onValueChange={setTwitterCard}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                  <SelectItem value="app">App</SelectItem>
                  <SelectItem value="player">Player</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Twitter Site</Label>
              <Input value={twitterSite} onChange={(e) => setTwitterSite(e.target.value)} placeholder="@noska" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
