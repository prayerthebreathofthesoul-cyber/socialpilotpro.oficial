import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Upload, Image as ImageIcon, Video, FolderOpen, Filter, Trash2 } from "lucide-react";
import { useListMedia, getListMediaQueryKey, useDeleteMedia } from "@/lib/mock-api";
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
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: mediaFiles, isLoading } = useListMedia(undefined, {
    query: { queryKey: getListMediaQueryKey() }
  });

  const deleteMedia = useDeleteMedia();

  const handleDelete = async (id: number) => {
    try {
      await deleteMedia.mutateAsync({ id });
      toast.success("Mídia excluída com sucesso.");
      queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
    } catch (e) {
      toast.error("Erro ao excluir mídia.");
    }
  };

  const filteredMedia = mediaFiles?.filter(file => {
    if (activeType !== "all" && file.type !== activeType) return false;
    if (search && !file.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Biblioteca de Mídia</h1>
            <p className="text-muted-foreground mt-1">Gerencie suas imagens e vídeos para as postagens.</p>
          </div>
          <Button className="shrink-0" onClick={() => toast.info("Simulação de upload de arquivo.")}>
            <Upload className="mr-2 h-4 w-4" />
            Fazer Upload
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-4 bg-card p-4 rounded-xl border">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="text" 
              placeholder="Buscar arquivos..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Tabs value={activeType} onValueChange={setActiveType} className="w-full sm:w-auto">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="image">Imagens</TabsTrigger>
              <TabsTrigger value="video">Vídeos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        ) : filteredMedia && filteredMedia.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMedia.map(file => (
              <Card key={file.id} className="overflow-hidden group cursor-pointer hover:border-primary/50 transition-colors">
                <div className="aspect-square bg-muted relative">
                  {file.type === 'video' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <Video className="w-12 h-12 text-white/50" />
                    </div>
                  ) : null}
                  <img 
                    src={file.thumbnailUrl || file.url} 
                    alt={file.name} 
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="secondary" size="icon" className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/40 text-white border-0">
                            <Filter className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toast.success("URL copiada!")}>
                            Copiar URL
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <Button size="sm" variant="default" className="w-full font-medium" onClick={(e) => {
                      e.stopPropagation();
                      toast.success("Mídia selecionada pronta para uso.");
                    }}>
                      Usar na Postagem
                    </Button>
                  </div>

                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant="secondary" className="bg-black/50 text-white border-0 hover:bg-black/50 pointer-events-none">
                      {file.type === 'image' ? <ImageIcon className="w-3 h-3 mr-1" /> : <Video className="w-3 h-3 mr-1" />}
                      {file.type === 'image' ? 'IMG' : 'VID'}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-3">
                  <h4 className="text-sm font-medium line-clamp-1 mb-1" title={file.name}>{file.name}</h4>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatBytes(file.size)}</span>
                    <span>{format(new Date(file.createdAt), "dd MMM, yyyy", { locale: ptBR })}</span>
                  </div>
                  {file.tags && (
                    <div className="mt-2 text-[10px] text-muted-foreground flex flex-wrap gap-1">
                      {file.tags.split(',').map(tag => (
                        <span key={tag} className="bg-muted px-1.5 py-0.5 rounded">#{tag.trim()}</span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sua biblioteca está vazia</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Faça o upload de imagens ou vídeos para usá-los em suas postagens futuras.
            </p>
            <Button onClick={() => toast.info("Simulação de upload.")}>
              <Upload className="mr-2 h-4 w-4" /> Fazer Upload
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}