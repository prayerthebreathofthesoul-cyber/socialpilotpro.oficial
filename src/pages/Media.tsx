import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Upload,
  Image as ImageIcon,
  Video,
  FolderOpen,
  Filter,
  Trash2,
  Sparkles,
  Loader2,
  ExternalLink,
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

type PexelsPhoto = {
  id: number;
  alt: string;
  photographer: string;
  photographerUrl: string;
  pexelsUrl: string;
  imageUrl: string;
  previewUrl: string;
  originalUrl: string;
};

export default function Media() {
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("library");

  const [pexelsSearch, setPexelsSearch] = useState("");
  const [pexelsPhotos, setPexelsPhotos] = useState<PexelsPhoto[]>([]);
  const [isSearchingPexels, setIsSearchingPexels] = useState(false);

  const queryClient = useQueryClient();

  const { data: media = [], isLoading } = useListMedia();

  const deleteMedia = useDeleteMedia();

  const filteredMedia = media.filter((item: any) => {
    const term = search.toLowerCase().trim();

    if (!term) return true;

    const name = String(item.name || "").toLowerCase();
    const type = String(item.type || "").toLowerCase();

    return name.includes(term) || type.includes(term);
  });

  async function handleSearchPexels() {
    const term = pexelsSearch.trim();

    if (!term) {
      toast.error("Digite o que você quer buscar.");
      return;
    }

    try {
      setIsSearchingPexels(true);

      const response = await fetch(
        `/api/pexels/search?query=${encodeURIComponent(term)}&per_page=12`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar imagens.");
      }

      setPexelsPhotos(data.photos || []);

      if (!data.photos || data.photos.length === 0) {
        toast.info("Nenhuma imagem encontrada.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível buscar imagens grátis.");
    } finally {
      setIsSearchingPexels(false);
    }
  }

  function handleDeleteMedia(id: string) {
    deleteMedia.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListMediaQueryKey(),
          });

          toast.success("Mídia excluída com sucesso!");
        },
        onError: () => {
          toast.error("Erro ao excluir mídia.");
        },
      }
    );
  }

  function handleUseInNewPost(photo: PexelsPhoto) {
    const params = new URLSearchParams({
      imageUrl: photo.imageUrl,
      imageAlt: photo.alt || "Imagem do Pexels",
      photographer: photo.photographer,
      source: "pexels",
    });

    setLocation(`/posts/new?${params.toString()}`);
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Biblioteca de Mídia
            </h1>

            <p className="text-muted-foreground">
              Gerencie imagens, vídeos e busque mídias grátis para suas postagens.
            </p>
          </div>

          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Enviar mídia
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto flex-wrap gap-2 bg-muted p-2">
            <TabsTrigger value="library" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Minha biblioteca
            </TabsTrigger>

            <TabsTrigger value="pexels" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Banco de imagens grátis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  placeholder="Buscar na biblioteca..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-9"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtrar
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Todas as mídias</DropdownMenuItem>
                  <DropdownMenuItem>Imagens</DropdownMenuItem>
                  <DropdownMenuItem>Vídeos</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-56 rounded-xl" />
                ))}
              </div>
            ) : filteredMedia.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
                  <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground" />

                  <h3 className="text-lg font-semibold">
                    Nenhuma mídia encontrada
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Envie uma mídia ou busque imagens grátis no banco de imagens.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredMedia.map((item: any) => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="relative aspect-video bg-muted">
                      {item.type === "video" ? (
                        <div className="flex h-full items-center justify-center">
                          <Video className="h-10 w-10 text-muted-foreground" />
                        </div>
                      ) : (
                        <img
                          src={item.url}
                          alt={item.name || "Mídia"}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    <CardContent className="space-y-3 p-4">
                      <div className="space-y-1">
                        <p className="line-clamp-1 font-medium">
                          {item.name || "Mídia sem nome"}
                        </p>

                        {item.createdAt && (
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(item.createdAt),
                              "dd 'de' MMMM yyyy",
                              {
                                locale: ptBR,
                              }
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary">
                          {item.type === "video" ? "Vídeo" : "Imagem"}
                        </Badge>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMedia(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pexels" className="mt-6 space-y-4">
            <Card>
              <CardContent className="space-y-4 p-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    Banco de imagens grátis
                  </h2>

                  <p className="text-sm text-muted-foreground">
                    Busque imagens gratuitas para usar nas suas postagens.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      placeholder="Ex: ferramentas, oficina, construção, logística..."
                      value={pexelsSearch}
                      onChange={(event) => setPexelsSearch(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          handleSearchPexels();
                        }
                      }}
                      className="pl-9"
                    />
                  </div>

                  <Button
                    onClick={handleSearchPexels}
                    disabled={isSearchingPexels}
                    className="sm:min-w-44"
                  >
                    {isSearchingPexels ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Buscar no Pexels
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {pexelsPhotos.length === 0 ? (
              <Card>
                <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
                  <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />

                  <h3 className="text-lg font-semibold">
                    Busque uma imagem grátis
                  </h3>

                  <p className="mt-1 max-w-md text-sm text-muted-foreground">
                    Digite uma palavra-chave acima para encontrar imagens que podem
                    ser usadas em novos posts.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pexelsPhotos.map((photo) => (
                  <Card key={photo.id} className="overflow-hidden">
                    <div className="aspect-video bg-muted">
                      <img
                        src={photo.previewUrl}
                        alt={photo.alt || "Imagem do Pexels"}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    <CardContent className="space-y-3 p-4">
                      <div className="space-y-1">
                        <p className="line-clamp-1 text-sm font-medium">
                          {photo.alt || "Imagem do Pexels"}
                        </p>

                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          Foto por {photo.photographer}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={() => handleUseInNewPost(photo)}
                          className="w-full"
                        >
                          Usar em novo post
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => window.open(photo.pexelsUrl, "_blank")}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ver no Pexels
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
