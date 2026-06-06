import { Badge } from "@/components/ui/badge";
import { PostStatus, PostType } from "@/lib/mock-api";
import { Instagram, Facebook, Share2 } from "lucide-react";
import { SiTiktok } from "react-icons/si";

export function PostStatusBadge({ status }: { status: PostStatus }) {
  const variants: Record<string, string> = {
    scheduled: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    published: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    draft: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    failed: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  };

  const labels: Record<string, string> = {
    scheduled: "Agendado",
    published: "Publicado",
    draft: "Rascunho",
    failed: "Falha",
  };

  return (
    <Badge variant="outline" className={`${variants[status]} border font-medium`}>
      {labels[status]}
    </Badge>
  );
}

export function PlatformIcon({ platform, className = "w-4 h-4" }: { platform: string; className?: string }) {
  if (platform === "instagram") return <Instagram className={`${className} text-pink-600`} />;
  if (platform === "facebook") return <Facebook className={`${className} text-blue-600`} />;
  if (platform === "tiktok") return <SiTiktok className={`${className} text-slate-900 dark:text-slate-100`} />;
  return <Share2 className={className} />;
}

export function PostTypeBadge({ type }: { type: PostType }) {
  return (
    <Badge variant="secondary" className="font-normal text-xs bg-secondary text-secondary-foreground">
      {type === "feed" ? "Feed" : "Story"}
    </Badge>
  );
}