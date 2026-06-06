import { ReactNode, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { useLocation } from "wouter";
import { isAuthenticated } from "@/lib/auth";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const authenticated = isAuthenticated();

  useEffect(() => {
    if (!authenticated) {
      setLocation("/login");
    }
  }, [authenticated, location, setLocation]);

  if (!authenticated) {
    return null;
  }

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />

        <main className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
