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
const USER_EMAIL_KEY = "socialpilot_user_email";
const MASTER_ACCESS_KEY = "socialpilot_master_access";
const OFFICIAL_LOGO_PATH = "/ícone_social_pilotpro.png";

const baseNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Calendário", href: "/calendar", icon: Calendar },
  { name: "Biblioteca", href: "/media", icon: ImageIcon },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
];

const officialOnlyNavItems = [{ name: "Planos", href: "/plans", icon: Crown }];

const bottomNavItems = [
  { name: "Configurações", href: "/settings", icon: Settings },
  { name: "Suporte", href: "/support", icon: HelpCircle },
];

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function getCurrentUserEmail() {
  if (typeof window === "undefined") return "";
  return normalizeEmail(localStorage.getItem(USER_EMAIL_KEY));
}

export function Sidebar() {
  const [location, setLocation] = useLocation();

  const currentUserEmail = getCurrentUserEmail();

  const isOfficialAccount =
    currentUserEmail === normalizeEmail(OFFICIAL_EMAIL);

  const navItems = [
    ...baseNavItems,
    ...(isOfficialAccount ? officialOnlyNavItems : []),
    ...bottomNavItems,
  ];

  const handleLogout = () => {
    localStorage.removeItem(USER_EMAIL_KEY);
    localStorage.removeItem(MASTER_ACCESS_KEY);
    sessionStorage.removeItem(USER_EMAIL_KEY);

    clearAuthToken();
    setLocation("/login");
  };

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-full flex-col">
        <div className="p-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src={OFFICIAL_LOGO_PATH}
              alt="Logo oficial do Social Pilot PRO"
              className="h-10 w-10 rounded-lg object-cover shadow-sm"
            />

            <span className="font-bold text-lg tracking-tight group-hover:text-sidebar-primary transition-colors">
              Social Pilot PRO
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
