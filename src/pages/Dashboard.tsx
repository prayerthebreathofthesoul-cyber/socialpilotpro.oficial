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
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type PostStatus = "draft" | "scheduled" | "published" | "failed";

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
};

type StatusCounts = {
  draft: number;
  scheduled: number;
  published: number;
  failed: number;
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<SupabasePost[]>([]);
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

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const realPosts = (data || []) as SupabasePost[];

      setPosts(realPosts);

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
  }, []);

  const upcomingPosts = posts
    .filter((post) => post.status === "scheduled")
    .sort((a, b) => {
      const dateA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const dateB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      return dateA - dateB;
    })
    .slice(0, 4);

  const recentActivity = posts.slice(0, 5).map((post) => {
    const action =
      post.status === "draft"
        ? "Rascunho criado"
        : post.status === "scheduled"
          ? "Post agendado"
          : post.status === "published"
            ? "Post marcado como publicado"
            : "Falha registrada";

    return {
      id: post.id,
      action,
      postTitle: post.title,
      timestamp: post.updated_at || post.created_at,
    };
  });

  const alerts = [
    {
      id: 1,
      severity: "info",
      message:
        "As redes sociais ainda precisam ser conectadas para publicação automática real.",
    },
  ];

  const openPostEditor = (postId: string) => {
    setLocation(`/posts/${postId}/edit`);
  };

  const renderPostCard = (post: SupabasePost) => {
    const statusLabel =
      post.status === "draft"
        ? "Rascunho"
        : post.status === "scheduled"
          ? "Agendado"
          : post.status === "published"
            ? "Publicado"
            : "Falhou";

    return (
      <Card
        key={post.id}
        className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => openPostEditor(post.id)}
      >
        {post.media_url ? (
          <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden rounded-t-xl p-2">
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
          <div className="aspect-video bg-muted flex items-center justify-center text-muted-foreground rounded-t-xl">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}

        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold line-clamp-1">{post.title}</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
              {statusLabel}
            </span>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {post.caption || "Sem legenda"}
          </p>

          {post.hashtags && (
            <p className="text-xs text-blue-600 line-clamp-1">
              {post.hashtags}
            </p>
          )}

          <div className="text-xs text-muted-foreground">
            {post.status === "scheduled" && post.scheduled_at
              ? `Agendado para ${format(
                  new Date(post.scheduled_at),
                  "dd/MM/yyyy 'às' HH:mm",
                  { locale: ptBR }
                )}`
              : `Criado em ${format(new Date(post.created_at), "dd/MM/yyyy", {
                  locale: ptBR,
                })}`}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full mt-2"
            onClick={(event) => {
              event.stopPropagation();
              openPostEditor(post.id);
            }}
          >
            Editar Post
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Bem-vindo de volta! Aqui está o resumo da sua conta.
            </p>
          </div>

          <Button asChild className="shrink-0">
            <Link href="/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              Novo Post
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Agendados</CardTitle>
              <CalendarClock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">
                  {statusCounts.scheduled}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Rascunhos</CardTitle>
              <FileEdit className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">{statusCounts.draft}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Publicados</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">
                  {statusCounts.published}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-destructive">
                Falhos
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold text-destructive">
                  {statusCounts.failed}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold tracking-tight">
                  Próximos Posts
                </h2>

                <Button variant="ghost" size="sm" asChild>
                  <Link href="/calendar">
                    Ver Calendário <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Skeleton className="h-[300px] rounded-xl" />
                  <Skeleton className="h-[300px] rounded-xl" />
                </div>
              ) : upcomingPosts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {upcomingPosts.map((post) => renderPostCard(post))}
                </div>
              ) : posts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {posts.slice(0, 4).map((post) => renderPostCard(post))}
                </div>
              ) : (
                <Card className="flex flex-col items-center justify-center p-12 text-center h-64 border-dashed">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <CalendarClock className="h-6 w-6 text-primary" />
                  </div>

                  <h3 className="text-lg font-semibold mb-2">
                    Nenhum post criado
                  </h3>

                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Você ainda não tem nenhuma postagem salva no SocialPilot Pro.
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
                ) : alerts.length > 0 ? (
                  alerts.map((alert) => (
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
                  <div className="text-sm text-muted-foreground text-center py-4">
                    Tudo certo! Sem avisos no momento.
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
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />

                        <div>
                          <p className="text-sm font-medium leading-snug">
                            <span className="text-muted-foreground font-normal">
                              {activity.action}
                            </span>
                            <br />
                            {activity.postTitle}
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
