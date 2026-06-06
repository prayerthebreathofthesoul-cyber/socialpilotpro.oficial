import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { PostForm } from "@/components/posts/PostForm";

export default function NewPost() {
  const [, setLocation] = useLocation();

  const handleSuccess = () => {
    setLocation("/calendar");
  };

  const handleCancel = () => {
    setLocation("/dashboard");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Criar Postagem</h1>
          <p className="text-muted-foreground mt-1">Configure o conteúdo e o agendamento da sua nova postagem.</p>
        </div>
        
        <PostForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </Layout>
  );
}