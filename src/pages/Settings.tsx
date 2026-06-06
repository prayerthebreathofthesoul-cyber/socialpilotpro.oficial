import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Store, Mail, Instagram, Facebook, Bell, Key, CreditCard, Shield, Rocket } from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { useListStores, getListStoresQueryKey, useUpdateStore } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: stores, isLoading } = useListStores({
    query: { queryKey: getListStoresQueryKey() }
  });
  
  const updateStore = useUpdateStore();
  const store = stores?.[0]; // Assume managing first store for demo

  const [formData, setFormData] = useState({
    name: "",
    segment: "",
    cnpj: "",
    instagramConnected: false,
    facebookConnected: false,
    tiktokConnected: false,
  });

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || "",
        segment: store.segment || "",
        cnpj: store.cnpj || "",
        instagramConnected: !!store.instagramConnected,
        facebookConnected: !!store.facebookConnected,
        tiktokConnected: !!store.tiktokConnected,
      });
    }
  }, [store]);

  const handleSaveStore = async () => {
    if (!store) return;
    try {
      await updateStore.mutateAsync({
        id: store.id,
        data: {
          name: formData.name,
          segment: formData.segment,
          cnpj: formData.cnpj || null,
        }
      });
      toast.success("Dados da loja atualizados.");
      queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
    } catch (e) {
      toast.error("Erro ao atualizar loja.");
    }
  };

  const handleToggleConnection = async (platform: 'instagramConnected' | 'facebookConnected' | 'tiktokConnected') => {
    if (!store) return;
    const newValue = !formData[platform];
    setFormData(prev => ({ ...prev, [platform]: newValue }));
    
    try {
      await updateStore.mutateAsync({
        id: store.id,
        data: {
          [platform]: newValue
        }
      });
      toast.success(`${newValue ? 'Conectado' : 'Desconectado'} com sucesso.`);
      queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
    } catch (e) {
      toast.error("Erro ao alterar conexão.");
      setFormData(prev => ({ ...prev, [platform]: !newValue })); // revert
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground mt-1">Gerencie sua conta, loja e conexões com redes sociais.</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        ) : (
          <Tabs defaultValue="loja" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-[600px] mb-8">
              <TabsTrigger value="loja">Loja</TabsTrigger>
              <TabsTrigger value="sociais">Redes Sociais</TabsTrigger>
              <TabsTrigger value="plano">Plano</TabsTrigger>
              <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
            </TabsList>

            <TabsContent value="loja" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Dados da Loja</CardTitle>
                  <CardDescription>
                    Informações básicas sobre o seu negócio.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Loja</Label>
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={e => setFormData(p => ({...p, name: e.target.value}))} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="segment">Segmento/Nicho</Label>
                    <Input 
                      id="segment" 
                      value={formData.segment} 
                      onChange={e => setFormData(p => ({...p, segment: e.target.value}))} 
                      placeholder="Ex: Moda Feminina, Cosméticos..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ (Opcional)</Label>
                    <Input 
                      id="cnpj" 
                      value={formData.cnpj} 
                      onChange={e => setFormData(p => ({...p, cnpj: e.target.value}))} 
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                  <Button onClick={handleSaveStore} disabled={updateStore.isPending}>
                    Salvar Alterações
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Credenciais de Acesso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted p-2 rounded-full"><Mail className="w-4 h-4" /></div>
                      <div>
                        <p className="font-medium text-sm">E-mail</p>
                        <p className="text-sm text-muted-foreground">admin@sualoja.com.br</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Alterar</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-muted p-2 rounded-full"><Key className="w-4 h-4" /></div>
                      <div>
                        <p className="font-medium text-sm">Senha</p>
                        <p className="text-sm text-muted-foreground">Última alteração há 2 meses</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Alterar</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sociais" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contas Conectadas</CardTitle>
                  <CardDescription>
                    Vincule suas redes sociais para permitir a publicação automática.
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
                          {formData.instagramConnected ? "Conectado como @sualoja" : "Não conectado"}
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={formData.instagramConnected} 
                      onCheckedChange={() => handleToggleConnection('instagramConnected')}
                      disabled={updateStore.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400">
                        <Facebook className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">Facebook</p>
                        <p className="text-sm text-muted-foreground">
                          {formData.facebookConnected ? "Página vinculada" : "Não conectado"}
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={formData.facebookConnected} 
                      onCheckedChange={() => handleToggleConnection('facebookConnected')}
                      disabled={updateStore.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full text-slate-900 dark:text-slate-100">
                        <SiTiktok className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium">TikTok</p>
                        <p className="text-sm text-muted-foreground">
                          {formData.tiktokConnected ? "Conectado" : "Não conectado"}
                        </p>
                      </div>
                    </div>
                    <Switch 
                      checked={formData.tiktokConnected} 
                      onCheckedChange={() => handleToggleConnection('tiktokConnected')}
                      disabled={updateStore.isPending}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plano" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-primary shadow-sm relative overflow-hidden">
                  {store?.plan === 'free' && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Plano Atual
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>Plano Gratuito</CardTitle>
                    <CardDescription>Essencial para pequenas lojas</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold">R$ 0<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> 15 posts por mês</li>
                      <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> 1 Conta de cada rede</li>
                      <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-500" /> Analytics básico</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button variant={store?.plan === 'free' ? "outline" : "default"} className="w-full" disabled={store?.plan === 'free'}>
                      {store?.plan === 'free' ? "Seu Plano" : "Fazer Downgrade"}
                    </Button>
                  </CardFooter>
                </Card>

                <Card className="border-orange-500 shadow-md relative overflow-hidden">
                  {store?.plan === 'premium' && (
                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Plano Atual
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <CardTitle>Premium</CardTitle>
                      <Rocket className="w-5 h-5 text-orange-500" />
                    </div>
                    <CardDescription>Crescimento sem limites</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold">R$ 49<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2 font-medium"><Shield className="w-4 h-4 text-orange-500" /> Posts Ilimitados</li>
                      <li className="flex items-center gap-2 font-medium"><Shield className="w-4 h-4 text-orange-500" /> Múltiplas Contas</li>
                      <li className="flex items-center gap-2 font-medium"><Shield className="w-4 h-4 text-orange-500" /> Analytics Avançado & Relatórios</li>
                      <li className="flex items-center gap-2 font-medium"><Shield className="w-4 h-4 text-orange-500" /> Suporte Prioritário</li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className={`w-full ${store?.plan === 'premium' ? '' : 'bg-orange-600 hover:bg-orange-700 text-white'}`}
                      disabled={store?.plan === 'premium'}
                      onClick={() => toast.success("Processando upgrade...")}
                    >
                      {store?.plan === 'premium' ? "Gerenciar Assinatura" : "Fazer Upgrade Agora"}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="notificacoes" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Preferências de Notificação</CardTitle>
                  <CardDescription>Como e quando você quer ser avisado.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium border-b pb-2">Avisos por Email</h4>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Post publicado com sucesso</Label>
                        <p className="text-sm text-muted-foreground">Receba um aviso quando o agendamento for concluído.</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Falha na publicação</Label>
                        <p className="text-sm text-muted-foreground">Alerta crítico caso haja problemas de conexão.</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h4 className="text-sm font-medium border-b pb-2">Resumo e Relatórios</h4>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Resumo Semanal</Label>
                        <p className="text-sm text-muted-foreground">Estatísticas de engajamento toda segunda-feira.</p>
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