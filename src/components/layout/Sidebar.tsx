import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Calendar,
  Image as ImageIcon,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Crown,
} from "lucide-react";
import { clearAuthToken } from "@/lib/auth";

const OFFICIAL_EMAIL = "socialpilotpro.oficial@gmail.com";

const baseNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Calendário", href: "/calendar", icon: Calendar },
  { name: "Biblioteca", href: "/media", icon: ImageIcon },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const officialOnlyNavItems = [
  { name: "Planos", href: "/plans", icon: Crown },
];

const bottomNavItems = [
  { name: "Configurações", href: "/settings", icon: Settings },
  { name: "Suporte", href: "/support", icon: HelpCircle },
];

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function decodeJwtPayload(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = JSON.parse(window.atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

function findEmailDeep(value: any): string {
  if (!value) return "";

  if (typeof value === "string") {
    const lowerValue = value.toLowerCase();

    if (lowerValue.includes("@")) {
      const emailMatch = lowerValue.match(
        /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
      );

      if (emailMatch?.[0]) {
        return normalizeEmail(emailMatch[0]);
      }
    }

    if (value.split(".").length === 3) {
      const decoded = decodeJwtPayload(value);
      const emailFromJwt = findEmailDeep(decoded);

      if (emailFromJwt) return emailFromJwt;
    }

    return "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const email = findEmailDeep(item);
      if (email) return email;
    }

    return "";
  }

  if (typeof value === "object") {
    const directEmail =
      value.email ||
      value.user_email ||
      value.userEmail ||
      value?.user?.email ||
      value?.profile?.email ||
      value?.session?.user?.email ||
      value?.currentUser?.email;

    if (directEmail) {
      return normalizeEmail(directEmail);
    }

    for (const key of Object.keys(value)) {
      const email = findEmailDeep(value[key]);
      if (email) return email;
    }
  }

  return "";
}

function getStoredUserEmail() {
  const storages = [localStorage, sessionStorage];

  const priorityKeys = [
    "socialpilot_user_email",
    "user_email",
    "email",
    "auth_email",
    "socialpilot_user",
    "user",
    "auth_user",
    "currentUser",
    "session",
    "supabase.auth.token",
  ];

  for (const storage of storages) {
    for (const key of priorityKeys) {
      const rawValue = storage.getItem(key);

      if (!rawValue) continue;

      try {
        const parsed = JSON.parse(rawValue);
        const email = findEmailDeep(parsed);

        if (email) return email;
      } catch {
        const email = findEmailDeep(rawValue);

        if (email) return email;
      }
    }
  }

  for (const storage of storages) {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);

      if (!key) continue;

      const rawValue = storage.getItem(key);

      if (!rawValue) continue;

      try {
        const parsed = JSON.parse(rawValue);
        const email = findEmailDeep(parsed);

        if (email) return email;
      } catch {
        const email = findEmailDeep(rawValue);

        if (email) return email;
      }
    }
  }

  return "";
}

export function Sidebar() {
  const [location, setLocation] = useLocation();

  const currentUserEmail = getStoredUserEmail();

  const isOfficialAccount =
    currentUserEmail === OFFICIAL_EMAIL.toLowerCase();

  const navItems = [
    ...baseNavItems,
    ...(isOfficialAccount ? officialOnlyNavItems : []),
    ...bottomNavItems,
  ];

  const handleLogout = () => {
    clearAuthToken();
    setLocation("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-full flex-col">
        <div className="p-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold">
              SP
            </div>

            <span className="font-bold text-lg tracking-tight group-hover:text-sidebar-primary transition-colors">
              SocialPilot Pro
            </span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
