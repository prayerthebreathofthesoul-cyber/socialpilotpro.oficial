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

type CompanyAccess = {
  id?: string;
  plan?: string | null;
  plan_status?: string | null;
  status?: string | null;
  is_blocked?: boolean | null;
  free_expires_at?: string | null;
};

async function getCurrentUserEmail() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.email || getLoggedUserEmail();
}

function isFreeTrialExpired(company?: CompanyAccess | null) {
  if (!company || company.plan !== "free" || !company.free_expires_at) {
    return false;
  }

  const expiresAt = new Date(company.free_expires_at);

  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return expiresAt.getTime() <= Date.now();
}

async function syncExpiredFreeCompanies() {
  const { error } = await supabase.rpc("block_expired_free_companies");

  if (error) {
    console.warn("Não foi possível sincronizar contas gratuitas vencidas:", error);
  }
}

async function blockExpiredFreeCompany(company: CompanyAccess, email: string) {
  const payload = {
    plan_status: "blocked",
    status: "blocked",
    is_blocked: true,
  };

  const { error } = company.id
    ? await supabase.from("companies").update(payload).eq("id", company.id)
    : await supabase.from("companies").update(payload).eq("email", email);

  if (error) {
    console.warn(
      "O acesso gratuito venceu, mas o Supabase não permitiu salvar o bloqueio:",
      error
    );
  }
}

async function checkCompanyAccess(email: string) {
  const cleanEmail = email.trim().toLowerCase();

  await syncExpiredFreeCompanies();

  const { data, error } = await supabase
    .from("companies")
    .select("id, plan, plan_status, status, is_blocked, free_expires_at")
    .eq("email", cleanEmail)
    .limit(1);

  if (error) {
    throw error;
  }

  const company = data?.[0] as CompanyAccess | undefined;

  const alreadyBlocked =
    company?.is_blocked === true ||
    company?.plan_status === "blocked" ||
    company?.status === "blocked";

  if (alreadyBlocked) {
    return {
      blocked: true,
      reason: "blocked" as const,
    };
  }

  if (isFreeTrialExpired(company)) {
    await blockExpiredFreeCompany(company, cleanEmail);

    return {
      blocked: true,
      reason: "free_expired" as const,
    };
  }

  return {
    blocked: false,
    reason: null,
  };
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

        const access = await checkCompanyAccess(email);

        if (access.blocked) {
          await signOut();

          if (active) {
            toast.error(
              access.reason === "free_expired"
                ? "Seu acesso gratuito de 3 dias expirou. Ative o Premium para continuar usando."
                : "Conta bloqueada. Entre em contato com o suporte."
            );

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
