import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  useGetDashboardSummary,
  getGetDashboardSummaryQueryKey,
} from "@/lib/mock-api";
import {
  CalendarClock,
  FileEdit,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
} from "lucide-react";
import { PostCard } from "@/components/posts/PostCard";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type RecentActivityItem = {
  id: string | number;
  action: string;
  postTitle: string;
  timestamp: string | Date;
};

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const recentActivity: RecentActivityItem[] =
    summary && "recentActivity" in summary && Array.isArray(summary.recentActivity)
      ? (summary.recentActivity as RecentActivityItem[])
      : [];

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
                  {summary?.statusCounts?.scheduled || 0}
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
                <div className="text-2xl font-bold">
                  {summary?.statusCounts?.draft || 0}
                </div>
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
                  {summary?.statusCounts?.published || 0}
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
                  {summary?.statusCounts?.failed || 0}
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
              ) : summary?.upcomingPosts && summary.upcomingPosts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {summary.upcomingPosts.slice(0, 4).map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <Card className="flex flex-col items-center justify-center p-12 text-center h-64 border-dashed">
                  <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <CalendarClock className="h-6 w-6 text-primary" />
                  </div>

                  <h3 className="text-lg font-semibold mb-2">
                    Nenhum post agendado
                  </h3>

                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Você não tem nenhuma postagem agendada para os próximos dias.
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
                ) : summary?.alerts && summary.alerts.length > 0 ? (
                  summary.alerts.map((alert) => (
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
