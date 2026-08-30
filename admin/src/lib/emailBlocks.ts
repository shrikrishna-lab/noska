import type { EmailBlockType } from "@/lib/types";

export interface BlockDefinition {
  type: EmailBlockType;
  label: string;
  icon: string;
  defaultContent: Record<string, unknown>;
  fields: BlockField[];
}

export interface BlockField {
  key: string;
  label: string;
  type: "text" | "textarea" | "color" | "url" | "image" | "number" | "select" | "boolean";
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "logo",
    label: "Logo",
    icon: "🖼",
    defaultContent: { image_url: "", alt_text: "Logo", max_width: 160, alignment: "center" },
    fields: [
      { key: "image_url", label: "Image URL", type: "url" },
      { key: "alt_text", label: "Alt Text", type: "text", defaultValue: "Logo" },
      { key: "max_width", label: "Max Width (px)", type: "number", defaultValue: 160 },
      { key: "alignment", label: "Alignment", type: "select", options: [
        { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" },
      ], defaultValue: "center" },
    ],
  },
  {
    type: "hero",
    label: "Hero Image",
    icon: "📸",
    defaultContent: { image_url: "", alt_text: "Hero", full_width: true },
    fields: [
      { key: "image_url", label: "Image URL", type: "url" },
      { key: "alt_text", label: "Alt Text", type: "text", defaultValue: "Hero" },
      { key: "full_width", label: "Full Width", type: "boolean", defaultValue: true },
    ],
  },
  {
    type: "heading",
    label: "Heading",
    icon: "H",
    defaultContent: { text: "Your heading here", level: "h2", color: "#1a1a2e", align: "left" },
    fields: [
      { key: "text", label: "Text", type: "text" },
      { key: "level", label: "Size", type: "select", options: [
        { value: "h1", label: "H1" }, { value: "h2", label: "H2" }, { value: "h3", label: "H3" },
      ], defaultValue: "h2" },
      { key: "color", label: "Color", type: "color", defaultValue: "#1a1a2e" },
      { key: "align", label: "Alignment", type: "select", options: [
        { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" },
      ], defaultValue: "left" },
    ],
  },
  {
    type: "paragraph",
    label: "Paragraph",
    icon: "¶",
    defaultContent: { text: "Your paragraph text here.", color: "#555", font_size: 16 },
    fields: [
      { key: "text", label: "Text", type: "textarea" },
      { key: "color", label: "Color", type: "color", defaultValue: "#555" },
      { key: "font_size", label: "Font Size (px)", type: "number", defaultValue: 16 },
    ],
  },
  {
    type: "button",
    label: "Button",
    icon: "🔘",
    defaultContent: { text: "Click Here", url: "https://noska.me", bg_color: "#6366f1", text_color: "#ffffff", border_radius: 6, full_width: false },
    fields: [
      { key: "text", label: "Button Text", type: "text" },
      { key: "url", label: "Link URL", type: "url" },
      { key: "bg_color", label: "Background Color", type: "color", defaultValue: "#6366f1" },
      { key: "text_color", label: "Text Color", type: "color", defaultValue: "#ffffff" },
      { key: "border_radius", label: "Border Radius", type: "number", defaultValue: 6 },
      { key: "full_width", label: "Full Width", type: "boolean", defaultValue: false },
    ],
  },
  {
    type: "divider",
    label: "Divider",
    icon: "—",
    defaultContent: { color: "#e5e7eb", thickness: 1, spacing: 20 },
    fields: [
      { key: "color", label: "Color", type: "color", defaultValue: "#e5e7eb" },
      { key: "thickness", label: "Thickness (px)", type: "number", defaultValue: 1 },
      { key: "spacing", label: "Spacing (px)", type: "number", defaultValue: 20 },
    ],
  },
  {
    type: "spacer",
    label: "Spacer",
    icon: "␣",
    defaultContent: { height: 20 },
    fields: [
      { key: "height", label: "Height (px)", type: "number", defaultValue: 20 },
    ],
  },
  {
    type: "feature_grid",
    label: "Feature Grid",
    icon: "⊞",
    defaultContent: { columns: 2, items: [{ icon: "✨", title: "Feature 1", desc: "Description" }, { icon: "🚀", title: "Feature 2", desc: "Description" }] },
    fields: [
      { key: "columns", label: "Columns", type: "select", options: [
        { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" },
      ], defaultValue: "2" },
    ],
  },
  {
    type: "card",
    label: "Card",
    icon: "🃏",
    defaultContent: { title: "Card Title", description: "Card description", image_url: "", button_text: "", button_url: "" },
    fields: [
      { key: "title", label: "Title", type: "text" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image_url", label: "Image URL", type: "url" },
      { key: "button_text", label: "Button Text", type: "text" },
      { key: "button_url", label: "Button URL", type: "url" },
    ],
  },
  {
    type: "testimonial",
    label: "Testimonial",
    icon: "💬",
    defaultContent: { quote: "Amazing product!", author: "John Doe", role: "CEO, Company", avatar_url: "" },
    fields: [
      { key: "quote", label: "Quote", type: "textarea" },
      { key: "author", label: "Author", type: "text" },
      { key: "role", label: "Role", type: "text" },
      { key: "avatar_url", label: "Avatar URL", type: "url" },
    ],
  },
  {
    type: "faq",
    label: "FAQ",
    icon: "❓",
    defaultContent: { question: "What is Noska?", answer: "Noska is a modern collaboration platform." },
    fields: [
      { key: "question", label: "Question", type: "text" },
      { key: "answer", label: "Answer", type: "textarea" },
    ],
  },
  {
    type: "countdown",
    label: "Countdown",
    icon: "⏱",
    defaultContent: { target_date: "", label: "Launching in", bg_color: "#f3f4f6", text_color: "#1f2937" },
    fields: [
      { key: "target_date", label: "Target Date", type: "text" },
      { key: "label", label: "Label", type: "text", defaultValue: "Launching in" },
      { key: "bg_color", label: "Background Color", type: "color", defaultValue: "#f3f4f6" },
      { key: "text_color", label: "Text Color", type: "color", defaultValue: "#1f2937" },
    ],
  },
  {
    type: "referral_card",
    label: "Referral Card",
    icon: "🔗",
    defaultContent: { headline: "Share with friends", body: "Invite friends and earn rewards!", link_label: "Copy Referral Link", bg_color: "#fef3c7" },
    fields: [
      { key: "headline", label: "Headline", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
      { key: "link_label", label: "Link Label", type: "text" },
      { key: "bg_color", label: "Background Color", type: "color", defaultValue: "#fef3c7" },
    ],
  },
  {
    type: "social_links",
    label: "Social Links",
    icon: "🔗",
    defaultContent: { show_twitter: true, show_github: true, show_discord: false, show_linkedin: false },
    fields: [
      { key: "show_twitter", label: "Show Twitter", type: "boolean", defaultValue: true },
      { key: "show_github", label: "Show GitHub", type: "boolean", defaultValue: true },
      { key: "show_discord", label: "Show Discord", type: "boolean", defaultValue: false },
      { key: "show_linkedin", label: "Show LinkedIn", type: "boolean", defaultValue: false },
    ],
  },
  {
    type: "footer",
    label: "Footer",
    icon: "📋",
    defaultContent: { text: "© 2026 Noska. All rights reserved.", show_unsubscribe: true, bg_color: "#f9fafb" },
    fields: [
      { key: "text", label: "Footer Text", type: "text" },
      { key: "show_unsubscribe", label: "Show Unsubscribe Link", type: "boolean", defaultValue: true },
      { key: "bg_color", label: "Background Color", type: "color", defaultValue: "#f9fafb" },
    ],
  },
  {
    type: "signature",
    label: "Signature",
    icon: "✍",
    defaultContent: { name: "The Noska Team", title: "", email: "hello@noska.me", avatar_url: "" },
    fields: [
      { key: "name", label: "Name", type: "text" },
      { key: "title", label: "Title", type: "text" },
      { key: "email", label: "Email", type: "text" },
      { key: "avatar_url", label: "Avatar URL", type: "url" },
    ],
  },
];

export function getBlockDefinition(type: EmailBlockType): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find((b) => b.type === type);
}

export function blocksToHtml(blocks: Array<{ type: EmailBlockType; content: Record<string, unknown> }>, branding?: { primary_color?: string; secondary_color?: string; accent_color?: string; company_name?: string; footer_text?: string; logo_url?: string }): string {
  const primary = branding?.primary_color ?? "#6366f1";
  const secondary = branding?.secondary_color ?? "#8b5cf6";
  const accent = branding?.accent_color ?? "#06b6d4";
  const company = branding?.company_name ?? "Noska";
  const footer = branding?.footer_text ?? "© 2026 Noska. All rights reserved.";
  const logoUrl = branding?.logo_url;

  const renderedBlocks = blocks.map((block) => renderBlock(block, { primary, secondary, accent, company, footer, logoUrl })).join("\n");

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${company}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;"><tr><td align="center" style="padding:20px 10px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;">
      ${renderedBlocks}
    </table>
  </td></tr></table>
</body></html>`;
}

function renderBlock(block: { type: EmailBlockType; content: Record<string, unknown> }, theme: Record<string, string | undefined>): string {
  const c = block.content;
  switch (block.type) {
    case "logo": {
      const src = c.image_url as string || theme.logoUrl;
      if (!src) return '<tr><td style="padding:20px;text-align:center;font-size:24px;font-weight:700;color:' + theme.primary + '">' + theme.company + '</td></tr>';
      return '<tr><td style="padding:20px;text-align:' + (c.alignment || "center") + '"><img src="' + src + '" alt="' + (c.alt_text || "Logo") + '" style="max-width:' + (c.max_width || 160) + 'px;height:auto;border:0;" /></td></tr>';
    }
    case "hero":
      if (!c.image_url) return "";
      return '<tr><td style="padding:0;"><img src="' + c.image_url + '" alt="' + (c.alt_text || "Hero") + '" style="width:100%;max-width:600px;height:auto;display:block;border:0;" /></td></tr>';
    case "heading": {
      const level = c.level as string || "h2";
      const sizes: Record<string, string> = { h1: "28px", h2: "22px", h3: "18px" };
      return '<tr><td style="padding:10px 24px 0;text-align:' + (c.align || "left") + '"><' + level + ' style="margin:0;color:' + (c.color || "#1a1a2e") + ";font-size:" + (sizes[level] || "22px") + ';font-weight:600;">' + esc(c.text as string) + "</" + level + "></td></tr>";
    }
    case "paragraph":
      return '<tr><td style="padding:8px 24px;text-align:left;"><p style="margin:0;color:' + (c.color || "#555") + ";font-size:" + (c.font_size || 16) + 'px;line-height:1.6;">' + esc(c.text as string) + "</p></td></tr>";
    case "button": {
      const full = c.full_width ? "width:100%;box-sizing:border-box;" : "";
      return '<tr><td style="padding:12px 24px;text-align:center;"><a href="' + (c.url || "#") + '" style="display:inline-block;padding:12px 32px;background-color:' + (c.bg_color as string || theme.primary) + ";color:" + (c.text_color || "#fff") + ";text-decoration:none;border-radius:" + (c.border_radius || 6) + "px;font-size:14px;font-weight:500;" + full + '">' + esc(c.text as string) + "</a></td></tr>";
    }
    case "divider":
      return '<tr><td style="padding:' + (c.spacing || 20) + 'px 24px;"><hr style="border:0;border-top:' + (c.thickness || 1) + "px solid " + (c.color || "#e5e7eb") + ';" /></td></tr>';
    case "spacer":
      return '<tr><td style="padding:0;height:' + (c.height || 20) + 'px;font-size:1px;">&nbsp;</td></tr>';
    case "feature_grid": {
      const items = c.items as Array<{ icon: string; title: string; desc: string }> || [];
      const cols = Math.min(+(c.columns || 2), 3);
      const rows: string[] = [];
      for (let i = 0; i < items.length; i += cols) {
        const rowItems = items.slice(i, i + cols).map((item) =>
          '<td width="' + Math.floor(600 / cols) + '" style="padding:12px;vertical-align:top;text-align:center;"><div style="font-size:24px;margin-bottom:4px;">' + (item.icon || "✨") + '</div><p style="margin:0;font-weight:600;font-size:14px;">' + esc(item.title) + '</p><p style="margin:4px 0 0;font-size:12px;color:#666;">' + esc(item.desc) + "</p></td>"
        ).join("");
        rows.push('<tr>' + rowItems + '</tr>');
      }
      return '<tr><td style="padding:16px 12px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + rows.join("") + '</table></td></tr>';
    }
    case "card":
      return '<tr><td style="padding:12px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;"><tr><td style="padding:16px;">' + (c.image_url ? '<img src="' + c.image_url + '" style="width:100%;max-height:200px;object-fit:cover;border-radius:4px;" /><br/>' : "") + '<h3 style="margin:0 0 4px;font-size:16px;">' + esc(c.title as string) + '</h3><p style="margin:0;font-size:13px;color:#666;">' + esc(c.description as string) + '</p>' + (c.button_text ? '<a href="' + (c.button_url || "#") + '" style="display:inline-block;margin-top:8px;padding:8px 16px;background-color:' + theme.primary + ';color:#fff;text-decoration:none;border-radius:4px;font-size:12px;">' + esc(c.button_text as string) + "</a>" : "") + "</td></tr></table></td></tr>";
    case "testimonial":
      return '<tr><td style="padding:20px 24px;background-color:#f9fafb;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>' + (c.avatar_url ? '<td width="48" style="padding-right:12px;"><img src="' + c.avatar_url + '" style="width:48px;height:48px;border-radius:50%;" /></td>' : "") + '<td><p style="margin:0;font-style:italic;font-size:14px;color:#555;">"' + esc(c.quote as string) + '"</p><p style="margin:4px 0 0;font-size:12px;color:#888;">— ' + esc(c.author as string) + (c.role ? ", " + esc(c.role as string) : "") + "</p></td></tr></table></td></tr>";
    case "faq":
      return '<tr><td style="padding:8px 24px;"><p style="margin:0;font-weight:600;font-size:14px;">❓ ' + esc(c.question as string) + '</p><p style="margin:4px 0 0;font-size:13px;color:#666;">' + esc(c.answer as string) + "</p></td></tr>";
    case "countdown":
      return '<tr><td style="padding:20px 24px;background-color:' + (c.bg_color as string || "#f3f4f6") + ';text-align:center;"><p style="margin:0;font-size:14px;color:' + (c.text_color as string || "#1f2937") + ';">' + esc(c.label as string) + '</p><p style="margin:4px 0 0;font-size:28px;font-weight:700;color:' + (c.text_color as string || "#1f2937") + ';">' + (c.target_date ? new Date(c.target_date as string).toLocaleDateString() : "TBD") + "</p></td></tr>";
    case "referral_card":
      return '<tr><td style="padding:20px 24px;background-color:' + (c.bg_color as string || "#fef3c7") + ';text-align:center;border-radius:8px;"><p style="margin:0;font-size:16px;font-weight:600;">🔗 ' + esc(c.headline as string) + '</p><p style="margin:4px 0;font-size:13px;color:#666;">' + esc(c.body as string) + '</p><span style="display:inline-block;padding:8px 16px;background-color:' + theme.primary + ';color:#fff;border-radius:4px;font-size:12px;">' + esc(c.link_label as string) + "</span></td></tr>";
    case "social_links": {
      const links: string[] = [];
      if (c.show_twitter) links.push('<a href="{{company.website}}" style="text-decoration:none;color:#555;font-size:13px;margin:0 6px;">𝕏</a>');
      if (c.show_github) links.push('<a href="{{company.website}}" style="text-decoration:none;color:#555;font-size:13px;margin:0 6px;">GH</a>');
      if (c.show_discord) links.push('<a href="{{company.website}}" style="text-decoration:none;color:#555;font-size:13px;margin:0 6px;">DC</a>');
      if (c.show_linkedin) links.push('<a href="{{company.website}}" style="text-decoration:none;color:#555;font-size:13px;margin:0 6px;">LI</a>');
      return '<tr><td style="padding:16px 24px;text-align:center;font-size:13px;">' + links.join("") + "</td></tr>";
    }
    case "footer":
      return '<tr><td style="padding:20px 24px;background-color:' + (c.bg_color as string || "#f9fafb") + ';text-align:center;font-size:12px;color:#999;">' + esc(c.text as string || theme.footer || "") + (c.show_unsubscribe ? '<br/><a href="#" style="color:#999;text-decoration:underline;font-size:11px;">Unsubscribe</a>' : "") + "</td></tr>";
    case "signature":
      return '<tr><td style="padding:16px 24px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>' + (c.avatar_url ? '<td width="40" style="padding-right:10px;"><img src="' + c.avatar_url + '" style="width:40px;height:40px;border-radius:50%;" /></td>' : "") + '<td><p style="margin:0;font-weight:600;font-size:14px;">' + esc(c.name as string) + '</p>' + (c.title ? '<p style="margin:0;font-size:12px;color:#666;">' + esc(c.title as string) + "</p>" : "") + (c.email ? '<p style="margin:0;font-size:12px;color:' + theme.primary + ';">' + esc(c.email as string) + "</p>" : "") + "</td></tr></table></td></tr>";
    default:
      return "";
  }
}

function esc(s: string): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const SYSTEM_VARIABLES = [
  { key: "{{user.name}}", label: "User Name" },
  { key: "{{user.email}}", label: "User Email" },
  { key: "{{user.avatar}}", label: "User Avatar" },
  { key: "{{workspace.name}}", label: "Workspace Name" },
  { key: "{{workspace.url}}", label: "Workspace URL" },
  { key: "{{invite.link}}", label: "Invite Link" },
  { key: "{{waitlist.position}}", label: "Waitlist Position" },
  { key: "{{waitlist.status}}", label: "Waitlist Status" },
  { key: "{{launch.date}}", label: "Launch Date" },
  { key: "{{referral.link}}", label: "Referral Link" },
  { key: "{{company.name}}", label: "Company Name" },
  { key: "{{company.website}}", label: "Company Website" },
  { key: "{{support.email}}", label: "Support Email" },
];
