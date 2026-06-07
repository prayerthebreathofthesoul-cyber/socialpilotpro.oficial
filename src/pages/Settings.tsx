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

      setFormData({
        name: companyData.name || "",
        segment: companyData.segment || "",
        documentType: (companyData.document_type as DocumentType) || "cnpj",
        documentNumber: companyData.document_number || companyData.cnpj || "",
        instagramConnected: false,
        facebookConnected: false,
        tiktokConnected: false,
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

  const handleConnectSocial = (platform: "Instagram" | "Facebook") => {
    toast.info(
      `A conexão real com ${platform} será feita no próximo passo usando a API oficial da Meta.`
    );
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
                    Conecte suas redes sociais para preparar suas postagens em um
                    só lugar.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-full text-pink-600 dark:text-pink-400">
                        <Instagram className="w-5 h-5" />
                      </div>

                      <div>
                        <p className="font-medium">Instagram</p>
                        <p className="text-sm text-muted-foreground">
                          Não conectado
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleConnectSocial("Instagram")}
                    >
                      Conectar
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                        <Facebook className="w-5 h-5" />
                      </div>

                      <div>
                        <p className="font-medium">Facebook</p>
                        <p className="text-sm text-muted-foreground">
                          Não conectado
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleConnectSocial("Facebook")}
                    >
                      Conectar
                    </Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg opacity-75">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-900 dark:text-slate-100">
                        <SiTiktok className="w-5 h-5" />
                      </div>

                      <div>
                        <p className="font-medium">TikTok</p>
                        <p className="text-sm text-muted-foreground">
                          Integração em breve
                        </p>
                      </div>
                    </div>

                    <Button type="button" variant="outline" disabled>
                      Em breve
                    </Button>
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
                      onClick={() =>
                        toast.info(
                          "A cobrança real será configurada depois com o sistema de pagamentos."
                        )
                      }
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

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Post salvo com sucesso</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba um aviso quando uma postagem for criada ou
                          agendada.
                        </p>
                      </div>

                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
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

                    <div className="flex items-center justify-between">
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
