import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
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
  Image as ImageIcon,
} from "lucide-react";
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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

type CalendarFilter = "all" | "scheduled" | "published" | "draft" | "failed";
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
  error_message?: string | null;
};

const filters: { value: CalendarFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "scheduled", label: "Agendados" },
  { value: "published", label: "Publicados" },
  { value: "draft", label: "Rascunhos" },
  { value: "failed", label: "Falhas" },
];

const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Calendar() {
  const [, setLocation] = useLocation();

  const [date, setDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<CalendarFilter>("all");
  const [posts, setPosts] = useState<SupabasePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const loadCalendarData = async () => {
    setIsLoading(true);

    try {
      const companyId = await getCompanyId();

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .eq("company_id", companyId)
        .order("updated_at", { ascending: false });

      if (postsError) {
        throw postsError;
      }

      setPosts((postsData || []) as SupabasePost[]);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erro ao carregar posts do calendário.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, []);

  const capitalizeFirstLetter = (text: string) => {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const formatSelectedDate = (selectedDate: Date) => {
    return capitalizeFirstLetter(
      format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })
    );
  };

  const parsePostDate = (value: any) => {
    if (!value) return null;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }

    const valueAsString = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(valueAsString)) {
      const [year, month, day] = valueAsString.split("-").map(Number);
      return new Date(year, month - 1, day);
    }

    const parsedDate = new Date(valueAsString);

    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  };

  const getPostStatus = (post: SupabasePost): CalendarFilter => {
    const status = String(post.status || "draft").toLowerCase();

    if (status === "scheduled" || status === "agendado") return "scheduled";
    if (status === "published" || status === "publicado") return "published";
    if (status === "failed" || status === "falhou") return "failed";

    return "draft";
  };

  const getPostMainDate = (post: SupabasePost) => {
    if (post.status === "published") {
      return (
        parsePostDate(post.published_at) ||
        parsePostDate(post.updated_at) ||
        parsePostDate(post.created_at) ||
        new Date()
      );
    }

    if (post.status === "scheduled") {
      return (
        parsePostDate(post.scheduled_at) ||
        parsePostDate(post.updated_at) ||
        parsePostDate(post.created_at) ||
        new Date()
      );
    }

    return (
      parsePostDate(post.updated_at) ||
      parsePostDate(post.created_at) ||
      new Date()
    );
  };

  const postBelongsToDay = (post: SupabasePost, selectedDay: Date) => {
    const postDate = getPostMainDate(post);
    return isSameDay(postDate, selectedDay);
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
    return posts.filter((post) => postBelongsToDay(post, date));
  }, [posts, date]);

  const selectedDayCounts = useMemo(() => {
    return {
      all: selectedDayPosts.length,
      scheduled: selectedDayPosts.filter(
        (post) => getPostStatus(post) === "scheduled"
      ).length,
      published: selectedDayPosts.filter(
        (post) => getPostStatus(post) === "published"
      ).length,
      draft: selectedDayPosts.filter((post) => getPostStatus(post) === "draft")
        .length,
      failed: selectedDayPosts.filter(
        (post) => getPostStatus(post) === "failed"
      ).length,
    };
  }, [selectedDayPosts]);

  const filteredPosts = useMemo(() => {
    if (activeTab === "all") return selectedDayPosts;

    return selectedDayPosts.filter(
      (post) => getPostStatus(post) === activeTab
    );
  }, [selectedDayPosts, activeTab]);

  const getPostsCountText = () => {
    const count = filteredPosts.length;

    if (count === 0) return "Nenhum post encontrado";
    if (count === 1) return "1 post encontrado";

    return `${count} posts encontrados`;
  };

  const getPostsForDay = (day: Date) => {
    return posts.filter((post) => postBelongsToDay(post, day));
  };

  const getDayStatusCounts = (day: Date) => {
    const dayPosts = getPostsForDay(day);

    return {
      scheduled: dayPosts.filter((post) => getPostStatus(post) === "scheduled")
        .length,
      published: dayPosts.filter((post) => getPostStatus(post) === "published")
        .length,
      draft: dayPosts.filter((post) => getPostStatus(post) === "draft").length,
      failed: dayPosts.filter((post) => getPostStatus(post) === "failed")
        .length,
      total: dayPosts.length,
    };
  };

  const getFilterCount = (filter: CalendarFilter) => {
    if (filter === "all") return selectedDayCounts.all;
    return selectedDayCounts[filter];
  };

  const getFilterActiveClass = (filter: CalendarFilter) => {
    if (activeTab !== filter) {
      return "border-border bg-muted/40 text-muted-foreground hover:border-primary hover:text-primary";
    }

    if (filter === "all") return "border-blue-700 bg-blue-700 text-white";
    if (filter === "scheduled")
      return "border-orange-500 bg-orange-500 text-white";
    if (filter === "published")
      return "border-green-600 bg-green-600 text-white";
    if (filter === "draft")
      return "border-purple-600 bg-purple-600 text-white";
    if (filter === "failed") return "border-red-600 bg-red-600 text-white";

    return "border-primary bg-primary text-primary-foreground";
  };

  const getStatusLabel = (status: PostStatus) => {
    if (status === "scheduled") return "Agendado";
    if (status === "published") return "Publicado";
    if (status === "failed") return "Falhou";
    return "Rascunho";
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

  const goToNewPost = () => {
    const selectedDate = format(date, "yyyy-MM-dd");
    setLocation(`/posts/new?date=${selectedDate}`);
  };

  const goToToday = () => {
    const today = new Date();
    setDate(today);
    setCurrentMonth(today);
  };

  const openPostEditor = (postId: string) => {
    setLocation(`/posts/${postId}/edit`);
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

    return "Não há posts agendados, publicados, rascunhos ou com falhas nesta data.";
  };

  const renderPostCard = (post: SupabasePost) => {
    return (
      <Card
        key={post.id}
        className="h-full cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
        onClick={() => openPostEditor(post.id)}
      >
        {post.media_url ? (
          <div className="aspect-video overflow-hidden bg-muted">
            <img
              src={post.media_url}
              alt={post.title || "Imagem do post"}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}

        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-1 font-semibold">
              {post.title || "Post sem título"}
            </h3>

            <span
              className={`shrink-0 rounded-full px-2 py-1 text-xs ${getStatusClasses(
                post.status
              )}`}
            >
              {getStatusLabel(post.status)}
            </span>
          </div>

          <p className="line-clamp-2 min-h-[40px] text-sm text-muted-foreground">
            {post.caption || "Sem legenda"}
          </p>

          {post.hashtags ? (
            <p className="line-clamp-1 text-xs text-blue-600">
              {post.hashtags}
            </p>
          ) : null}

          <div className="space-y-1 text-xs text-muted-foreground">
            <div>{getPostDateLabel(post)}</div>

            {post.platforms && post.platforms.length > 0 ? (
              <div>Redes: {post.platforms.join(", ")}</div>
            ) : null}

            {post.status === "failed" ? (
              <div className="line-clamp-2 text-red-600">
                {post.error_message
                  ? `Erro: ${post.error_message}`
                  : "Erro: falha na publicação."}
              </div>
            ) : null}
          </div>

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
            {post.status === "published"
              ? "Ver detalhes"
              : post.status === "failed"
                ? "Ver erro"
                : "Editar Post"}
          </Button>
        </CardContent>
      </Card>
    );
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
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
                    <p className="text-lg font-semibold">
                      {capitalizeFirstLetter(
                        format(currentMonth, "MMMM yyyy", { locale: ptBR })
                      )}
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
                    Falha
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
                      {selectedDayCounts.scheduled}
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
                      {selectedDayCounts.published}
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
                      {selectedDayCounts.draft}
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
                    <p className="text-xs text-red-700">Falhas</p>
                    <p className="text-xl font-bold text-red-800">
                      {selectedDayCounts.failed}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="min-h-[640px] overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="space-y-5">
                <div>
                  <CardTitle className="text-2xl">
                    {formatSelectedDate(date)}
                  </CardTitle>

                  <CardDescription className="mt-1">
                    {getPostsCountText()}
                  </CardDescription>
                </div>

                <div className="rounded-xl border bg-background p-2">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-2">
                    {filters.map((filter) => (
                      <button
                        key={filter.value}
                        type="button"
                        onClick={() => setActiveTab(filter.value)}
                        className={`flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-all ${getFilterActiveClass(
                          filter.value
                        )}`}
                      >
                        <span className="whitespace-nowrap">
                          {filter.label}
                        </span>

                        <span
                          className={`flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold ${
                            activeTab === filter.value
                              ? "bg-white/20 text-white"
                              : "bg-background text-muted-foreground"
                          }`}
                        >
                          {getFilterCount(filter.value)}
                        </span>
                      </button>
                    ))}
                  </div>
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
                  {filteredPosts.map((post) => renderPostCard(post))}
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
