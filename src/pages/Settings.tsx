import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Mail,
  Instagram,
  Facebook,
  Key,
  Shield,
  Rocket,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type DocumentType = "cpf" | "cnpj";

type Company = {
  id: string;
  name: string;
  segment: string | null;
  cnpj: string | null;
  email: string | null;
  plan: string | null;
  document_type: DocumentType | null;
  document_number: string | null;
};

type Profile = {
  id: string;
  user_id: string;
  company_id: string;
  name: string | null;
  email: string | null;
  role: string | null;
};

type SocialPlatform = "instagram" | "facebook" | "tiktok";

const segmentOptions = [
  "Ferramentas e utilidades",
  "Moda e acessórios",
  "Beleza e cosméticos",
  "Alimentação",
  "Saúde e bem-estar",
  "Educação e cursos",
  "Tecnologia e informática",
  "Casa e decoração",
  "Serviços profissionais",
  "Marketing digital",
  "Loja virtual / E-commerce",
  "Prestador de serviços",
  "Infoprodutos",
  "Consultoria",
  "Restaurante / Lanchonete",
  "Imobiliária",
  "Automotivo",
  "Pet shop",
  "Academia / Fitness",
  "Outro",
];

export default function Settings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [isConnectingMeta, setIsConnectingMeta] = useState(false);
  const [isConnectingTiktok, setIsConnectingTiktok] = useState(false);
  const [disconnectingPlatform, setDisconnectingPlatform] =
    useState<SocialPlatform | null>(null);

  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    segment: "",
    documentType: "cnpj" as DocumentType,
    documentNumber: "",
    instagramConnected: false,
    facebookConnected: false,
    tiktokConnected: false,
  });

  const loadAccountData = async () => {
    setIsLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error("Não foi possível carregar o usuário logado.");
        return;
      }

      setUserEmail(user.email || "");

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profileData) {
        toast.error("Perfil da conta não encontrado.");
        return;
      }

      setProfile(profileData);

      const { data: companyData, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profileData.company_id)
        .single();

      if (companyError || !companyData) {
        toast.error("Empresa da conta não encontrada.");
        return;
      }

      setCompany(companyData);

      const { data: socialAccounts, error: socialAccountsError } =
        await supabase
          .from("social_accounts")
          .select("platform,status,is_connected")
          .eq("company_id", companyData.id);

      if (socialAccountsError) {
        console.error(socialAccountsError);
        toast.error("Erro ao carregar contas sociais conectadas.");
      }

      const connectedPlatforms = socialAccounts || [];

      const isPlatformConnected = (platform: string) => {
        return connectedPlatforms.some(
          (account) =>
            account.platform === platform &&
            account.status === "connected" &&
            account.is_connected !== false
        );
      };

      setFormData({
        name: companyData.name || "",
        segment: companyData.segment || "",
        documentType: (companyData.document_type as DocumentType) || "cnpj",
        documentNumber: companyData.document_number || companyData.cnpj || "",
        instagramConnected: isPlatformConnected("instagram"),
        facebookConnected: isPlatformConnected("facebook"),
        tiktokConnected: isPlatformConnected("tiktok"),
      });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados da conta.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccountData();

    const searchParams = new URLSearchParams(window.location.search);

    const metaStatus = searchParams.get("meta");
    const tiktokStatus = searchParams.get("tiktok");

    if (metaStatus === "connected") {
      toast.success("Conta Meta conectada com sucesso!");
      window.history.replaceState({}, "", "/settings");
    }

    if (metaStatus && metaStatus !== "connected") {
      const messages: Record<string, string> = {
        error: "Não foi possível conectar com a Meta.",
        invalid_state: "Conexão inválida. Tente conectar novamente.",
        expired_state: "Tempo de conexão expirado. Tente novamente.",
        token_error: "Erro ao gerar token da Meta.",
        long_token_error: "Erro ao gerar token de longa duração da Meta.",
        pages_error: "Erro ao buscar páginas do Facebook.",
        no_pages: "Nenhuma página do Facebook foi encontrada nessa conta.",
        save_error: "Erro ao salvar a conta conectada.",
        unexpected_error: "Erro inesperado ao conectar com a Meta.",
      };

      toast.error(messages[metaStatus] || "Erro ao conectar com a Meta.");
      window.history.replaceState({}, "", "/settings");
    }

    if (tiktokStatus === "connected") {
      toast.success("Conta TikTok conectada com sucesso!");
      window.history.replaceState({}, "", "/settings");
    }

    if (tiktokStatus && tiktokStatus !== "connected") {
      const messages: Record<string, string> = {
        error: "Não foi possível conectar com o TikTok.",
        invalid_state: "Conexão inválida. Tente conectar novamente.",
        expired_state: "Tempo de conexão expirado. Tente novamente.",
        token_error: "Erro ao gerar token do TikTok.",
        creator_error: "Erro ao buscar dados do criador no TikTok.",
        save_error: "Erro ao salvar a conta TikTok conectada.",
        scope_error:
          "Permissões insuficientes. Verifique os escopos do app TikTok.",
        unexpected_error: "Erro inesperado ao conectar com o TikTok.",
      };

      toast.error(messages[tiktokStatus] || "Erro ao conectar com o TikTok.");
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  const handleSaveCompany = async () => {
    if (!company) {
      toast.error("Empresa não encontrada.");
      return;
    }

    setIsSavingCompany(true);

    try {
      const { error } = await supabase
        .from("companies")
        .update({
          name: formData.name,
          segment: formData.segment || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", company.id);

      if (error) {
        throw error;
      }

      setCompany((prev) =>
        prev
          ? {
              ...prev,
              name: formData.name,
              segment: formData.segment || null,
            }
          : prev
      );

      toast.success("Dados da empresa atualizados com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar os dados da empresa.");
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleChangeEmail = async () => {
    const newEmail = window.prompt("Digite o novo e-mail da conta:", userEmail);

    if (!newEmail) return;

    const normalizedEmail = newEmail.trim().toLowerCase();

    if (!normalizedEmail.includes("@")) {
      toast.error("Digite um e-mail válido.");
      return;
    }

    setIsUpdatingAccount(true);

    try {
      const { error } = await supabase.auth.updateUser({
        email: normalizedEmail,
      });

      if (error) {
        throw error;
      }

      if (profile) {
        await supabase
          .from("profiles")
          .update({
            email: normalizedEmail,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profile.id);
      }

      if (company) {
        await supabase
          .from("companies")
          .update({
            email: normalizedEmail,
            updated_at: new Date().toISOString(),
          })
          .eq("id", company.id);
      }

      setUserEmail(normalizedEmail);

      toast.success(
        "Solicitação de alteração enviada. Verifique seu e-mail se o Supabase solicitar confirmação."
      );
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.message || "Não foi possível alterar o e-mail da conta."
      );
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  const handleChangePassword = async () => {
    const newPassword = window.prompt(
      "Digite a nova senha. Ela precisa ter pelo menos 6 caracteres:"
    );

    if (!newPassword) return;

    if (newPassword.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setIsUpdatingAccount(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      toast.success("Senha atualizada com sucesso.");
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.message || "Não foi possível alterar a senha da conta."
      );
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  const handleConnectMeta = async () => {
    if (!company || !profile) {
      toast.error("Dados da conta não encontrados.");
      return;
    }

    setIsConnectingMeta(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error("Usuário não autenticado.");
        return;
      }

      const state =
        crypto.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error } = await supabase.from("meta_oauth_states").insert({
        state,
        company_id: company.id,
        user_id: user.id,
        expires_at: expiresAt,
      });

      if (error) {
        throw error;
      }

      window.location.href = `/api/meta/connect?state=${encodeURIComponent(
        state
      )}`;
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.message || "Não foi possível iniciar a conexão com a Meta."
      );
      setIsConnectingMeta(false);
    }
  };

  const handleConnectTiktok = async () => {
    if (!company || !profile) {
      toast.error("Dados da conta não encontrados.");
      return;
    }

    setIsConnectingTiktok(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error("Usuário não autenticado.");
        return;
      }

      const state =
        crypto.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { error } = await supabase.from("tiktok_oauth_states").insert({
        state,
        company_id: company.id,
        user_id: user.id,
        expires_at: expiresAt,
      });

      if (error) {
        throw error;
      }

      window.location.href = `/api/tiktok/connect?state=${encodeURIComponent(
        state
      )}`;
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.message || "Não foi possível iniciar a conexão com o TikTok."
      );
      setIsConnectingTiktok(false);
    }
  };

  const handleDisconnectSocial = async (platform: SocialPlatform) => {
    if (!company) {
      toast.error("Empresa não encontrada.");
      return;
    }

    const platformLabels: Record<SocialPlatform, string> = {
      instagram: "Instagram",
      facebook: "Facebook",
      tiktok: "TikTok",
    };

    const confirmed = window.confirm(
      `Deseja desconectar ${platformLabels[platform]} desta conta?`
    );

    if (!confirmed) return;

    setDisconnectingPlatform(platform);

    try {
      const { error } = await supabase
        .from("social_accounts")
        .update({
          status: "disconnected",
          is_connected: false,
        })
        .eq("company_id", company.id)
        .eq("platform", platform);

      if (error) {
        throw error;
      }

      setFormData((prev) => ({
        ...prev,
        instagramConnected:
          platform === "instagram" ? false : prev.instagramConnected,
        facebookConnected:
          platform === "facebook" ? false : prev.facebookConnected,
        tiktokConnected: platform === "tiktok" ? false : prev.tiktokConnected,
      }));

      toast.success(`${platformLabels[platform]} desconectado com sucesso.`);
    } catch (error: any) {
      console.error(error);
      toast.error(
        error?.message ||
          `Não foi possível desconectar ${platformLabels[platform]}.`
      );
    } finally {
      setDisconnectingPlatform(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua conta, empresa e preferências do SocialPilot Pro.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <Tabs defaultValue="empresa" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-[650px] mb-8">
              <TabsTrigger value="empresa">Empresa</TabsTrigger>
              <TabsTrigger value="sociais">Redes Sociais</TabsTrigger>
              <TabsTrigger value="plano">Plano</TabsTrigger>
              <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
            </TabsList>

            <TabsContent value="empresa" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dados da Empresa</CardTitle>
                  <CardDescription>
                    Informações reais da conta cadastrada no SocialPilot Pro.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      {formData.documentType === "cpf"
                        ? "Nome Completo"
                        : "Nome da Empresa"}
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder={
                        formData.documentType === "cpf"
                          ? "Seu nome completo"
                          : "Minha Empresa"
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="segment">Segmento/Nicho</Label>
                    <select
                      id="segment"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.segment}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          segment: event.target.value,
                        }))
                      }
                    >
                      <option value="">Selecione um segmento</option>
                      {segmentOptions.map((segment) => (
                        <option key={segment} value={segment}>
                          {segment}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="documentType">Tipo de Cadastro</Label>
                      <select
                        id="documentType"
                        className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                        value={formData.documentType}
                        disabled
                      >
                        <option value="cnpj">Pessoa Jurídica - CNPJ</option>
                        <option value="cpf">Pessoa Física - CPF</option>
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Este dado não pode ser alterado pelo usuário. Para
                        corrigir, entre em contato com o suporte.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="documentNumber">
                        {formData.documentType === "cpf" ? "CPF" : "CNPJ"}
                      </Label>
                      <Input
                        id="documentNumber"
                        value={formData.documentNumber}
                        disabled
                        className="bg-muted text-muted-foreground cursor-not-allowed"
                        placeholder={
                          formData.documentType === "cpf"
                            ? "000.000.000-00"
                            : "00.000.000/0000-00"
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Documento bloqueado por segurança.
                      </p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="border-t px-6 py-4">
                  <Button
                    type="button"
                    onClick={handleSaveCompany}
                    disabled={isSavingCompany}
                  >
                    {isSavingCompany ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Credenciais de Acesso</CardTitle>
                  <CardDescription>
                    Dados reais da conta autenticada pelo Supabase.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted p-2 rounded-full">
                        <Mail className="w-4 h-4" />
                      </div>

                      <div>
                        <p className="font-medium text-sm">E-mail</p>
                        <p className="text-sm text-muted-foreground">
                          {userEmail || "E-mail não encontrado"}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleChangeEmail}
                      disabled={isUpdatingAccount}
                    >
                      Alterar
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted p-2 rounded-full">
                        <Key className="w-4 h-4" />
                      </div>

                      <div>
                        <p className="font-medium text-sm">Senha</p>
                        <p className="text-sm text-muted-foreground">
                          Senha protegida pelo Supabase Auth
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleChangePassword}
                      disabled={isUpdatingAccount}
                    >
                      Alterar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sociais" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contas Conectadas</CardTitle>
                  <CardDescription>
                    Conecte Instagram, Página Facebook e TikTok para preparar
                    suas postagens em um só lugar.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-full text-pink-600 dark:text-pink-400">
                        <Instagram className="w-5 h-5" />
                      </div>

                      <div>
                        <p className="font-medium">Instagram</p>
                        <p className="text-sm text-muted-foreground">
                          {formData.instagramConnected
                            ? "Conectado"
                            : "Não conectado"}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={
                        formData.instagramConnected ? "destructive" : "outline"
                      }
                      onClick={() =>
                        formData.instagramConnected
                          ? handleDisconnectSocial("instagram")
                          : handleConnectMeta()
                      }
                      disabled={
                        isConnectingMeta ||
                        disconnectingPlatform === "instagram"
                      }
                      className="sm:w-auto w-full"
                    >
                      {disconnectingPlatform === "instagram"
                        ? "Desconectando..."
                        : isConnectingMeta
                          ? "Conectando..."
                          : formData.instagramConnected
                            ? "Desconectar"
                            : "Conectar"}
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                        <Facebook className="w-5 h-5" />
                      </div>

                      <div>
                        <p className="font-medium">Página Facebook</p>
                        <p className="text-sm text-muted-foreground">
                          {formData.facebookConnected
                            ? "Conectada"
                            : "Não conectada"}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={
                        formData.facebookConnected ? "destructive" : "outline"
                      }
                      onClick={() =>
                        formData.facebookConnected
                          ? handleDisconnectSocial("facebook")
                          : handleConnectMeta()
                      }
                      disabled={
                        isConnectingMeta ||
                        disconnectingPlatform === "facebook"
                      }
                      className="sm:w-auto w-full"
                    >
                      {disconnectingPlatform === "facebook"
                        ? "Desconectando..."
                        : isConnectingMeta
                          ? "Conectando..."
                          : formData.facebookConnected
                            ? "Desconectar"
                            : "Conectar"}
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-900 dark:text-slate-100">
                        <SiTiktok className="w-5 h-5" />
                      </div>

                      <div>
                        <p className="font-medium">TikTok</p>
                        <p className="text-sm text-muted-foreground">
                          {formData.tiktokConnected
                            ? "Conectado"
                            : "Não conectado"}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant={
                        formData.tiktokConnected ? "destructive" : "outline"
                      }
                      onClick={() =>
                        formData.tiktokConnected
                          ? handleDisconnectSocial("tiktok")
                          : handleConnectTiktok()
                      }
                      disabled={
                        isConnectingTiktok ||
                        disconnectingPlatform === "tiktok"
                      }
                      className="sm:w-auto w-full"
                    >
                      {disconnectingPlatform === "tiktok"
                        ? "Desconectando..."
                        : isConnectingTiktok
                          ? "Conectando..."
                          : formData.tiktokConnected
                            ? "Desconectar"
                            : "Conectar"}
                    </Button>
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <p className="font-semibold">Observação sobre TikTok</p>
                    <p className="mt-1">
                      Para publicar diretamente no TikTok, o app precisa estar
                      configurado no TikTok for Developers com as permissões de
                      publicação aprovadas. Se ainda não estiver aprovado, a
                      conexão pode funcionar, mas a publicação direta pode ser
                      recusada pela API do TikTok.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plano" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-primary shadow-sm relative overflow-hidden">
                  {(company?.plan || "free") === "free" && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Plano Atual
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle>Plano Gratuito</CardTitle>
                    <CardDescription>
                      Essencial para começar a organizar seus posts
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold">
                      R$ 0
                      <span className="text-sm font-normal text-muted-foreground">
                        /mês
                      </span>
                    </div>

                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-500" />
                        Até 15 posts por mês
                      </li>
                      <li className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-500" />
                        Organização por calendário
                      </li>
                      <li className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-500" />
                        Analytics básico
                      </li>
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      Seu Plano
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border-orange-500 shadow-md relative overflow-hidden">
                  {company?.plan === "premium" && (
                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Plano Atual
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>SocialPilot Pro Premium</CardTitle>
                      <Rocket className="w-5 h-5 text-orange-500" />
                    </div>

                    <CardDescription>
                      Mais recursos para crescer nas redes sociais
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold">
                      R$ 49
                      <span className="text-sm font-normal text-muted-foreground">
                        /mês
                      </span>
                    </div>

                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2 font-medium">
                        <Shield className="w-4 h-4 text-orange-500" />
                        Posts ilimitados
                      </li>
                      <li className="flex items-center gap-2 font-medium">
                        <Shield className="w-4 h-4 text-orange-500" />
                        Múltiplas contas
                      </li>
                      <li className="flex items-center gap-2 font-medium">
                        <Shield className="w-4 h-4 text-orange-500" />
                        Analytics avançado e relatórios
                      </li>
                      <li className="flex items-center gap-2 font-medium">
                        <Shield className="w-4 h-4 text-orange-500" />
                        Suporte prioritário
                      </li>
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      type="button"
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      disabled={company?.plan === "premium"}
                      onClick={() => {
                        const message = encodeURIComponent(
                          "Olá! Quero fazer upgrade para o plano Premium do SocialPilot Pro."
                        );

                        window.open(
                          `https://wa.me/5592993911262?text=${message}`,
                          "_blank"
                        );
                      }}
                    >
                      {company?.plan === "premium"
                        ? "Gerenciar Assinatura"
                        : "Fazer Upgrade Agora"}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="notificacoes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preferências de Notificação</CardTitle>
                  <CardDescription>
                    Como e quando você quer ser avisado.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">
                      Avisos por E-mail
                    </h4>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <Label>Post salvo com sucesso</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba um aviso quando uma postagem for criada ou
                          agendada.
                        </p>
                      </div>

                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <Label>Falha na publicação</Label>
                        <p className="text-sm text-muted-foreground">
                          Alerta caso haja problemas em uma integração futura.
                        </p>
                      </div>

                      <Switch defaultChecked />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h4 className="text-sm font-medium border-b pb-2">
                      Resumo e Relatórios
                    </h4>

                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <Label>Resumo Semanal</Label>
                        <p className="text-sm text-muted-foreground">
                          Estatísticas de engajamento toda segunda-feira.
                        </p>
                      </div>

                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
