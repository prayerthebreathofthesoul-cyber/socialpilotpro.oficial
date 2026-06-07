import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/posts/PostCard";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CalendarDays } from "lucide-react";
import { useListPosts, getListPostsQueryKey } from "@/lib/mock-api";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

type CalendarFilter = "all" | "scheduled" | "published" | "draft" | "failed";

export default function Calendar() {
  const [, setLocation] = useLocation();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState<CalendarFilter>("all");

  const { data: posts, isLoading } = useListPosts(undefined, {
    query: { queryKey: getListPostsQueryKey() },
  });

  const getPostDate = (post: any) => {
    return new Date(
      post.scheduledAt ||
        post.scheduled_at ||
        post.publishedAt ||
        post.published_at ||
        post.updatedAt ||
        post.updated_at ||
        post.createdAt ||
        post.created_at
    );
  };

  const getPostStatus = (post: any) => {
    return post.status;
  };

  const filteredPosts = posts?.filter((post: any) => {
    const status = getPostStatus(post);

    if (activeTab !== "all" && status !== activeTab) {
      return false;
    }

    if (date) {
      return isSameDay(getPostDate(post), date);
    }

    return true;
  });

  const selectedDayPosts = posts?.filter((post: any) => {
    if (!date) return true;
    return isSameDay(getPostDate(post), date);
  });

  const scheduledCount =
    selectedDayPosts?.filter((post: any) => post.status === "scheduled")
      .length || 0;

  const publishedCount =
    selectedDayPosts?.filter((post: any) => post.status === "published")
      .length || 0;

  const draftCount =
    selectedDayPosts?.filter((post: any) => post.status === "draft").length ||
    0;

  const failedCount =
    selectedDayPosts?.filter((post: any) => post.status === "failed").length ||
    0;

  const getPostsCountText = () => {
    const count = filteredPosts?.length || 0;

    if (count === 0) return "Nenhum post encontrado";
    if (count === 1) return "1 post encontrado";

    return `${count} posts encontrados`;
  };

  const hasPostsByStatus = (day: Date, status: string) => {
    if (!posts) return false;

    return posts.some((post: any) => {
      return post.status === status && isSameDay(getPostDate(post), day);
    });
  };

  const hasFailedPosts = (day: Date) => hasPostsByStatus(day, "failed");

  const hasScheduledPosts = (day: Date) => {
    if (hasFailedPosts(day)) return false;
    return hasPostsByStatus(day, "scheduled");
  };

  const hasPublishedPosts = (day: Date) => {
    if (hasFailedPosts(day) || hasScheduledPosts(day)) return false;
    return hasPostsByStatus(day, "published");
  };

  const hasDraftPosts = (day: Date) => {
    if (hasFailedPosts(day) || hasScheduledPosts(day) || hasPublishedPosts(day)) {
      return false;
    }

    return hasPostsByStatus(day, "draft");
  };

  const goToNewPost = () => {
    if (date) {
      const selectedDate = format(date, "yyyy-MM-dd");
      setLocation(`/posts/new?date=${selectedDate}`);
      return;
    }

    setLocation("/posts/new");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>

            <p className="text-muted-foreground mt-1">
              Gerencie e visualize sua programação de conteúdo.
            </p>
          </div>

          <Button onClick={goToNewPost} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Agendar Post
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Selecione uma data</CardTitle>
                <CardDescription>
                  Visualize as postagens do dia.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <CalendarUI
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ptBR}
                  className="rounded-md border mx-auto"
                  modifiers={{
                    failedPosts: hasFailedPosts,
                    scheduledPosts: hasScheduledPosts,
                    publishedPosts: hasPublishedPosts,
                    draftPosts: hasDraftPosts,
                  }}
                  modifiersClassNames={{
                    failedPosts:
                      "relative font-bold after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:w-1.5 after:h-1.5 after:rounded-full after:bg-red-500",
                    scheduledPosts:
                      "relative font-bold after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:w-1.5 after:h-1.5 after:rounded-full after:bg-blue-500",
                    publishedPosts:
                      "relative font-bold after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:w-1.5 after:h-1.5 after:rounded-full after:bg-green-500",
                    draftPosts:
                      "relative font-bold after:content-[''] after:absolute after:left-1/2 after:-translate-x-1/2 after:bottom-1 after:w-1.5 after:h-1.5 after:rounded-full after:bg-gray-400",
                  }}
                  formatters={{
                    formatWeekdayName: (day) =>
                      format(day, "EEE", { locale: ptBR }).replace(".", ""),
                  }}
                />

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Agendado
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Publicado
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Falhou
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Rascunho
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="min-h-[500px] flex flex-col">
              <CardHeader className="pb-4 border-b">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">
                      {date
                        ? format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
                        : "Todos os dias"}
                    </CardTitle>

                    <CardDescription>{getPostsCountText()}</CardDescription>

                    {!isLoading && selectedDayPosts && selectedDayPosts.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-3 text-xs">
                        <span className="rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1">
                          {scheduledCount} agendado
                          {scheduledCount === 1 ? "" : "s"}
                        </span>

                        <span className="rounded-full bg-green-50 text-green-700 border border-green-200 px-2 py-1">
                          {publishedCount} publicado
                          {publishedCount === 1 ? "" : "s"}
                        </span>

                        <span className="rounded-full bg-gray-50 text-gray-700 border border-gray-200 px-2 py-1">
                          {draftCount} rascunho
                          {draftCount === 1 ? "" : "s"}
                        </span>

                        <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-1">
                          {failedCount} falho
                          {failedCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <Tabs
                    value={activeTab}
                    onValueChange={(value) =>
                      setActiveTab(value as CalendarFilter)
                    }
                    className="w-full sm:w-auto"
                  >
                    <TabsList className="grid grid-cols-5 w-full sm:w-auto h-auto">
                      <TabsTrigger value="all" className="text-xs">
                        Todos
                      </TabsTrigger>

                      <TabsTrigger value="scheduled" className="text-xs">
                        Agendados
                      </TabsTrigger>

                      <TabsTrigger value="published" className="text-xs">
                        Publicados
                      </TabsTrigger>

                      <TabsTrigger value="draft" className="text-xs">
                        Rascunhos
                      </TabsTrigger>

                      <TabsTrigger value="failed" className="text-xs">
                        Falhos
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-6">
                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-64 rounded-xl" />
                    <Skeleton className="h-64 rounded-xl" />
                  </div>
                ) : filteredPosts && filteredPosts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPosts.map((post: any) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center">
                    <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <CalendarDays className="h-8 w-8 text-muted-foreground" />
                    </div>

                    <h3 className="text-lg font-semibold mb-2">
                      Nenhum post encontrado
                    </h3>

                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                      Não há posts agendados, publicados, rascunhos ou falhos
                      nesta data com o filtro selecionado.
                    </p>

                    <Button onClick={goToNewPost}>Criar Postagem</Button>
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
