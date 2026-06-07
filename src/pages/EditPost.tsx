import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { PostForm } from "@/components/posts/PostForm";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type SupabasePost = {
  id: string;
  company_id: string;
  title: string;
  caption: string | null;
  hashtags: string | null;
  media_url: string | null;
  type: string;
  status: string;
  platforms: string[] | null;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export default function EditPost() {
  const [, setLocation] = useLocation();
  const params = useParams() as { id?: string };

  const [post, setPost] = useState<SupabasePost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

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

  const loadPost = async () => {
    if (!params.id) {
      setIsError(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    try {
      const companyId = await getCompanyId();

      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", params.id)
        .eq("company_id", companyId)
        .single();

      if (error || !data) {
        throw error || new Error("Postagem não encontrada.");
      }

      setPost(data as SupabasePost);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Erro ao carregar postagem.");
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPost();
  }, [params.id]);

  const handleSuccess = () => {
    toast.success("Postagem atualizada com sucesso.");
    setLocation("/dashboard");
  };

  const handleCancel = () => {
    setLocation("/dashboard");
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
        <div className="p-12 text-center space-y-4">
          <p className="text-destructive font-medium">
            Postagem não encontrada ou ocorreu um erro.
          </p>

          <Button type="button" onClick={() => setLocation("/dashboard")}>
            Voltar ao Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Editar Postagem
          </h1>
          <p className="text-muted-foreground mt-1">
            Faça alterações no conteúdo ou agendamento.
          </p>
        </div>

        <PostForm
          initialData={post}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </Layout>
  );
}
