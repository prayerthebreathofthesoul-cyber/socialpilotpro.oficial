import { useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { useListStores, useUpdateStore, useListPosts } from "@/lib/mock-api";

const MASTER_ACCESS_KEY = "socialpilot_master_access";
const MASTER_PASSWORD = "admin123";

export default function Master() {
  const [password, setPassword] = useState("");
  const [search, setSearch] = useState("");

  const hasMasterAccess =
    typeof window !== "undefined" &&
    localStorage.getItem(MASTER_ACCESS_KEY) === "true";

  const [allowed, setAllowed] = useState(hasMasterAccess);

  const { data: stores = [], isLoading } = useListStores();
  const { data: posts = [] } = useListPosts();
  const updateStore = useUpdateStore();

  const filteredStores = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return stores;

    return stores.filter((store) => {
      return (
        store.name?.toLowerCase().includes(term) ||
        store.email?.toLowerCase().includes(term) ||
        store.segment?.toLowerCase().includes(term) ||
        store.plan?.toLowerCase().includes(term)
      );
    });
  }, [stores, search]);

  const totalStores = stores.length;
  const premiumStores = stores.filter((store) => store.plan === "premium").length;
  const freeStores = stores.filter((store) => store.plan !== "premium").length;
  const blockedStores = stores.filter(
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

  function activatePremium(storeId: number) {
    updateStore.mutate(
      {
        id: storeId,
        data: {
          plan: "premium",
          planStatus: "active",
          postsLimit: null,
        },
      },
      {
        onSuccess: () => toast.success("Plano Premium ativado."),
        onError: () => toast.error("Erro ao ativar Premium."),
      }
    );
  }

  function activateFree(storeId: number) {
    updateStore.mutate(
      {
        id: storeId,
        data: {
          plan: "free",
          planStatus: "active",
          postsLimit: 15,
        },
      },
      {
        onSuccess: () => toast.success("Conta voltou para o plano gratuito."),
        onError: () => toast.error("Erro ao alterar plano."),
      }
    );
  }

  function blockStore(storeId: number) {
    updateStore.mutate(
      {
        id: storeId,
        data: {
          planStatus: "blocked",
        },
      },
      {
        onSuccess: () => toast.success("Conta bloqueada."),
        onError: () => toast.error("Erro ao bloquear conta."),
      }
    );
  }

  function unblockStore(storeId: number) {
    updateStore.mutate(
      {
        id: storeId,
        data: {
          planStatus: "active",
        },
      },
      {
        onSuccess: () => toast.success("Conta reativada."),
        onError: () => toast.error("Erro ao reativar conta."),
      }
    );
  }

  function resetUsage(storeId: number) {
    updateStore.mutate(
      {
        id: storeId,
        data: {
          postsUsed: 0,
        },
      },
      {
        onSuccess: () => toast.success("Uso mensal zerado."),
        onError: () => toast.error("Erro ao zerar uso."),
      }
    );
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
              Área restrita para controlar planos, bloqueios e empresas do
              SocialPilot Pro.
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

            <Button
              className="w-full bg-blue-950 hover:bg-blue-900"
              onClick={handleLogin}
            >
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
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">
              Painel Master
            </h1>
            <p className="text-slate-600">
              Controle empresas, planos, limites e bloqueios do SocialPilot Pro.
            </p>
          </div>

          <Button variant="outline" onClick={handleLogout}>
            Sair do Master
          </Button>
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
                  Altere planos, bloqueie contas e acompanhe o uso mensal.
                </CardDescription>
              </div>

              <div className="relative w-full lg:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar empresa, email ou plano..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
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

                  const postsUsed =
                    store.id === 1 ? posts.length : store.postsUsed ?? 0;

                  const postsLimit = isPremium
                    ? "Ilimitado"
                    : store.postsLimit ?? 15;

                  return (
                    <div
                      key={store.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-950">
                              {store.name}
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
                          </div>

                          <div className="grid gap-1 text-sm text-slate-600 md:grid-cols-2">
                            <p>
                              <strong>Email:</strong>{" "}
                              {store.email || "Não informado"}
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
                              <strong>CNPJ:</strong>{" "}
                              {store.cnpj || "Não informado"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2">
                            <Badge
                              variant={
                                store.instagramConnected ? "default" : "outline"
                              }
                            >
                              Instagram{" "}
                              {store.instagramConnected ? "conectado" : "off"}
                            </Badge>

                            <Badge
                              variant={
                                store.facebookConnected ? "default" : "outline"
                              }
                            >
                              Facebook{" "}
                              {store.facebookConnected ? "conectado" : "off"}
                            </Badge>

                            <Badge
                              variant={
                                store.tiktokConnected ? "default" : "outline"
                              }
                            >
                              TikTok{" "}
                              {store.tiktokConnected ? "conectado" : "off"}
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
                              <strong className="text-slate-950">
                                {postsUsed}
                              </strong>
                            </p>

                            <p>
                              Limite:{" "}
                              <strong className="text-slate-950">
                                {postsLimit}
                              </strong>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                        {!isPremium ? (
                          <Button
                            className="bg-orange-600 hover:bg-orange-700"
                            onClick={() => activatePremium(store.id)}
                            disabled={updateStore.isPending}
                          >
                            <Crown className="mr-2 h-4 w-4" />
                            Ativar Premium
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => activateFree(store.id)}
                            disabled={updateStore.isPending}
                          >
                            Voltar para Gratuito
                          </Button>
                        )}

                        {!isBlocked ? (
                          <Button
                            variant="destructive"
                            onClick={() => blockStore(store.id)}
                            disabled={updateStore.isPending}
                          >
                            <Lock className="mr-2 h-4 w-4" />
                            Bloquear
                          </Button>
                        ) : (
                          <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => unblockStore(store.id)}
                            disabled={updateStore.isPending}
                          >
                            <Unlock className="mr-2 h-4 w-4" />
                            Reativar
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          onClick={() => resetUsage(store.id)}
                          disabled={updateStore.isPending}
                        >
                          <RefreshCcw className="mr-2 h-4 w-4" />
                          Zerar uso mensal
                        </Button>
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
