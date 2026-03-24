import React from "react";
import { useLocation } from "wouter";
import { LayoutDashboard, Users, BookOpen, GraduationCap, Library, LogOut, Award } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";

type NavItem = { title: string; url: string; icon: React.ElementType };

const adminNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "User Management", url: "/users", icon: Users },
  { title: "Courses", url: "/courses", icon: BookOpen },
  { title: "Enrollments", url: "/enrollments", icon: GraduationCap },
  { title: "Categories", url: "/categories", icon: Library },
];

const trainerNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Courses", url: "/courses", icon: BookOpen },
  { title: "Enrollments", url: "/enrollments", icon: GraduationCap },
];

const learnerNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Courses", url: "/courses", icon: BookOpen },
  { title: "My Enrollments", url: "/enrollments", icon: GraduationCap },
  { title: "My Certificates", url: "/my-certificates", icon: Award },
];

const roleColors: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  TRAINER: "bg-blue-100 text-blue-700",
  LEARNER: "bg-green-100 text-green-700",
};

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  TRAINER: "Trainer",
  LEARNER: "Learner",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();

  const navigation =
    user?.roleId === "ADMIN"
      ? adminNav
      : user?.roleId === "TRAINER"
      ? trainerNav
      : learnerNav;

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="p-6 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-sm border border-border p-0.5 bg-background">
            <img src="/logo.jpg" alt="LMS Logo" className="w-full h-full object-cover rounded-lg" />
          </div>
          <h2 className="font-bold text-xl tracking-tight text-foreground">
            LMS Portal
          </h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navigation.map((item) => {
                const isActive =
                  location === item.url ||
                  (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      onClick={() => setLocation(item.url)}
                      isActive={isActive}
                      className="w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {user && (
        <div className="p-4 border-t border-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-auto py-2 px-2 rounded-lg hover:bg-accent"
              >
                <Avatar className="w-8 h-8">
                  {user.picture && (
                    <AvatarImage src={user.picture} alt={user.fullName} referrerPolicy="no-referrer" />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate max-w-[120px]">
                    {user.fullName}
                  </span>
                  <Badge
                    className={`text-[10px] px-1.5 py-0 font-medium mt-0.5 ${
                      roleColors[user.roleId] ?? ""
                    }`}
                    variant="outline"
                  >
                    {roleLabels[user.roleId] ?? user.roleId}
                  </Badge>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-xs text-muted-foreground p-3">
                <p className="font-bold text-foreground">{user.fullName}</p>
                <p className="text-[10px] mt-0.5">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setLocation("/profile")}
                className="cursor-pointer"
              >
                <Users className="w-4 h-4 mr-2" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout()}
                className="text-red-600 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
            <SidebarTrigger className="-ml-1" />
          </div>
          <div className="flex-1 px-6 py-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
