import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Post } from "@workspace/api-client-react";
import { PostStatusBadge, PlatformIcon, PostTypeBadge } from "./PostStatusBadge";
import { Calendar, Clock, BarChart2, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PostCardProps {
  post: Post;
  onDelete?: (id: number) => void;
  onPublish?: (id: number) => void;
}

export function PostCard({ post, onDelete, onPublish }: PostCardProps) {
  const displayDate = post.scheduledAt || post.publishedAt || post.createdAt;
  
  return (
    <Card className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
      {post.thumbnailUrl || post.mediaUrl ? (
        <div className="w-full h-48 bg-muted relative overflow-hidden group">
          <img 
            src={post.thumbnailUrl || post.mediaUrl || ""} 
            alt={post.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 right-2 flex gap-1">
            <PostTypeBadge type={post.type} />
          </div>
        </div>
      ) : (
        <div className="w-full h-48 bg-muted flex flex-col items-center justify-center relative text-muted-foreground">
          <div className="absolute top-2 right-2 flex gap-1">
            <PostTypeBadge type={post.type} />
          </div>
          <span className="text-sm">Sem mídia</span>
        </div>
      )}
      
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <PostStatusBadge status={post.status} />
          <div className="flex -space-x-1">
            {post.platforms.map((p) => (
              <div key={p} className="w-6 h-6 rounded-full bg-background border flex items-center justify-center">
                <PlatformIcon platform={p} className="w-3 h-3" />
              </div>
            ))}
          </div>
        </div>
        
        <h3 className="font-semibold text-lg line-clamp-1 mb-1">{post.title}</h3>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4 flex-1">
          {post.caption || "Sem legenda"}
        </p>
        
        <div className="flex items-center text-xs text-muted-foreground gap-3 mt-auto">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>
              {displayDate ? format(new Date(displayDate), "d 'de' MMM", { locale: ptBR }) : "-"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {displayDate ? format(new Date(displayDate), "HH:mm") : "-"}
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex items-center justify-between border-t mt-auto">
        {(post.engagement || post.reach) ? (
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-4">
            <div className="flex items-center gap-1" title="Engajamento">
              <BarChart2 className="w-3 h-3" />
              <span>{post.engagement || 0}</span>
            </div>
            <div className="flex items-center gap-1" title="Alcance">
              <span className="font-medium">{post.reach || 0}</span>
            </div>
          </div>
        ) : (
          <div className="pt-4 text-xs text-muted-foreground italic">Aguardando dados</div>
        )}

        <div className="pt-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/posts/${post.id}/edit`} className="cursor-pointer flex items-center">
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Editar</span>
                </Link>
              </DropdownMenuItem>
              {post.status === 'draft' && onPublish && (
                <DropdownMenuItem className="cursor-pointer" onClick={() => onPublish(post.id)}>
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Publicar Agora</span>
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => onDelete(post.id)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Excluir</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </Card>
  );
}