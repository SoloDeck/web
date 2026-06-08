import { useNavigate } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut, Settings } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/features/auth/hooks/useAuthStore";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === "") return "?";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Interactive avatar with a dropdown for profile settings and logout. */
export function UserMenu({ onOpenSettings }: { onOpenSettings: () => void }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  if (!user) return null;

  const initials = getInitials(user.fullName);

  const handleLogout = async () => {
    await logout();
    toast.success("Đã đăng xuất thành công.");
    navigate({ to: "/login" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="w-full flex items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        title="Tài khoản"
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={user.avatarUrl} alt={user.fullName} />
          <AvatarFallback className="bg-gradient-to-br from-primary-glow to-primary text-primary-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{user.fullName}</div>
          <div className="text-xs text-sidebar-foreground/60 truncate">{user.email}</div>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/50" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="text-sm font-medium truncate">{user.fullName}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onOpenSettings}>
          <Settings />
          Cài đặt hồ sơ
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
