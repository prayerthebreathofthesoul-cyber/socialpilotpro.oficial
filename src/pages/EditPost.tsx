import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { PostForm } from "@/components/posts/PostForm";
import { useGetPost, getGetPostQueryKey } from "@/lib/mock-api";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditPost() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const id = params.id ? Number.parseInt(params.id, 10) : 0;

  const { data: post, isLoading, isError } = useGetPost(id, {
    query: {
      enabled: !!id,
      queryKey: getGetPostQueryKey(id)
    }
  });

  const handleSuccess = () => {
    setLocation("/calendar");
  };

  const handleCancel = () => {
    setLocation("/calendar");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
          <Skeleton className="h-[600px] w-full mt-8" />
        </div>
      </Layout>
    );
  }

  if (isError || !post) {
    return (
      <Layout>
        <div className="p-12 text-center text-destructive">
          Postagem não encontrada ou ocorreu um erro.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Postagem</h1>
          <p className="text-muted-foreground mt-1">Faça alterações no conteúdo ou agendamento.</p>
        </div>
        
        <PostForm initialData={post} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </Layout>
  );
}