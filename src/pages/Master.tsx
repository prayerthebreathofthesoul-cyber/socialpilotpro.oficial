import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Crown,
  Lock,
  Unlock,
  Search,
  Building2,
  Users,
  BarChart3,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  useListStores,
  useUpdateStore,
  useDeleteStore,
  type StoreRecord,
} from "@/lib/mock-api";

const MASTER_ACCESS_KEY = "socialpilot_master_access";
const MASTER_PASSWORD = "admin123";
const OFFICIAL_EMAIL = "socialpilotpro.oficial@gmail.com";

type MasterStore = Partial<Omit<StoreRecord, "id">> & {
  id: number | string;
  companyId?: string;
  company_id?: string;
  userId?: string;
  user_id?: string;
  authUserId?: string;
  auth_user_id?: string;
  ownerName?: string | null;
  name?: string | null;
  email?: string | null;
  segment?: string | null;
  cnpj?: string | null;
  cpf?: string | null;
  documentNumber?: string | null;
  documentType?: string | null;
  plan?: "free" | "premium" | string | null;
  planStatus?: "active" | "blocked" | "cancelled" | string | null;
  postsLimit?: number | null;
  postsUsed?: number | null;
  instagramConnected?: boolean;
  facebookConnected?: boolean;
  tiktokConnected?: boolean;
  isMaster?: boolean;
};

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeText(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function getStoreCompanyId(store: MasterStore) {
  return store.company_id || store.companyId || String(store.id);
}

function isNumericId(id: number | string): id is number {
  return typeof id === "number" && Number.isFinite(id);
}

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function isMissingColumnError(error: any) {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.code === "42703" ||
    message.includes("column") ||
    message.includes("schema cache")
  );
}

async function readApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  if (response.status === 404 || text.toLowerCase().includes("page")) {
    throw new Error(
      "A API /api/master/delete-company não foi encontrada no servidor. Publique o arquivo api/master/delete-company.ts antes de excluir empresas."
    );
  }

  throw new Error(text || `Erro HTTP ${response.status} ao excluir empresa.`);
}

function normalizeStore(store: MasterStore): MasterStore {
  if (!isOfficialStore(store)) return store;

  return {
    ...store,
    name: store.name || "SocialPilot Pro Oficial",
    email: OFFICIAL_EMAIL,
    ownerName: store.ownerName || "SocialPilot Pro",
    segment: store.segment || "Gestão de redes sociais",
    plan: "premium",
    planStatus: "active",
    postsLimit: null,
    isMaster: true,
  };
}

function getStoreMergeKey(store: MasterStore) {
  const email = normalizeEmail(store.email);
  const documentNumber = normalizeText(
    store.documentNumber || store.cnpj || store.cpf
  );
  const companyId = getStoreCompanyId(store);

  if (email) return `email:${email}`;
  if (documentNumber) return `document:${documentNumber}`;
  if (companyId) return `company:${companyId}`;

  return `id:${String(store.id)}`;
}

function mergeStoreData(current: MasterStore, next: MasterStore): MasterStore {
  const currentIsPremium = current.plan === "premium";
  const nextIsPremium = next.plan === "premium";
  const currentIsBlocked = current.planStatus === "blocked";
  const nextIsBlocked = next.planStatus === "blocked";

  return normalizeStore({
    ...current,
    ...next,
    id: next.id || current.id,
    companyId: next.companyId || next.company_id || current.companyId,
    company_id: next.company_id || next.companyId || current.company_id,
    userId: next.userId || next.user_id || current.userId,
    user_id: next.user_id || next.userId || current.user_id,
    name: next.name || current.name,
    email: next.email || current.email,
    ownerName: next.ownerName || current.ownerName,
    segment: next.segment || current.segment,
    cnpj: next.cnpj || current.cnpj,
    cpf: next.cpf || current.cpf,
    documentNumber: next.documentNumber || current.documentNumber,
    plan: currentIsPremium || nextIsPremium ? "premium" : next.plan || current.plan,
    planStatus:
      currentIsBlocked || nextIsBlocked
        ? "blocked"
        : next.planStatus || current.planStatus || "active",
    postsLimit:
      currentIsPremium || nextIsPremium
        ? null
        : next.postsLimit ?? current.postsLimit ?? 15,
    postsUsed: Math.max(toNumber(current.postsUsed, 0), toNumber(next.postsUsed, 0)),
    instagramConnected:
      current.instagramConnected === true || next.instagramConnected === true,
    facebookConnected:
      current.facebookConnected === true || next.facebookConnected === true,
    tiktokConnected: current.tiktokConnected === true || next.tiktokConnected === true,
    isMaster: current.isMaster === true || next.isMaster === true,
  });
}

function dedupeStores(stores: MasterStore[]) {
  const map = new Map<string, MasterStore>();

  stores.forEach((store) => {
    const normalizedStore = normalizeStore(store);
    const key = getStoreMergeKey(normalizedStore);
    const current = map.get(key);

    map.set(
      key,
      current ? mergeStoreData(current, normalizedStore) : normalizedStore
    );
  });

  return Array.from(map.values());
}

function mergeStores(mockStores: MasterStore[], supabaseStores: MasterStore[]) {
  if (supabaseStores.length > 0) {
    return dedupeStores(supabaseStores);
  }

  return dedupeStores(mockStores);
}

function isOfficialStore(store: MasterStore) {
  return (
    store.isMaster === true ||
    normalizeEmail(store.email) === normalizeEmail(OFFICIAL_EMAIL)
  );
}

export default function Master() {
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [localStores, setLocalStores] = useState<MasterStore[]>([]);
  const [supabaseStores, setSupabaseStores] = useState<MasterStore[]>([]);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<MasterStore | null>(null);
  const [deletingStoreId, setDeletingStoreId] = useState<number | string | null>(
    null
  );
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const hasMasterAccess =
    typeof window !== "undefined" &&
    localStorage.getItem(MASTER_ACCESS_KEY) === "true";

  const [allowed, setAllowed] = useState(hasMasterAccess);

  const { data: stores = [], isLoading } = useListStores();
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();

  const getActionKey = (store: MasterStore, action: string) => {
    return `${getStoreMergeKey(store)}:${action}`;
  };

  const isRunningAction = (store: MasterStore, action: string) => {
    return runningAction === getActionKey(store, action);
  };

  const isStoreBusy = (store: MasterStore) => {
    return Boolean(runningAction?.startsWith(`${getStoreMergeKey(store)}:`));
  };

  const buttonMotionClass =
    "transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg active:translate-y-0 active:scale-95 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-none";

  const loadSupabaseCompanies = async () => {
    setIsLoadingSupabase(true);

    try {
      const { data: companies, error: companiesError } = await supabase
        .from("companies")
        .select("*");

      if (companiesError) {
        throw companiesError;
      }

      const companyRows = companies || [];
      const companyIds = companyRows.map((company: any) => company.id);

      const [profilesResult, socialAccountsResult] = await Promise.all([
        companyIds.length
          ? supabase.from("profiles").select("*").in("company_id", companyIds)
          : Promise.resolve({ data: [], error: null }),
        companyIds.length
          ? supabase
              .from("social_accounts")
              .select("company_id,platform,status,is_connected")
              .in("company_id", companyIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profilesResult.error) {
        console.warn("Erro ao carregar perfis no Master:", profilesResult.error);
      }

      if (socialAccountsResult.error) {
        console.warn(
          "Erro ao carregar contas sociais no Master:",
          socialAccountsResult.error
        );
      }

      const profileRows = profilesResult.data || [];
      const socialRows = socialAccountsResult.data || [];

      const realStores = companyRows.map((company: any) => {
        const profile = profileRows.find(
          (item: any) => item.company_id === company.id
        );

        const companyAccounts = socialRows.filter(
          (item: any) => item.company_id === company.id
        );

        const isPlatformConnected = (platform: string) => {
          return companyAccounts.some(
            (account: any) =>
              account.platform === platform &&
              account.status === "connected" &&
              account.is_connected !== false
          );
        };

        const rawPlan = company.plan || "free";
        const plan = rawPlan === "premium" ? "premium" : "free";
        const blocked =
          company.is_blocked === true ||
          company.plan_status === "blocked" ||
          company.status === "blocked";

        return normalizeStore({
          id: company.id,
          companyId: company.id,
          company_id: company.id,
          userId: profile?.user_id || company.user_id || null,
          user_id: profile?.user_id || company.user_id || null,
          name: company.name || "Empresa sem nome",
          email: company.email || profile?.email || "",
          ownerName: profile?.name || company.owner_name || company.name || "",
          segment: company.segment || "",
          cnpj: company.cnpj || "",
          cpf: company.cpf || "",
          documentType: company.document_type || null,
          documentNumber:
            company.document_number || company.cnpj || company.cpf || "",
          plan,
          planStatus: blocked ? "blocked" : company.plan_status || "active",
          postsLimit:
            plan === "premium"
              ? null
              : toNumber(company.posts_limit ?? company.postsLimit, 15),
          postsUsed: toNumber(company.posts_used ?? company.postsUsed, 0),
          instagramConnected: isPlatformConnected("instagram"),
          facebookConnected: isPlatformConnected("facebook"),
          tiktokConnected: isPlatformConnected("tiktok"),
          isMaster:
            company.is_master === true ||
            normalizeEmail(company.email || profile?.email) ===
              normalizeEmail(OFFICIAL_EMAIL),
        } as MasterStore);
      });

      setSupabaseStores(realStores);
    } catch (error: any) {
      console.error(error);
      toast.error(
        "Não foi possível carregar todas as empresas reais. Verifique as permissões RLS da tabela companies no Supabase."
      );
    } finally {
      setIsLoadingSupabase(false);
    }
  };

  useEffect(() => {
    setLocalStores(mergeStores(stores as MasterStore[], supabaseStores));
  }, [stores, supabaseStores]);

  useEffect(() => {
    if (allowed) {
      loadSupabaseCompanies();
    }
  }, [allowed]);

  const filteredStores = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return localStores;

    return localStores.filter((store) => {
      return (
        normalizeText(store.name).includes(term) ||
        normalizeText(store.email).includes(term) ||
        normalizeText(store.ownerName).includes(term) ||
        normalizeText(store.segment).includes(term) ||
        normalizeText(store.plan).includes(term) ||
        normalizeText(store.planStatus).includes(term) ||
        normalizeText(store.cnpj).includes(term) ||
        normalizeText(store.cpf).includes(term) ||
        normalizeText(store.documentNumber).includes(term)
      );
    });
  }, [localStores, search]);

  const isLoadingCompanies = isLoading || isLoadingSupabase;

  const totalStores = localStores.length;

  const premiumStores = localStores.filter(
    (store) => store.plan === "premium"
  ).length;

  const freeStores = localStores.filter(
    (store) => store.plan !== "premium"
  ).length;

  const blockedStores = localStores.filter(
    (store) => store.planStatus === "blocked"
  ).length;

  function handleLogin() {
    if (password !== MASTER_PASSWORD) {
      toast.error("Senha master incorreta.");
      return;
    }

    localStorage.setItem(MASTER_ACCESS_KEY, "true");
    setAllowed(true);
    toast.success("Acesso master liberado.");
  }

  function handleLogout() {
    localStorage.removeItem(MASTER_ACCESS_KEY);
    setAllowed(false);
    setPassword("");
    toast.success("Você saiu do painel master.");
  }

  async function updateCompanyInSupabase(
    store: MasterStore,
    payloads: Record<string, unknown>[]
  ) {
    const companyId = getStoreCompanyId(store);

    if (!companyId) return;

    let lastError: any = null;

    for (const payload of payloads) {
      const payloadWithUpdatedAt = {
        ...payload,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("companies")
        .update(payloadWithUpdatedAt)
        .eq("id", companyId);

      if (!error) return;

      lastError = error;

      if (!isMissingColumnError(error)) {
        break;
      }

      const { error: retryError } = await supabase
        .from("companies")
        .update(payload)
        .eq("id", companyId);

      if (!retryError) return;

      lastError = retryError;

      if (!isMissingColumnError(retryError)) {
        break;
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  function updateStoreLocal(storeId: number | string, data: Partial<MasterStore>) {
    setLocalStores((currentStores) =>
      currentStores.map((store) =>
        store.id === storeId
          ? {
              ...store,
              ...data,
            }
          : store
      )
    );

    setSupabaseStores((currentStores) =>
      currentStores.map((store) =>
        store.id === storeId || getStoreCompanyId(store) === String(storeId)
          ? {
              ...store,
              ...data,
            }
          : store
      )
    );

    if (isNumericId(storeId)) {
      updateStore.mutate(
        {
          id: storeId,
          data: data as Partial<StoreRecord>,
        },
        {
          onError: () => {
            toast.error("Erro ao salvar alteração local.");
          },
        }
      );
    }
  }

  async function activatePremium(store: MasterStore) {
    if (isOfficialStore(store)) {
      toast.info("A conta oficial já é Premium e não pode ser alterada.");
      return;
    }

    setRunningAction(getActionKey(store, "premium"));

    try {
      await updateCompanyInSupabase(store, [
        {
          plan: "premium",
          plan_status: "active",
          status: "active",
          is_blocked: false,
          posts_limit: null,
        },
        {
          plan: "premium",
          plan_status: "active",
          posts_limit: null,
        },
        {
          plan: "premium",
        },
      ]);

      updateStoreLocal(store.id, {
        plan: "premium",
        planStatus: "active",
        postsLimit: null,
      });

      toast.success("Plano Premium ativado.");
    } catch (error: any) {
      console.error(error);
      toast.error(
        "Plano alterado na tela, mas não foi salvo no Supabase. Verifique as colunas/permissões da tabela companies."
      );
    } finally {
      setRunningAction(null);
    }
  }

  async function cancelPremium(store: MasterStore) {
    if (isOfficialStore(store)) {
      toast.error("A conta oficial não pode voltar para o plano gratuito.");
      return;
    }

    setRunningAction(getActionKey(store, "cancel-premium"));

    try {
      await updateCompanyInSupabase(store, [
        {
          plan: "free",
          plan_status: "active",
          status: "active",
          is_blocked: false,
          posts_limit: 15,
        },
        {
          plan: "free",
          plan_status: "active",
          posts_limit: 15,
        },
        {
          plan: "free",
        },
      ]);

      updateStoreLocal(store.id, {
        plan: "free",
        planStatus: "active",
        postsLimit: 15,
      });

      toast.success("Premium cancelado. Conta voltou para o plano gratuito.");
    } catch (error: any) {
      console.error(error);
      toast.error(
        "Plano alterado na tela, mas não foi salvo no Supabase. Verifique as colunas/permissões da tabela companies."
      );
    } finally {
      setRunningAction(null);
    }
  }

  async function blockStore(store: MasterStore) {
    if (isOfficialStore(store)) {
      toast.error("A conta oficial não pode ser bloqueada.");
      return;
    }

    setRunningAction(getActionKey(store, "block"));

    try {
      await updateCompanyInSupabase(store, [
        {
          plan_status: "blocked",
          status: "blocked",
          is_blocked: true,
        },
        {
          plan_status: "blocked",
        },
        {
          status: "blocked",
        },
        {
          is_blocked: true,
        },
      ]);

      updateStoreLocal(store.id, {
        planStatus: "blocked",
      });

      toast.success("Conta bloqueada.");
    } catch (error: any) {
      console.error(error);
      toast.error(
        "Conta bloqueada na tela, mas não foi salva no Supabase. Verifique se existe coluna plan_status, status ou is_blocked."
      );
    } finally {
      setRunningAction(null);
    }
  }

  async function unblockStore(store: MasterStore) {
    setRunningAction(getActionKey(store, "unblock"));

    try {
      await updateCompanyIn
