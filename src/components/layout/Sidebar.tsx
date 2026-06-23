import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  CalendarClock,
  FileEdit,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Image as ImageIcon,
  Trash2,
  Crown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type PostStatus = "draft" | "scheduled" | "published" | "failed";
type StatusFilter = PostStatus | "all";

type SupabasePost = {
  id: string;
  company_id: string;
  title: string;
  caption: string | null;
  hashtags: string | null;
  media_url: string | null;
  type: string;
  status: PostStatus;
  platforms: string[] | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  error_message?: string | null;
};

type SocialAccount = {
  id: string;
  company_id: string;
  platform: string;
  status: string | null;
  is_connected: boolean | null;
};

type CompanyPlan = {
  plan: string | null;
  updated_at: string | null;
  premium_started_at: string | null;
  premium_expires_at: string | null;
};

type StatusCounts = {
  draft: number;
  scheduled: number;
  published: number;
  failed: number;
};

type DashboardAlert = {
  id: string;
  severity: "info" | "warning" | "error";
  message: string;
};

type RecentActivity = {
  id: string;
  action: string;
  postTitle: string;
  timestamp: string;
  status: PostStatus;
  description: string;
};

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<SupabasePost[]>([]);
  const [company, setCompany] = useState<CompanyPlan | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [hiddenAlertIds, setHiddenAlertIds] = useState<string[]>([]);
  const [activeStatusFilter, setActiveStatusFilter] =
    useState<StatusFilter>("all");

  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    draft: 0,
    scheduled: 0,
    published: 0,
    failed: 0,
  });

  const getCompanyId = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Usuário não autenticado.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.company_id) {
      throw new Error("Empresa do usuário não encontrada.");
    }

    return profile.company_id as string;
  };

  const loadDashboardData = async () => {
    setIsLoading(true);

    try {
      const companyId = await getCompanyId();

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("plan, updated_at, premium_started_at, premium_expires_at")
        .eq("id", companyId)
        .maybeSingle();

      if (companyError) {
        throw companyError;
      }

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false });

      if (postsError) {
        throw postsError;
      }

      const { data: accountsData, error: accountsError } = await supabase
        .from("social_accounts")
        .select("id, company_id, platform, status, is_connected")
        .eq("company_id", companyId);

      if (accountsError) {
        throw accountsError;
      }

      const realPosts = (postsData || []) as SupabasePost[];
      const realAccounts = (accountsData || []) as SocialAccount[];

      setCompany((companyData || null) as CompanyPlan | null);
      setPosts(realPosts);
      setSocialAccounts(realAccounts);

      setStatusCounts({
        draft: realPosts.filter((post) => post.status === "draft").length,
        scheduled: realPosts.filter((post) => post.status === "scheduled")
          .length,
        published: realPosts.filter((post) => post.status === "published")
          .length,
        failed: realPosts.filter((post) => post.status === "failed").length,
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erro ao carregar dados do painel.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const refreshTimer = window.setInterval(() => {
      loadDashboardData();
    }, 30 * 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDashboardData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(refreshTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (statusCounts.failed <= 0) {
      setHiddenAlertIds((prev) => prev.filter((id) => id !== "failed-posts"));
      return;
    }

    setHiddenAlertIds((prev) => prev.filter((id) => id !== "failed-posts"));

    const timer = window.setTimeout(() => {
      setHiddenAlertIds((prev) =>
        prev.includes("failed-posts") ? prev : [...prev, "failed-posts"]
      );
    }, 5 * 60 * 1000);

    return () => window.clearTimeout(timer);
  }, [statusCounts.failed]);

  const premiumStartedAt = company?.premium_started_at
    ? new Date(company.premium_started_at)
    : company?.updated_at
      ? new Date(company.updated_at)
      : null;

  const premiumExpiresAt = company?.premium_expires_at
    ? new Date(company.premium_expires_at)
    : premiumStartedAt
      ? new Date(premiumStartedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
      : null;

  const premiumDaysLeft = premiumExpiresAt
    ? Math.max(
        0,
        Math.ceil(
          (premiumExpiresAt.getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 30;

  const isPremiumActive = company?.plan === "premium";

  const isAccountConnected = (platform: string) => {
    return socialAccounts.some(
      (account) =>
        account.platform === platform &&
        account.status === "connected" &&
        account.is_connected === true
    );
  };

  const facebookConnected = isAccountConnected("facebook");
  const instagramConnected = isAccountConnected("instagram");

  const alerts: DashboardAlert[] = [];

  if (statusCounts.failed > 0) {
    alerts.push({
      id: "failed-posts",
      severity: "error",
      message:
        "Existem publicações com falha. Verifique as permissões das redes sociais ou tente publicar novamente.",
    });
  }

  if (!facebookConnected && !instagramConnected) {
    alerts.push({
      id: "no-social-accounts",
      severity: "warning",
      message:
        "Conecte Instagram e Facebook para publicar automaticamente nas redes sociais.",
    });
  } else if (!instagramConnected) {
    alerts.push({
      id: "instagram-missing",
      severity: "info",
      message:
        "O Facebook está conectado. Conecte também o Instagram para publicar nas duas redes.",
    });
  } else if (!facebookConnected) {
    alerts.push({
      id: "facebook-missing",
      severity: "info",
      message:
        "O Instagram está conectado. Conecte também o Facebook para publicar nas duas redes.",
    });
  }

  const visibleAlerts = alerts.filter(
    (alert) => !hiddenAlertIds.includes(alert.id)
  );

  const recentPosts = [...posts]
    .filter((post) => {
      if (activeStatusFilter === "all") return true;
      return post.status === activeStatusFilter;
    })
    .sort((a, b) => {
      const getDate = (post: SupabasePost) => {
        if (post.status === "scheduled" && post.scheduled_at) {
          return new Date(post.scheduled_at).getTime();
        }

        if (post.status === "published" && post.published_at) {
          return new Date(post.published_at).getTime();
        }

        return new Date(post.updated_at || post.created_at).getTime();
      };

      return getDate(b) - getDate(a);
    })
    .slice(0, 4);

  const getPostsTitle = () => {
    if (activeStatusFilter === "scheduled") return "Posts Agendados";
    if (activeStatusFilter === "draft") return "Rascunhos";
    if (activeStatusFilter === "published") return "Posts Publicados";
    if (activeStatusFilter === "failed") return "Posts com Falha";
    return "Posts Recentes";
  };

  const getEmptyPostsMessage = () => {
    if (activeStatusFilter === "scheduled") {
      return "Você ainda não tem posts agendados.";
    }

    if (activeStatusFilter === "draft") {
      return "Você ainda não tem rascunhos salvos.";
    }

    if (activeStatusFilter === "published") {
      return "Você ainda não tem posts publicados.";
    }

    if (activeStatusFilter === "failed") {
      return "Você não tem posts com falha.";
    }

    return "Você ainda não tem nenhuma postagem salva no SocialPilot Pro.";
  };

  const getActivityDescription = (post: SupabasePost) => {
    if (post.status === "scheduled") {
      return post.scheduled_at
        ? `Agendado para ${format(
            new Date(post.scheduled_at),
            "dd/MM 'às' HH:mm",
            { locale: ptBR }
          )}`
        : "Post agendado para publicação automática.";
    }

    if (post.status === "published") {
      const platforms = post.platforms?.length
        ? post.platforms.join(", ")
        : "redes sociais";

      return `Publicado em ${platforms}.`;
    }

    if (post.status === "failed") {
      return post.error_message
        ? `Motivo: ${post.error_message.slice(0, 120)}`
        : "Motivo: houve uma falha na publicação. Verifique as permissões da conta conectada.";
    }

    return "Rascunho salvo. Ainda não foi agendado nem publicado.";
  };

  const recentActivity: RecentActivity[] = posts.slice(0, 6).map((post) => {
    const action =
      post.status === "draft"
        ? "Rascunho criado"
        : post.status === "scheduled"
          ? "Post agendado"
          : post.status === "published"
            ? "Post publicado com sucesso"
            : "Falha ao publicar";

    return {
      id: post.id,
      action,
      postTitle: post.title || "Post sem título",
      timestamp: post.updated_at || post.created_at,
      status: post.status,
      description: getActivityDescription(post),
    };
  });

  const openPostEditor = (postId: string) => {
    setLocation(`/posts/${postId}/edit`);
  };

  const handleDeletePost = async (post: SupabasePost) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o post "${post.title}"?\n\nEssa ação remove o post do sistema.`
    );

    if (!confirmed) return;

    setDeletingPostId(post.id);

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id)
        .eq("company_id", post.company_id);

      if (error) {
        throw error;
      }

      toast.success("Post excluído com sucesso.");

      await loadDashboardData();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erro ao excluir post.");
    } finally {
      setDeletingPostId(null);
    }
  };

  const getStatusLabel = (status: PostStatus) => {
    if (status === "draft") return "Rascunho";
    if (status === "scheduled") return "Agendado";
    if (status === "published") return "Publicado";
    return "Falhou";
  };

  const getStatusClasses = (status: PostStatus) => {
    if (status === "scheduled") {
      return "bg-blue-50 text-blue-700 border border-blue-200";
    }

    if (status === "published") {
      return "bg-green-50 text-green-700 border border-green-200";
    }

    if (status === "failed") {
      return "bg-red-50 text-red-700 border border-red-200";
    }

    return "bg-muted text-muted-foreground border border-border";
  };

  const getActivityDotClass = (status: PostStatus) => {
    if (status === "scheduled") return "bg-blue-600";
    if (status === "published") return "bg-green-600";
    if (status === "failed") return "bg-red-600";
    return "bg-muted-foreground";
  };

  const getPostDateLabel = (post: SupabasePost) => {
    if (post.status === "scheduled" && post.scheduled_at) {
      return `Agendado para ${format(
        new Date(post.scheduled_at),
        "dd/MM/yyyy 'às' HH:mm",
        { locale: ptBR }
      )}`;
    }

    if (post.status === "published" && post.published_at) {
      return `Publicado em ${format(
        new Date(post.published_at),
        "dd/MM/yyyy 'às' HH:mm",
        { locale: ptBR }
      )}`;
    }

    if (post.status === "failed") {
      return `Falhou em ${format(
        new Date(post.updated_at || post.created_at),
        "dd/MM/yyyy 'às' HH:mm",
        { locale: ptBR }
      )}`;
    }

    return `Criado em ${format(new Date(post.created_at), "dd/MM/yyyy", {
      locale: ptBR,
    })}`;
  };

  const getMainButtonLabel = (status: PostStatus) => {
    if (status === "published") return "Ver detalhes";
    if (status === "failed") return "Ver erro";
    return "Editar Post";
  };

  const renderPostCard = (post: SupabasePost) => {
    const statusLabel = getStatusLabel(post.status);

    return (
      <Card
        key={post.id}
        className="h-full overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex flex-col"
        onClick={() => openPostEditor(post.id)}
      >
        {post.media_url ? (
          <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden rounded-t-xl p-2 shrink-0">
            <img
              src={post.media_url}
              alt={post.title}
              className="max-w-full max-h-full object-contain bg-white rounded-md"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground rounded-t-xl shrink-0">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}

        <CardContent className="p-4 flex flex-1 flex-col">
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold line-clamp-1">
                {post.title || "Post sem título"}
              </h3>

              <span
                className={`text-xs px-2 py-1 rounded-full shrink-0 ${getStatusClasses(
                  post.status
                )}`}
              >
                {statusLabel}
              </span>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
              {post.caption || "Sem legenda"}
            </p>

            {post.hashtags ? (
              <p className="text-xs text-blue-600 line-clamp-1 min-h-[18px]">
                {post.hashtags}
              </p>
            ) : (
              <div className="min-h-[18px]" />
            )}

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                {getPostDateLabel(post)}
              </div>

              {post.platforms && post.platforms.length > 0 ? (
                <div className="text-xs text-muted-foreground">
                  Redes: {post.platforms.join(", ")}
                </div>
              ) : null}

              {post.status === "failed" ? (
                <div className="text-xs text-red-600 line-clamp-2">
                  {post.error_message
                    ? `Erro: ${post.error_message}`
                    : "Erro: falha na publicação. Verifique as permissões."}
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 mt-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={(event) => {
                event.stopPropagation();
                openPostEditor(post.id);
              }}
            >
              {getMainButtonLabel(post.status)}
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="w-full"
              disabled={deletingPostId === post.id}
              onClick={(event) => {
                event.stopPropagation();
                handleDeletePost(post);
              }}
            >
              {deletingPostId === post.id ? (
                "Excluindo..."
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

            <p className="text-muted-foreground mt-1">
              Bem-vindo de volta! Aqui está o resumo da sua conta.
            </p>

            {isPremiumActive && (
              <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-5 text-orange-950 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                    <Crown className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide">
                      Plano Premium ativo
                    </p>

                    <h2 className="mt-1 text-xl font-bold">
                      Você está usufruindo do plano Premium por mais{" "}
                      {premiumDaysLeft} dias.
                    </h2>

                    {premiumExpiresAt ? (
                      <p className="mt-1 text-sm">
                        Expira em{" "}
                        <strong>
                          {premiumExpiresAt.toLocaleDateString("pt-BR")} às{" "}
                          {premiumExpiresAt.toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                        .
                      </p>
                    ) : (
                      <p className="mt-1 text-sm">
                        Expiração estimada em 30 dias após a ativação do Premium.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button asChild className="shrink-0">
            <Link href="/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo Post
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            role="button"
            tabIndex={0}
            onClick={() => setActiveStatusFilter("scheduled")}
            onKeyDown={(event) => {
              if (event.key === "Enter") setActiveStatusFilter("scheduled");
            }}
            className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-blue-200 ${
              activeStatusFilter === "scheduled"
                ? "bg-blue-50 ring-2 ring-blue-500"
                : "bg-white"
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-blue-700">
                Agendados
              </CardTitle>
              <CalendarClock className="h-4 w-4 text-blue-600" />
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-blue-700">
                  {statusCounts.scheduled}
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => setActiveStatusFilter("draft")}
            onKeyDown={(event) => {
              if (event.key === "Enter") setActiveStatusFilter("draft");
            }}
            className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-purple-200 ${
              activeStatusFilter === "draft"
                ? "bg-purple-50 ring-2 ring-purple-500"
                : "bg-white"
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-purple-700">
                Rascunhos
              </CardTitle>
              <FileEdit className="h-4 w-4 text-purple-600" />
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-purple-700">
                  {statusCounts.draft}
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => setActiveStatusFilter("published")}
            onKeyDown={(event) => {
              if (event.key === "Enter") setActiveStatusFilter("published");
            }}
            className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-green-200 ${
              activeStatusFilter === "published"
                ? "bg-green-50 ring-2 ring-green-500"
                : "bg-white"
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-green-700">
                Publicados
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-green-700">
                  {statusCounts.published}
                </div>
              )}
            </CardContent>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => setActiveStatusFilter("failed")}
            onKeyDown={(event) => {
              if (event.key === "Enter") setActiveStatusFilter("failed");
            }}
            className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border-red-200 ${
              activeStatusFilter === "failed"
                ? "bg-red-50 ring-2 ring-red-500"
                : "bg-white"
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-red-700">
                Falhos
              </CardTitle>

              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-red-700">
                  {statusCounts.failed}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4 gap-3">
                <h2 className="text-xl font-semibold tracking-tight">
                  {getPostsTitle()}
                </h2>

                <div className="flex items-center gap-2">
                  {activeStatusFilter !== "all" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveStatusFilter("all")}
                    >
                      Ver todos
                    </Button>
                  ) : null}

                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/calendar">
                      Ver Calendário <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Skeleton className="h-[300px] rounded-xl" />
                  <Skeleton className="h-[300px] rounded-xl" />
                </div>
              ) : recentPosts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
                  {recentPosts.map((post) => renderPostCard(post))}
                </div>
              ) : (
                <Card className="flex flex-col items-center justify-center p-12 text-center h-64 border-dashed">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <CalendarClock className="h-6 w-6 text-primary" />
                  </div>

                  <h3 className="text-lg font-semibold mb-2">
                    Nenhum post encontrado
                  </h3>

                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    {getEmptyPostsMessage()}
                  </p>

                  <Button asChild>
                    <Link href="/posts/new">Criar Primeiro Post</Link>
                  </Button>
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Avisos Importantes</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : visibleAlerts.length > 0 ? (
                  visibleAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-md text-sm border-l-4 ${
                        alert.severity === "error"
                          ? "bg-red-50 border-red-500 text-red-800 dark:bg-red-950/20"
                          : alert.severity === "warning"
                            ? "bg-amber-50 border-amber-500 text-amber-800 dark:bg-amber-950/20"
                            : "bg-blue-50 border-blue-500 text-blue-800 dark:bg-blue-950/20"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>{alert.message}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-start gap-2 rounded-md border-l-4 border-green-500 bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950/20">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      Tudo certo! Suas redes sociais estão conectadas para
                      publicação automática.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Atividade Recente</CardTitle>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex gap-3">
                        <Skeleton className="w-2 h-2 rounded-full mt-2" />

                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex gap-3 items-start">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getActivityDotClass(
                            activity.status
                          )}`}
                        />

                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug">
                            <span className="text-muted-foreground font-normal">
                              {activity.action}
                            </span>
                            <br />
                            <span className="font-semibold">
                              {activity.postTitle}
                            </span>
                          </p>

                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {activity.description}
                          </p>

                          <span className="text-xs text-muted-foreground">
                            {format(
                              new Date(activity.timestamp),
                              "dd/MM 'às' HH:mm",
                              { locale: ptBR }
                            )}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma atividade recente.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
