import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import {
  Menu, Search, Bell, LogOut, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/lib/queries";
import { cn, initialsFromName } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface HeaderProps {
  onMenuClick: () => void;
  onSearchOpen: () => void;
}

export function Header({ onMenuClick, onSearchOpen }: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const { data: realNotifs } = useNotifications();
  const notifs = realNotifs ?? [];
  const unreadCount = notifs.filter((n: { unread: boolean }) => n.unread).length;

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="hidden sm:flex" onClick={onSearchOpen}>
        <Search className="h-4 w-4" />
      </Button>
      <div className="hidden sm:flex relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users, workspaces, logs... (Ctrl+K)"
          className="pl-9 h-9 text-sm"
          onFocus={(e) => { e.target.blur(); onSearchOpen(); }}
        />
        <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground lg:flex">
          <span className="text-[9px]">&#8984;</span>K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between p-3 pb-2">
              <span className="text-sm font-semibold">Notifications</span>
              <Badge variant="secondary" className="text-[10px]">{unreadCount} new</Badge>
            </div>
            <ScrollArea className="h-72">
              {notifs.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
              ) : notifs.map((n: { id: string; severity: string; title: string; detail: string; unread: boolean; created_at: string }) => (
                <div key={n.id} className={cn("flex gap-3 border-b p-3 transition-colors hover:bg-muted/50", n.unread && "bg-muted/30")}>
                  <div className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", n.severity === "critical" ? "bg-destructive" : n.severity === "warning" ? "bg-warning" : "bg-blue-500")} />
                  <div className="flex-1 space-y-0.5">
                    <p className={cn("text-sm", n.unread && "font-medium")}>{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.detail}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-[10px]">{initialsFromName(user.name)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium lg:block">{user.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
