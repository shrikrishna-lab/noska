import {
  InfoCard,
  InfoCardContent,
  InfoCardTitle,
  InfoCardDescription,
  InfoCardMedia,
  InfoCardFooter,
  InfoCardDismiss,
  InfoCardAction,
} from "@/components/ui/info-card";
import {
  Sidebar,
  SidebarProvider,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/blocks/sidebar";
import {
  ExternalLink,
  User,
  ChevronsUpDown,
  Calendar,
  Home,
  Inbox,
  Search,
  Settings,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

// Menu items.
const items = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

export function InfoCardDemo() {
  const [resetCount, setResetCount] = useState(0);

  const handleResetDismissal = () => {
    localStorage.removeItem("noska-dashboard-infocard-demo");
    localStorage.removeItem("noska_card_new_dashboard");
    setResetCount((prev) => prev + 1);
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Application</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <a href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <InfoCard key={resetCount} storageKey="noska-dashboard-infocard-demo">
            <InfoCardContent>
              <InfoCardTitle className="text-xs font-normal text-[#9CA3AF] dark:text-[#9CA3AF]/90 mb-1">
                Introducing New Dashboard
              </InfoCardTitle>
              <InfoCardDescription className="text-[14px] font-medium text-[#374151] dark:text-[#E5E7EB] leading-tight mb-2">
                New Feature. New Platform. Same Feel.
              </InfoCardDescription>
              <InfoCardMedia
                media={[
                  {
                    src: "https://cdn.21st.dev/assets/mirror/a1/a12526ad6ce4aa3cac9d4f005480e4c2aa5a4d3cccf7b860ca68ebea82c4c157.webp",
                    alt: "New Dashboard Preview 1",
                  },
                  {
                    src: "https://cdn.21st.dev/assets/mirror/90/908d2bed189c6957365043783152c6347defce5b15eccacf195507176306b08f.webp",
                    alt: "New Dashboard Preview 2",
                  },
                  {
                    src: "https://cdn.21st.dev/assets/mirror/a2/a23cdd989b1a11901eb1275f59149b466783492dbde051a57e41382b5bd94896.webp",
                    alt: "New Dashboard Preview 3",
                  },
                ]}
                shrinkHeight={85}
                expandHeight={145}
              />
              <InfoCardFooter className="mt-0">
                <InfoCardDismiss className="text-xs font-normal text-muted-foreground/80 hover:text-foreground transition-colors cursor-pointer select-none">
                  Dismiss
                </InfoCardDismiss>
                <InfoCardAction>
                  <Link
                    to="#"
                    className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground/80 hover:text-foreground underline transition-colors select-none cursor-pointer"
                  >
                    Try it out <ExternalLink size={12} className="shrink-0" />
                  </Link>
                </InfoCardAction>
              </InfoCardFooter>
            </InfoCardContent>
          </InfoCard>
          <SidebarGroup>
            <SidebarMenuButton className="w-full justify-between gap-3 h-12">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 rounded-md text-muted-foreground" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">KL</span>
                  <span className="text-xs text-muted-foreground">
                    kl@example.com
                  </span>
                </div>
              </div>
              <ChevronsUpDown className="h-5 w-5 rounded-md text-muted-foreground" />
            </SidebarMenuButton>
          </SidebarGroup>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="h-8 w-8" />
          <div className="h-4 w-px bg-border mx-2" />
          <div className="flex items-center gap-2 font-medium text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Interactive InfoCard & Sidebar Demonstration</span>
          </div>
        </header>

        <main className="flex-1 p-8 max-w-4xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Interactive InfoCard Showcase</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Hover over the card in the sidebar footer on the left to experience the interactive spring animations,
              fan-out layered media stack, and footer action triggers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Interactive Features
              </h3>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>• <strong>Layered Card Stack:</strong> Rotates and scales up to 3 media items on mouse hover.</li>
                <li>• <strong>Dynamic Height:</strong> Smoothly expands from 75px to 150px with spring physics.</li>
                <li>• <strong>Dismissal Logic:</strong> Supports both single session dismissal and permanent localStorage storage.</li>
                <li>• <strong>Multi-Format Media:</strong> Handles static web images and inline auto-buffered videos.</li>
              </ul>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-3">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Admin Controls & Operations
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cards can be managed, scheduled, and monitored from the Admin Console at <code>/control/info-cards</code>.
              </p>
              <div className="flex gap-2 pt-1">
                <Link
                  to="/control/info-cards"
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:opacity-90 transition"
                >
                  Open Admin Studio <ArrowRight className="h-3 w-3" />
                </Link>
                <button
                  onClick={handleResetDismissal}
                  className="inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background px-3 py-1.5 rounded-lg hover:bg-accent transition cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" /> Reset Card Dismissal
                </button>
              </div>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default InfoCardDemo;
