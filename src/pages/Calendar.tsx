import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/posts/PostCard";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CalendarDays } from "lucide-react";
import { useListPosts, getListPostsQueryKey } from "@/lib/mock-api";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Calendar() {
  const [, setLocation] = useLocation();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState("all");

  // Load all posts for simplicity, filtering happens client-side for this demo,
  // or we could use the API filter params.
  const { data: posts, isLoading } = useListPosts(undefined, {
    query: { queryKey: getListPostsQueryKey() }
  });

  const filteredPosts = posts?.filter((post) => {
    // Filter by tab
    if (activeTab === "pending" && post.status !== "scheduled" && post.status !== "draft") return false;
    if (activeTab === "published" && post.status !== "published") return false;
    if (activeTab === "stories" && post.type !== "story") return false;

    // Filter by selected date
    if (date) {
      const postDate = new Date(post.scheduledAt || post.publishedAt || post.createdAt);
      return isSameDay(postDate, date);
    }
    return true;
  });


  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Calendário</h1>
            <p className="text-muted-foreground mt-1">Gerencie e visualize sua programação de conteúdo.</p>
          </div>
          <Button onClick={() => setLocation("/posts/new")} className="shrink-0">
            <Plus className="mr-2 h-4 w-4" />
            Agendar Post
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Selecione uma data</CardTitle>
                <CardDescription>Visualize as postagens do dia.</CardDescription>
              </CardHeader>
              <CardContent>
                <CalendarUI
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  locale={ptBR}
                  className="rounded-md border mx-auto"
                  modifiers={{
                    hasPosts: (day) => {
                      if (!posts) return false;
                      return posts.some(p => {
                        const postDate = new Date(p.scheduledAt || p.publishedAt || p.createdAt);
                        return isSameDay(postDate, day);
                      });
                    }
                  }}
                  modifiersStyles={{
                    hasPosts: { fontWeight: 'bold' }
                  }}
                />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="min-h-[500px] flex flex-col">
              <CardHeader className="pb-4 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">
                      {date ? format(date, "EEEE, d 'de' MMMM", { locale: ptBR }) : "Todos os dias"}
                    </CardTitle>
                    <CardDescription>
                      {filteredPosts?.length || 0} post(s) encontrado(s)
                    </CardDescription>
                  </div>
                  
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                    <TabsList className="grid grid-cols-4 w-full sm:w-auto h-auto">
                      <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                      <TabsTrigger value="pending" className="text-xs">Pendentes</TabsTrigger>
                      <TabsTrigger value="published" className="text-xs">Publicados</TabsTrigger>
                      <TabsTrigger value="stories" className="text-xs">Stories</TabsTrigger>
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
                    {filteredPosts.map(post => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center">
                    <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <CalendarDays className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Nenhum post neste dia</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                      Você não tem publicações agendadas ou publicadas para a data selecionada com os filtros atuais.
                    </p>
                    <Button onClick={() => setLocation("/posts/new")}>
                      Criar Postagem
                    </Button>
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