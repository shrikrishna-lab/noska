import { useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBlogPosts, useCreateBlogPost, useUpdateBlogPost, useDeleteBlogPost, useRealtimeInvalidate } from "@/lib/queries";
import type { BlogPost } from "@/lib/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Pencil, Trash2, X, Loader2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

interface BlogFormProps {
  post?: BlogPost;
  onClose: () => void;
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function BlogForm({ post, onClose }: BlogFormProps) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [author, setAuthor] = useState(post?.author ?? "Noska Team");
  const [tags, setTags] = useState(post?.tags?.join(", ") ?? "");
  const [published, setPublished] = useState(post?.published ?? false);
  const createPost = useCreateBlogPost();
  const updatePost = useUpdateBlogPost();
  const [submitting, setSubmitting] = useState(false);

  const generateSlug = () => { if (!slug.trim() && title.trim()) setSlug(slugify(title)); };

  const handleSubmit = async () => {
    if (!title.trim() || !slug.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        title, slug, excerpt: excerpt || undefined, content: content || undefined,
        author, tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        published, published_at: published ? (post?.published_at ?? new Date().toISOString()) : null,
      };
      if (post) {
        await updatePost.mutateAsync({ id: post.id, ...data });
        toast.success("Blog post updated");
      } else {
        await createPost.mutateAsync(data);
        toast.success("Blog post created");
      }
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to save"); }
    setSubmitting(false);
  };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{post ? "Edit" : "New"} Blog Post</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={generateSlug} placeholder="Post title" /></div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <div className="flex gap-2 items-center">
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-post-slug" className="flex-1" />
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={generateSlug} title="Generate from title"><Loader2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
          <div className="space-y-2"><Label>Excerpt</Label><Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary for the blog listing" rows={2} /></div>
          <div className="space-y-2"><Label>Content (Markdown)</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Full blog post content in markdown..." rows={8} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Author</Label><Input value={author} onChange={(e) => setAuthor(e.target.value)} /></div>
            <div className="space-y-2"><Label>Tags (comma separated)</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="AI, Product, Update" /></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={published} onCheckedChange={setPublished} id="published" />
            <Label htmlFor="published">Published</Label>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!title.trim() || !slug.trim() || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {post ? "Update" : "Create"} Post
          </Button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

export function BlogPosts() {
  const { data: posts, isLoading } = useBlogPosts();
  const deletePost = useDeleteBlogPost();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  useRealtimeInvalidate(["admin", "blog-posts"], "blog_posts");

  const columns: Column<BlogPost>[] = [
    { key: "title", label: "Title", sortable: true, render: (row) => <span className="font-medium">{row.title}</span> },
    { key: "author", label: "Author", sortable: true },
    {
      key: "tags", label: "Tags",
      render: (row) => (
        <div className="flex gap-1 flex-wrap">
          {row.tags?.slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
        </div>
      ),
    },
    {
      key: "published", label: "Status", sortable: true,
      render: (row) => <Badge variant={row.published ? "success" : "secondary"}>{row.published ? "Published" : "Draft"}</Badge>,
    },
    { key: "created_at", label: "Created", sortable: true, render: (row) => <span className="text-muted-foreground text-xs">{new Date(row.created_at).toLocaleDateString()}</span>, hideOnMobile: true },
    {
      key: "actions", label: "", className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <a href={`/blog/${row.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-7 w-7 rounded-lg hover:bg-accent"><ExternalLink className="h-3.5 w-3.5" /></a>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(row); setShowForm(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => {
            if (!confirm(`Delete "${row.title}"?`)) return;
            try { await deletePost.mutateAsync(row.id); toast.success("Deleted"); } catch { toast.error("Failed to delete"); }
          }}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  if (isLoading) return <div className="p-6"><PageHeader title="Blog Posts" description="Manage blog content for the marketing site" /><LoadingState count={3} /></div>;

  return (
    <div className="p-6">
      <PageHeader title="Blog Posts" description="Manage blog content for the marketing site" actions={<Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}><Plus className="mr-1 h-3.5 w-3.5" /> New Post</Button>} />
      {posts && posts.length > 0 ? (
        <DataTable columns={columns} data={posts} searchPlaceholder="Search posts..." />
      ) : (
        <EmptyState title="No blog posts" description="Create your first blog post." />
      )}
      {showForm && <BlogForm post={editing ?? undefined} onClose={() => { setShowForm(false); setEditing(null); }} />}
    </div>
  );
}
