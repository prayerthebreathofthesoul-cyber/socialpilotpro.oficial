import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Upload,
  Image as ImageIcon,
  Video,
  FolderOpen,
  MoreVertical,
  Trash2,
  Eye,
  Copy,
  Send,
  X,
  Images,
  PlayCircle,
} from "lucide-react";
import {
  useListMedia,
  getListMediaQueryKey,
  useDeleteMedia,
} from "@/lib/mock-api";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Media() {
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string>("all");
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);

  const queryClient = useQueryClient();

  const { data: mediaFiles = [], isLoading } = useListMedia(undefined, {
    query: { queryKey: getListMediaQueryKey() },
  });

  const deleteMedia = useDeleteMedia();

  const handleDelete = async (id: number, name?: string) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir ${
        name ? `"${name}"` : "esta mídia"
      }?\n\nEssa ação não poderá ser desfeita.`
    );

    if (!confirmed) return;

    try {
      await deleteMedia.mutateAsync({ id });

      toast.success("Mídia excluída com sucesso.");

      if (selectedMedia?.id === id) {
        setSelectedMedia(null);
      }

      queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
    } catch (e) {
      toast.error("Erro ao excluir mídia.");
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada com sucesso.");
    } catch (error) {
      toast.error("Não foi possível copiar a URL.");
    }
  };

  const useInNewPost = (file: any) => {
    setLocation(`/posts/new?mediaId=${file.id}`);
  };

  const filteredMedia = mediaFiles.filter((file: any) => {
    const fileName = String(file.name || "").toLowerCase();
    const fileTags = String(file.tags || "").toLowerCase();
    const searchValue = search.toLowerCase().trim();

    if (activeType !== "all" && file.type !== activeType) return false;

    if (
      searchValue &&
      !fileName.includes(searchValue) &&
      !fileTags.includes(searchValue)
    ) {
      return false;
    }

    return true;
  });

  const imageCount = mediaFiles.filter((file: any) => file.type === "image")
    .length;

  const videoCount = mediaFiles.filter((file: any) => file.type === "video")
    .length;

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getFileDate = (file: any) => {
    const date = file.createdAt || file.created_at || new Date();

    return format(new Date(date), "dd MMM, yyyy", { locale: ptBR });
  };

  const getFilePreview = (file: any, mode: "card" | "modal" = "card") => {
    const mediaUrl = file.url || file.media_url;
    const thumbnailUrl = file.thumbnailUrl || file.thumbnail_url || mediaUrl;

    if (file.type === "video") {
      return (
        <div className="relative h-full w-full bg-black">
          {mode === "modal" ? (
            <video
              src={mediaUrl}
              controls
              className="h-full max-h-[70vh] w-full rounded-xl bg-black object-contain"
            />
          ) : (
            <>
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={file.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : null}

              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
                  <PlayCircle className="h-9 w-9" />
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    return (
      <img
        src={thumbnailUrl}
        alt={file.name}
        className={`h-full w-full ${
          mode === "modal" ? "object-contain" : "object-cover"
        } transition-transform duration-300 group-hover:scale-105`}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  };

  const renderMediaCard = (file: any) => {
    const isVideo = file.type === "video";

    return (
      <Card
        key={file.id}
        className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
      >
        <div
          className="relative aspect-[4/3] cursor-pointer overflow-hidden bg-muted"
          onClick={() => setSelectedMedia(file)}
        >
          {getFilePreview(file)}

          <div className="absolute left-3 top-3 flex gap-2">
            <Badge className="border-0 bg-black/60 text-white hover:bg-black/60">
              {isVideo ? (
                <Video className="mr-1 h-3 w-3" />
              ) : (
                <ImageIcon className="mr-1 h-3 w-3" />
              )}
              {isVideo ? "VÍDEO" : "IMAGEM"}
            </Badge>
          </div>

          <div className="absolute right-3 top-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full border-0 bg-white/90 shadow-sm hover:bg-white"
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedMedia(file);
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Visualizar
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    copyUrl(file.url || file.media_url);
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar URL
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    useInNewPost(file);
                  }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Usar em novo post
                </DropdownMenuItem>

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(file.id, file.name);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
            <Button
              size="sm"
              className="w-full font-semibold"
              onClick={(event) => {
                event.stopPropagation();
                useInNewPost(file);
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Usar em novo post
            </Button>
          </div>
        </div>

        <CardContent className="space-y-3 p-4">
          <div>
            <h4 className="line-clamp-1 text-sm font-semibold" title={file.name}>
              {file.name}
            </h4>

            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{formatBytes(file.size)}</span>
              <span>{getFileDate(file)}</span>
            </div>
          </div>

          {file.tags ? (
            <div className="flex flex-wrap gap-1">
              {String(file.tags)
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean)
                .slice(0, 3)
                .map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2 py-1 text-[10px] text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">Sem tags</div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setSelectedMedia(file)}
            >
              <Eye className="mr-2 h-4 w-4" />
              Ver
            </Button>

            <Button
              type="button"
              size="sm"
              className="w-full"
              onClick={() => useInNewPost(file)}
            >
              Usar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Biblioteca de Mídia
            </h1>

            <p className="mt-1 text-muted-foreground">
              Gerencie suas imagens e vídeos para criar postagens mais rápidas.
            </p>
          </div>

          <Button
            className="shrink-0"
            onClick={() => toast.info("Simulação de upload de arquivo.")}
          >
            <Upload className="mr-2 h-4 w-4" />
            Fazer Upload
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-blue-600 p-3 text-white">
                <Images className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-medium text-blue-700">
                  Total de mídias
                </p>
                <p className="text-2xl font-bold text-blue-800">
                  {mediaFiles.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-green-600 p-3 text-white">
                <ImageIcon className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-medium text-green-700">Imagens</p>
                <p className="text-2xl font-bold text-green-800">
                  {imageCount}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="rounded-full bg-purple-600 p-3 text-white">
                <Video className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-medium text-purple-700">Vídeos</p>
                <p className="text-2xl font-bold text-purple-800">
                  {videoCount}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="text"
                placeholder="Buscar por nome ou tag..."
                className="h-11 pl-10 pr-24"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {search ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 h-8 -translate-y-1/2"
                  onClick={() => setSearch("")}
                >
                  Limpar
                </Button>
              ) : null}
            </div>

            <Tabs
              value={activeType}
              onValueChange={setActiveType}
              className="w-full lg:w-auto"
            >
              <TabsList className="grid h-11 w-full grid-cols-3 lg:w-auto">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="image">Imagens</TabsTrigger>
                <TabsTrigger value="video">Vídeos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-[330px] rounded-2xl" />
            ))}
          </div>
        ) : filteredMedia.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMedia.map((file: any) => renderMediaCard(file))}
          </div>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/20 p-12 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <FolderOpen className="h-10 w-10 text-muted-foreground" />
            </div>

            <h3 className="mb-2 text-xl font-semibold">
              {search || activeType !== "all"
                ? "Nenhuma mídia encontrada"
                : "Sua biblioteca está vazia"}
            </h3>

            <p className="mb-6 max-w-md text-sm text-muted-foreground">
              {search || activeType !== "all"
                ? "Tente limpar a busca ou alterar o filtro para visualizar mais arquivos."
                : "Faça upload de imagens ou vídeos para reutilizar em suas postagens futuras."}
            </p>

            {search || activeType !== "all" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setActiveType("all");
                }}
              >
                Limpar filtros
              </Button>
            ) : (
              <Button onClick={() => toast.info("Simulação de upload.")}>
                <Upload className="mr-2 h-4 w-4" />
                Fazer Upload
              </Button>
            )}
          </div>
        )}

        {selectedMedia ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="relative max-h-[95vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-background shadow-2xl">
              <div className="flex items-center justify-between border-b p-4">
                <div className="min-w-0">
                  <h2 className="line-clamp-1 text-lg font-bold">
                    {selectedMedia.name}
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    {selectedMedia.type === "video" ? "Vídeo" : "Imagem"} •{" "}
                    {formatBytes(selectedMedia.size)} •{" "}
                    {getFileDate(selectedMedia)}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedMedia(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid max-h-[calc(95vh-80px)] grid-cols-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="flex min-h-[360px] items-center justify-center bg-muted p-4">
                  <div className="h-full max-h-[70vh] w-full">
                    {getFilePreview(selectedMedia, "modal")}
                  </div>
                </div>

                <div className="space-y-5 border-l p-5">
                  <div>
                    <p className="mb-1 text-sm font-semibold">Nome do arquivo</p>
                    <p className="break-all text-sm text-muted-foreground">
                      {selectedMedia.name}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-sm font-semibold">Tipo</p>
                    <Badge variant="secondary">
                      {selectedMedia.type === "video" ? (
                        <Video className="mr-1 h-3 w-3" />
                      ) : (
                        <ImageIcon className="mr-1 h-3 w-3" />
                      )}
                      {selectedMedia.type === "video" ? "Vídeo" : "Imagem"}
                    </Badge>
                  </div>

                  <div>
                    <p className="mb-1 text-sm font-semibold">URL</p>
                    <p className="line-clamp-3 break-all text-xs text-muted-foreground">
                      {selectedMedia.url || selectedMedia.media_url}
                    </p>
                  </div>

                  {selectedMedia.tags ? (
                    <div>
                      <p className="mb-2 text-sm font-semibold">Tags</p>

                      <div className="flex flex-wrap gap-2">
                        {String(selectedMedia.tags)
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                            >
                              #{tag}
                            </span>
                          ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2 pt-2">
                    <Button
                      className="w-full"
                      onClick={() => useInNewPost(selectedMedia)}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Usar em novo post
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        copyUrl(selectedMedia.url || selectedMedia.media_url)
                      }
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar URL
                    </Button>

                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() =>
                        handleDelete(selectedMedia.id, selectedMedia.name)
                      }
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir mídia
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
