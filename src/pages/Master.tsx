import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Building2,
  Crown,
  Lock,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  useDeleteStore,
  useListStores,
  useUpdateStore,
  type StoreRecord,
} from "@/lib/mock-api";

const MASTER_ACCESS_KEY = "socialpilot_master_access";
const MASTER_PASSWORD = "admin123";
const OFFICIAL_EMAIL = "socialpilotpro.oficial@gmail.com";
const PREMIUM_DAYS = 30;

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
  premiumStartedAt?: string | null;
  premiumExpiresAt?: string | null;
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

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function getStoreCompanyId(store: MasterStore) {
  return store.company_id || store.companyId || String(store.id);
}

function isNumericId(id: number | string): id is number {
  return typeof id === "number" && Number.isFinite(id);
}

function isOfficialStore(store: MasterStore) {
  return (
    store.isMaster === true ||
    normalizeEmail(store.email) === normalizeEmail(OFFICIAL_EMAIL)
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
      "A API solicitada não foi encontrada no servidor. Verifique se o arquivo existe dentro da pasta api/master."
    );
  }

  throw new Error(text || `Erro HTTP ${response.status}.`);
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
    premiumStartedAt: next.premiumStartedAt ?? current.premiumStartedAt ?? null,
    premiumExpiresAt: next.premiumExpiresAt ?? current.premiumExpiresAt ?? null,
    instagramConnected:
      current.instagramConnected === true || next.instagramConnected === true,
    facebookConnected:
      current.facebookConnected === true || next.facebookConnected === true,
    tiktokConnected:
      current.tiktokConnected === true || next.tiktokConnected === true,
    isMaster: current.isMaster === true || next.isMaster === true,
  });
}

function dedupeStores(stores: MasterStore[]) {
  const map = new Map<string, MasterStore>();

  stores.forEach((store) => {
    const normalized = normalizeStore(store);
    const key = getStoreMergeKey(normalized);
    const current = map.get(key);

    map.set(key, current ? mergeStoreData(current, normalized) : normalized);
  });

  return Array.from(map.values());
}

function mergeStores(mockStores: MasterStore[], supabaseStores: MasterStore[]) {
  return supabaseStores.length > 0
    ? dedupeStores(supabaseStores)
    : dedupeStores(mockStores);
}

export default function Master() {
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");
  const [localStores, setLocalStores] = useState<MasterStore[]>([]);
  const [supabaseStores, setSupabaseStores] = useState<MasterStore[]>([]);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<MasterStore | null>(null);
  const [deletingStoreId, setDeletingStoreId] = useState<number | string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  const hasMasterAccess =
    typeof window !== "undefined" &&
    localStorage.getItem(MASTER_ACCESS_KEY) === "true";

  const [allowed, setAllowed] = useState(hasMasterAccess);

  const { data: stores = [], isLoading } = useListStores();
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();

  const buttonMotionClass =
    "transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg active:translate-y-0 active:scale-95 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-none";

  const getActionKey = (store: MasterStore, action: string) => {
    return `${getStoreMergeKey(store)}:${action}`;
  };

  const isRunningAction = (store: MasterStore, action: string) => {
    return runningAction === getActionKey(store, action);
  };

  const isStoreBusy = (store: MasterStore) => {
    return Boolean(runningAction?.startsWith(`${getStoreMergeKey(store)}:`));
  };

  const loadSupabaseCompanies = async () => {
    setIsLoadingSupabase(true);

    try {
      const { data: companies, error: companiesError } = await supabase
        .from("companies")
        .select("*");

      if (companiesError) throw companiesError;

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
        console.warn("Erro ao carregar contas sociais no Master:", socialAccountsResult.error);
      }

      const profileRows = profilesResult.data || [];
      const socialRows = socialAccountsResult.data || [];

      const realStores = companyRows.map((company: any) => {
        const profile = profileRows.find((item: any) => item.company_id === company.id);
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
          documentNumber: company.document_number || company.cnpj || company.cpf || "",
          plan,
          planStatus: blocked ? "blocked" : company.plan_status || "active",
          postsLimit:
            plan === "premium"
              ? null
              : toNumber(company.posts_limit ?? company.postsLimit, 15),
          postsUsed: toNumber(company.posts_used ?? company.postsUsed, 0),
          premiumStartedAt: company.premium_started_at || null,
          premiumExpiresAt: company.premium_expires_at || null,
          instagramConnected: isPlatformConnected("instagram"),
          facebookConnected: isPlatformConnected("facebook"),
          tiktokConnected: isPlatformConnected("tiktok"),
          isMaster:
            company.is_master === true ||
            normalizeEmail(company.email || profile?.email) === normalizeEmail(OFFICIAL_EMAIL),
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
    if (allowed) loadSupabaseCompanies();
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
  const premiumStores = localStores.filter((store) => store.plan === "premium").length;
  const freeStores = localStores.filter((store) => store.plan !== "premium").length;
  const blockedStores = localStores.filter((store) => store.planStatus === "blocked").length;

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

    if (!companyId) {
      throw new Error("ID da empresa não encontrado.");
    }

    const payload = payloads[0];

    if (!payload) {
      throw new Error("Nenhuma alteração foi enviada.");
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const response = await fetch("/api/master/update-company", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        companyId,
        payload,
      }),
    });

    const result = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(result?.error || "Erro ao salvar alteração da empresa.");
    }

    return result;
  }

  function updateStoreLocal(storeId: number | string, data: Partial<MasterStore>) {
    setLocalStores((currentStores) =>
      currentStores.map((store) =>
        store.id === storeId ? { ...store, ...data } : store
      )
    );

    setSupabaseStores((currentStores) =>
      currentStores.map((store) =>
        store.id === storeId || getStoreCompanyId(store) === String(storeId)
          ? { ...store, ...data }
          : store
      )
    );

    if (isNumericId(storeId)) {
      updateStore.mutate(
        { id: storeId, data: data as Partial<StoreRecord> },
        { onError: () => toast.error("Erro ao salvar alteração local.") }
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
      const premiumStartedAt = new Date();
      const premiumExpiresAt = new Date(premiumStartedAt);

      premiumExpiresAt.setDate(premiumExpiresAt.getDate() + PREMIUM_DAYS);

      const premiumStartedAtIso = premiumStartedAt.toISOString();
      const premiumExpiresAtIso = premiumExpiresAt.toISOString();

      await updateCompanyInSupabase(store, [
        {
          plan: "premium",
          plan_status: "active",
          status: "active",
          is_blocked: false,
          posts_limit: null,
          premium_started_at: premiumStartedAtIso,
          premium_expires_at: premiumExpiresAtIso,
        },
      ]);

      updateStoreLocal(store.id, {
        plan: "premium",
        planStatus: "active",
        postsLimit: null,
        premiumStartedAt: premiumStartedAtIso,
        premiumExpiresAt: premiumExpiresAtIso,
      });

      await loadSupabaseCompanies();
      toast.success(`Plano Premium ativado por ${PREMIUM_DAYS} dias.`);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Plano Premium não foi salvo no banco.");
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
          premium_started_at: null,
          premium_expires_at: null,
        },
      ]);

      updateStoreLocal(store.id, {
        plan: "free",
        planStatus: "active",
        postsLimit: 15,
        premiumStartedAt: null,
        premiumExpiresAt: null,
      });

      await loadSupabaseCompanies();
      toast.success("Premium cancelado. Conta voltou para o plano gratuito.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Cancelamento do Premium não foi salvo no banco.");
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
      ]);

      updateStoreLocal(store.id, { planStatus: "blocked" });
      await loadSupabaseCompanies();
      toast.success("Conta bloqueada.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Bloqueio não foi salvo no banco.");
    } finally {
      setRunningAction(null);
    }
  }

  async function unblockStore(store: MasterStore) {
    setRunningAction(getActionKey(store, "unblock"));

    try {
      await updateCompanyInSupabase(store, [
        {
          plan_status: "active",
          status: "active",
          is_blocked: false,
        },
      ]);

      updateStoreLocal(store.id, { planStatus: "active" });
      await loadSupabaseCompanies();
      toast.success("Usuário ativado.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Ativação do usuário não foi salva no banco.");
    } finally {
      setRunningAction(null);
    }
  }

  async function resetUsage(store: MasterStore) {
    setRunningAction(getActionKey(store, "reset"));

    try {
      await updateCompanyInSupabase(store, [
        {
          posts_used: 0,
        },
      ]);

      updateStoreLocal(store.id, { postsUsed: 0 });
      await loadSupabaseCompanies();
      toast.success("Uso mensal zerado.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Uso mensal não foi salvo no banco.");
    } finally {
      setRunningAction(null);
    }
  }

  async function removeStore(store: MasterStore) {
    if (isOfficialStore(store)) {
      toast.error("A conta oficial não pode ser excluída.");
      return;
    }

    setStoreToDelete(store);
  }

  async function confirmRemoveStore() {
    if (!storeToDelete) return;

    const store = storeToDelete;

    try {
      setDeletingStoreId(store.id);
      setRunningAction(getActionKey(store, "delete"));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const companyId = store.company_id || store.companyId || getStoreCompanyId(store);

      const userId =
        store.user_id ||
        store.userId ||
        store.auth_user_id ||
        store.authUserId ||
        null;

      const response = await fetch("/api/master/delete-company", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          companyId,
          userId,
          email: store.email,
          isOfficial: false,
        }),
      });

      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result?.error || "Erro ao excluir empresa.");
      }

      setLocalStores((currentStores) =>
        currentStores.filter(
          (currentStore) =>
            currentStore.id !== store.id &&
            getStoreMergeKey(currentStore) !== getStoreMergeKey(store)
        )
      );

      setSupabaseStores((currentStores) =>
        currentStores.filter(
          (currentStore) =>
            currentStore.id !== store.id &&
            getStoreCompanyId(currentStore) !== getStoreCompanyId(store) &&
            getStoreMergeKey(currentStore) !== getStoreMergeKey(store)
        )
      );

      if (isNumericId(store.id)) {
        deleteStore.mutate(
          { id: store.id },
          {
            onError: () => {
              console.warn(
                "Empresa excluída na API, mas houve erro ao limpar o registro local."
              );
            },
          }
        );
      }

      toast.success("Empresa e usuário excluídos com sucesso.");
      setStoreToDelete(null);
    } catch (error: any) {
      console.error("Erro ao excluir empresa:", error);
      toast.error(error?.message || "Erro ao excluir empresa.");
    } finally {
      setDeletingStoreId(null);
      setRunningAction(null);
    }
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-950 text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <CardTitle className="text-2xl">Painel Master</CardTitle>

            <CardDescription>
              Área restrita para controlar planos, bloqueios e empresas do SocialPilot Pro.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Digite a senha master"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleLogin();
              }}
            />

            <Button className="w-full bg-blue-950 hover:bg-blue-900" onClick={handleLogin}>
              Entrar no Painel Master
            </Button>

            <p className="text-center text-xs text-slate-500">
              Senha inicial: <strong>admin123</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Layout>
      {storeToDelete && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
          onClick={() => {
            if (deletingStoreId !== storeToDelete.id) {
              setStoreToDelete(null);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 className="h-7 w-7" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-slate-950">Excluir empresa</h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Você está prestes a excluir esta empresa. Essa ação removerá o
                  cadastro, os dados vinculados e liberará o e-mail/CPF/CNPJ para
                  um novo cadastro.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                Empresa selecionada
              </p>

              <p className="mt-2 text-lg font-bold text-slate-950">
                {storeToDelete.name || "Empresa sem nome"}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                {storeToDelete.email || "E-mail não informado"}
              </p>

              <p className="mt-1 text-sm text-slate-600">
                CPF/CNPJ:{" "}
                {storeToDelete.documentNumber ||
                  storeToDelete.cnpj ||
                  storeToDelete.cpf ||
                  "Não informado"}
              </p>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Essa ação não pode ser desfeita pelo painel. Confirme somente se
              tiver certeza que deseja remover esta empresa.
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className={`${buttonMotionClass} h-11 px-5`}
                onClick={() => setStoreToDelete(null)}
                disabled={deletingStoreId === storeToDelete.id}
              >
                Cancelar
              </Button>

              <Button
                variant="destructive"
                className={`${buttonMotionClass} h-11 bg-red-600 px-5 hover:bg-red-700 ${
                  deletingStoreId === storeToDelete.id ? "animate-pulse" : ""
                }`}
                onClick={confirmRemoveStore}
                disabled={deletingStoreId === storeToDelete.id}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deletingStoreId === storeToDelete.id
                  ? "Excluindo..."
                  : "Sim, excluir empresa"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Painel Master</h1>

            <p className="text-slate-600">
              Controle empresas, planos, limites e bloqueios do SocialPilot Pro.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className={`${buttonMotionClass} hover:border-blue-950 hover:bg-blue-50 hover:text-blue-950 ${
                isLoadingSupabase ? "animate-pulse" : ""
              }`}
              onClick={loadSupabaseCompanies}
              disabled={isLoadingSupabase}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {isLoadingSupabase ? "Atualizando..." : "Atualizar lista"}
            </Button>

            <Button
              variant="outline"
              className={`${buttonMotionClass} hover:border-red-500 hover:bg-red-50 hover:text-red-600`}
              onClick={handleLogout}
            >
              Sair do Master
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">Empresas</p>
                <p className="text-3xl font-bold">{totalStores}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-950" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">Premium</p>
                <p className="text-3xl font-bold">{premiumStores}</p>
              </div>
              <Crown className="h-8 w-8 text-orange-600" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">Gratuitas</p>
                <p className="text-3xl font-bold">{freeStores}</p>
              </div>
              <Users className="h-8 w-8 text-emerald-600" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-slate-500">Bloqueadas</p>
                <p className="text-3xl font-bold">{blockedStores}</p>
              </div>
              <Lock className="h-8 w-8 text-red-600" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Empresas cadastradas</CardTitle>
                <CardDescription>
                  Altere planos, bloqueie contas, exclua empresas comuns e acompanhe o uso mensal.
                </CardDescription>
              </div>

              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar empresa, email, CPF/CNPJ ou plano..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoadingCompanies ? (
              <div className="rounded-lg border border-slate-200 p-6 text-center text-slate-500">
                Carregando empresas...
              </div>
            ) : filteredStores.length === 0 ? (
              <div className="rounded-lg border border-slate-200 p-6 text-center text-slate-500">
                Nenhuma empresa encontrada.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredStores.map((store) => {
                  const isPremium = store.plan === "premium";
                  const isBlocked = store.planStatus === "blocked";
                  const protectedOfficial = isOfficialStore(store);
                  const storeBusy = isStoreBusy(store);
                  const activatingPremium = isRunningAction(store, "premium");
                  const cancellingPremium = isRunningAction(store, "cancel-premium");
                  const blockingStore = isRunningAction(store, "block");
                  const unblockingStore = isRunningAction(store, "unblock");
                  const resettingUsage = isRunningAction(store, "reset");
                  const deletingStore = deletingStoreId === store.id;
                  const documentNumber = store.documentNumber || store.cnpj || store.cpf || "";
                  const postsUsed = store.postsUsed ?? 0;
                  const postsLimit = isPremium ? "Ilimitado" : store.postsLimit ?? 15;

                  return (
                    <div
                      key={store.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-950">
                              {store.name || "Empresa sem nome"}
                            </h3>

                            {isPremium ? (
                              <Badge className="bg-orange-600 hover:bg-orange-600">
                                Premium
                              </Badge>
                            ) : (
                              <Badge variant="outline">Gratuito</Badge>
                            )}

                            {isBlocked ? (
                              <Badge className="bg-red-600 hover:bg-red-600">
                                Bloqueada
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-600 hover:bg-emerald-600">
                                Ativa
                              </Badge>
                            )}

                            {protectedOfficial && (
                              <Badge className="bg-blue-950 hover:bg-blue-950">
                                Oficial
                              </Badge>
                            )}
                          </div>

                          <div className="grid gap-1 text-sm text-slate-600 md:grid-cols-2">
                            <p>
                              <strong>Email:</strong> {store.email || "Não informado"}
                            </p>
                            <p>
                              <strong>Responsável:</strong>{" "}
                              {store.ownerName || "Não informado"}
                            </p>
                            <p>
                              <strong>Segmento:</strong>{" "}
                              {store.segment || "Não informado"}
                            </p>
                            <p>
                              <strong>CPF/CNPJ:</strong>{" "}
                              {documentNumber || "Não informado"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2">
                            <Badge variant={store.instagramConnected ? "default" : "outline"}>
                              Instagram {store.instagramConnected ? "conectado" : "off"}
                            </Badge>

                            <Badge variant={store.facebookConnected ? "default" : "outline"}>
                              Facebook {store.facebookConnected ? "conectado" : "off"}
                            </Badge>

                            <Badge variant={store.tiktokConnected ? "default" : "outline"}>
                              TikTok {store.tiktokConnected ? "conectado" : "off"}
                            </Badge>
                          </div>
                        </div>

                        <div className="min-w-full rounded-lg bg-slate-50 p-4 xl:min-w-72">
                          <div className="mb-3 flex items-center gap-2 text-slate-700">
                            <BarChart3 className="h-4 w-4" />
                            <strong>Uso mensal</strong>
                          </div>

                          <div className="space-y-1 text-sm text-slate-600">
                            <p>
                              Posts usados:{" "}
                              <strong className="text-slate-950">{postsUsed}</strong>
                            </p>
                            <p>
                              Limite:{" "}
                              <strong className="text-slate-950">{postsLimit}</strong>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        {protectedOfficial ? (
                          <Button variant="outline" disabled>
                            Conta oficial protegida
                          </Button>
                        ) : (
                          <>
                            {!isPremium ? (
                              <Button
                                className={`${buttonMotionClass} bg-orange-600 hover:bg-orange-700 ${
                                  activatingPremium ? "animate-pulse" : ""
                                }`}
                                onClick={() => activatePremium(store)}
                                disabled={updateStore.isPending || storeBusy}
                              >
                                <Crown className="mr-2 h-4 w-4" />
                                {activatingPremium ? "Ativando..." : "Ativar Premium"}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                className={`${buttonMotionClass} hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700 ${
                                  cancellingPremium ? "animate-pulse" : ""
                                }`}
                                onClick={() => cancelPremium(store)}
                                disabled={updateStore.isPending || storeBusy}
                              >
                                {cancellingPremium ? "Cancelando..." : "Cancelar Premium"}
                              </Button>
                            )}

                            {!isBlocked ? (
                              <Button
                                variant="destructive"
                                className={`${buttonMotionClass} hover:bg-red-700 ${
                                  blockingStore ? "animate-pulse" : ""
                                }`}
                                onClick={() => blockStore(store)}
                                disabled={updateStore.isPending || storeBusy}
                              >
                                <Lock className="mr-2 h-4 w-4" />
                                {blockingStore ? "Bloqueando..." : "Bloquear"}
                              </Button>
                            ) : (
                              <Button
                                className={`${buttonMotionClass} bg-emerald-600 hover:bg-emerald-700 ${
                                  unblockingStore ? "animate-pulse" : ""
                                }`}
                                onClick={() => unblockStore(store)}
                                disabled={updateStore.isPending || storeBusy}
                              >
                                <Unlock className="mr-2 h-4 w-4" />
                                {unblockingStore ? "Ativando..." : "Ativar usuário"}
                              </Button>
                            )}
                          </>
                        )}

                        <Button
                          variant="outline"
                          className={`${buttonMotionClass} hover:border-blue-950 hover:bg-blue-50 hover:text-blue-950 ${
                            resettingUsage ? "animate-pulse" : ""
                          }`}
                          onClick={() => resetUsage(store)}
                          disabled={updateStore.isPending || storeBusy}
                        >
                          <RefreshCcw className="mr-2 h-4 w-4" />
                          {resettingUsage ? "Zerando..." : "Zerar uso mensal"}
                        </Button>

                        {!protectedOfficial && (
                          <Button
                            variant="destructive"
                            className={`${buttonMotionClass} hover:bg-red-700 ${
                              deletingStore ? "animate-pulse" : ""
                            }`}
                            onClick={() => removeStore(store)}
                            disabled={deletingStore || storeBusy}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingStore ? "Excluindo..." : "Excluir empresa"}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
