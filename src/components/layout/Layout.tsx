import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { useLocation } from "wouter";
import { getLoggedUserEmail, isAuthenticated, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

async function getCurrentUserEmail() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email || getLoggedUserEmail();
}

async function checkCompanyBlocked(email: string) {
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("companies")
    .select("id, plan_status, status, is_blocked")
    .eq("email", cleanEmail)
    .limit(1);

  if (error) {
    throw error;
  }

  const company = data?.[0];

  return (
    company?.is_blocked === true ||
    company?.plan_status === "blocked" ||
    company?.status === "blocked"
  );
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const authenticated = isAuthenticated();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    let active = true;

    async function verifyAccess() {
      if (!authenticated) {
        setLocation("/login");
        return;
      }

      try {
        setIsCheckingAccess(true);

        const email = await getCurrentUserEmail();

        if (!email) {
          await signOut();
          setLocation("/login");
          return;
        }

        const isBlocked = await checkCompanyBlocked(email);

        if (isBlocked) {
          await signOut();

          if (active) {
            toast.error("Conta bloqueada. Entre em contato com o suporte.");
            setLocation("/login");
          }

          return;
        }

        if (active) {
          setIsCheckingAccess(false);
        }
      } catch (error) {
        console.error("Erro ao verificar acesso da empresa:", error);

        await signOut();

        if (active) {
          toast.error("Não foi possível verificar o acesso da conta.");
          setLocation("/login");
        }
      }
    }

    verifyAccess();

    return () => {
      active = false;
    };
  }, [authenticated, location, setLocation]);

  if (!authenticated || isCheckingAccess) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Verificando acesso...
        </div>
      </div>
    );
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
