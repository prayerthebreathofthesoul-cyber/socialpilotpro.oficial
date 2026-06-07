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
    <div className="min-h-[100dvh] bg-background text-foreground">
      <Sidebar />

      <div className="flex min-h-[100dvh] flex-col md:pl-64">
        <MobileNav />

        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
