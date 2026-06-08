import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/posts/PostCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  FileEdit,
  AlertCircle,
} from "lucide-react";
import { useListPosts, getListPostsQueryKey } from "@/lib/mock-api";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";

type CalendarFilter = "all" | "scheduled" | "published" | "draft" | "failed";

const filters: { value: CalendarFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "scheduled", label: "Agendados" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Rascunhos" },
  { value: "failed", label: "Falhos" },
];

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Calendar() {
  const [, setLocation] = useLocation();

  const [date, setDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
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
        post.created_at ||
        new Date()
    );
  };

  const getPostStatus = (post: any): CalendarFilter => {
    const status = post.status || post.post_status || "draft";

    if (status === "scheduled" || status === "agendado") return "scheduled";
    if (status === "published" || status === "publicado") return "published";
    if (status === "draft" || status === "rascunho") return "draft";
    if (status === "failed" || status === "falhou") return "failed";

    return "draft";
  };

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    });
  }, [currentMonth]);

  const selectedDayPosts = useMemo(() => {
    if (!posts) return [];

    return posts.filter((post: any) => isSameDay(getPostDate(post), date));
  }, [posts, date]);

  const filteredPosts = useMemo(() => {
    return selectedDayPosts.filter((post: any) => {
      const status = getPostStatus(post);

      if (activeTab !== "all" && status !== activeTab) {
        return false;
      }

      return true;
    });
  }, [selectedDayPosts, activeTab]);

  const scheduledCount =
    selectedDayPosts.filter((post: any) => getPostStatus(post) === "scheduled")
      .length || 0;

  const publishedCount =
    selectedDayPosts.filter((post: any) => getPostStatus(post) === "published")
      .length || 0;

  const draftCount =
    selectedDayPosts.filter((post: any) => getPostStatus(post) === "draft")
      .length || 0;

  const failedCount =
    selectedDayPosts.filter((post: any) => getPostStatus(post) === "failed")
      .length || 0;

  const getPostsCountText = () => {
    const count = filteredPosts.length;

    if (count === 0) return "Nenhum post encontrado";
    if (count === 1) return "1 post encontrado";

    return `${count} posts encontrados`;
  };

  const getPostsForDay = (day: Date) => {
    if (!posts) return [];

    return posts.filter((post: any) => isSameDay(getPostDate(post), day));
  };

  const getDayStatusCounts = (day: Date) => {
    const dayPosts = getPostsForDay(day);

    return {
      scheduled: dayPosts.filter(
        (post: any) => getPostStatus(post) === "scheduled"
      ).length,
      published: dayPosts.filter(
        (post: any) => getPostStatus(post) === "published"
      ).length,
      draft: dayPosts.filter((post: any) => getPostStatus(post) === "draft")
        .length,
      failed: dayPosts.filter((post: any) => getPostStatus(post) === "failed")
        .length,
      total: dayPosts.length,
    };
  };

  const goToNewPost = () => {
    const selectedDate = format(date, "yyyy-MM-dd");
    setLocation(`/posts/new?date=${selectedDate}`);
  };

  const goToToday = () => {
    const today = new Date();
    setDate(today);
    setCurrentMonth(today);
  };

  const getEmptyDescription = () => {
    if (activeTab === "scheduled") {
      return "Não há posts agendados para esta data.";
    }

    if (activeTab === "published") {
      return "Não há posts publicados nesta data.";
    }

    if (activeTab === "draft") {
      return "Não há rascunhos criados nesta data.";
    }

    if (activeTab === "failed") {
      return "Não há posts com falha nesta data.";
    }

    return "Não há posts agendados, publicados, rascunhos ou falhos nesta data.";
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>

            <p className="mt-1 text-muted-foreground">
              Gerencie e visualize sua programação de conteúdo.
            </p>
          </div>

          <Button onClick={goToNewPost} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Agendar Post
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle>Calendário mensal</CardTitle>
                <CardDescription>
                  Clique em uma data para visualizar os posts do dia.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="text-center">
                    <p className="text-lg font-semibold capitalize">
                      {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                    </p>

                    <button
                      type="button"
                      onClick={goToToday}
                      className="text-xs text-primary hover:underline"
                    >
                      Ir para hoje
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center">
                  {weekDays.map((day) => (
                    <div
                      key={day}
                      className="rounded-md bg-muted px-1 py-2 text-xs font-semibold text-muted-foreground"
                    >
                      {day}
                    </div>
                  ))}

                  {monthDays.map((day) => {
                    const dayCounts = getDayStatusCounts(day);
                    const isSelected = isSameDay(day, date);
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isCurrentDay = isToday(day);

                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => setDate(day)}
                        className={`min-h-[74px] rounded-xl border p-2 text-left transition-all hover:border-primary hover:bg-primary/5 ${
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-background"
                        } ${
                          !isCurrentMonth && !isSelected
                            ? "opacity-40"
                            : "opacity-100"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                              isCurrentDay && !isSelected
                                ? "bg-blue-50 text-blue-700"
                                : ""
                            }`}
                          >
                            {format(day, "d")}
                          </span>

                          {dayCounts.total > 0 ? (
                            <span
                              className={`text-[10px] font-medium ${
                                isSelected
                                  ? "text-primary-foreground"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {dayCounts.total}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1">
                          {dayCounts.scheduled > 0 ? (
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                          ) : null}

                          {dayCounts.published > 0 ? (
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                          ) : null}

                          {dayCounts.draft > 0 ? (
                            <span className="h-2 w-2 rounded-full bg-gray-400" />
                          ) : null}

                          {dayCounts.failed > 0 ? (
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    Agendado
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                    Publicado
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                    Rascunho
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    Falhou
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-blue-600 p-2 text-white">
                    <Clock className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs text-blue-700">Agendados</p>
                    <p className="text-xl font-bold text-blue-800">
                      {scheduledCount}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-green-600 p-2 text-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs text-green-700">Publicados</p>
                    <p className="text-xl font-bold text-green-800">
                      {publishedCount}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-gray-600 p-2 text-white">
                    <FileEdit className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs text-gray-700">Rascunhos</p>
                    <p className="text-xl font-bold text-gray-800">
                      {draftCount}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-full bg-red-600 p-2 text-white">
                    <AlertCircle className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-xs text-red-700">Falhos</p>
                    <p className="text-xl font-bold text-red-800">
                      {failedCount}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="min-h-[640px] overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <CardTitle className="text-2xl capitalize">
                    {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </CardTitle>

                  <CardDescription className="mt-1">
                    {getPostsCountText()}
                  </CardDescription>
                </div>

                <div className="flex w-full flex-wrap gap-2 lg:w-auto">
                  {filters.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setActiveTab(filter.value)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        activeTab === filter.value
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {isLoading ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Skeleton className="h-72 rounded-xl" />
                  <Skeleton className="h-72 rounded-xl" />
                </div>
              ) : filteredPosts.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {filteredPosts.map((post: any) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                    <CalendarDays className="h-10 w-10 text-muted-foreground" />
                  </div>

                  <h3 className="mb-2 text-xl font-semibold">
                    Nenhum post encontrado
                  </h3>

                  <p className="mb-6 max-w-md text-sm text-muted-foreground">
                    {getEmptyDescription()}
                  </p>

                  <Button onClick={goToNewPost}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar postagem
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
