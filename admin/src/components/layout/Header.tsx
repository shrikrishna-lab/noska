import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import {
  Menu, Search, LogOut, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsFromName } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/rbac";
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface HeaderProps {
  onMenuClick: () => void;
  onSearchOpen: () => void;
}

export function Header({ onMenuClick, onSearchOpen }: HeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
        <Menu className="h-4 w-4" />
      </Button>
      <div className="hidden sm:flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onSearchOpen}>
          <Search className="h-4 w-4" />
        </Button>
        <kbd className="flex items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground cursor-pointer" onClick={onSearchOpen}>
          <span className="text-[9px]">&#8984;</span>K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />

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
                <span className="mt-1 inline-flex w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {ROLE_LABELS[user.role]}
                </span>
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
