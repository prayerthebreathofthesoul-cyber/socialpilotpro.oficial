import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageSquare, Phone, Mail, BookOpen, Send } from "lucide-react";
import { toast } from "sonner";

export default function Support() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Mensagem enviada! Nossa equipe responderá em breve.");
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suporte e Ajuda</h1>
          <p className="text-muted-foreground mt-1">Estamos aqui para garantir o sucesso da sua loja.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20 text-center p-6 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Phone className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Atendimento Direto</h3>
            <p className="text-sm text-muted-foreground mb-4">Fale com nossa equipe comercial ou suporte técnico pelo WhatsApp.</p>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white border-0 mt-auto">
              Falar pelo WhatsApp
            </Button>
          </Card>

          <Card className="text-center p-6 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-muted text-foreground flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Central de Tutoriais</h3>
            <p className="text-sm text-muted-foreground mb-4">Guias passo a passo sobre como conectar contas e melhores práticas.</p>
            <Button variant="outline" className="w-full mt-auto">
              Acessar Manuais
            </Button>
          </Card>

          <Card className="text-center p-6 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-muted text-foreground flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2">E-mail</h3>
            <p className="text-sm text-muted-foreground mb-4">Para questões financeiras ou envios de documentos.</p>
            <p className="text-sm font-medium mt-auto">suporte@socialpilot.mini</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-6">Dúvidas Frequentes</h2>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left font-medium">Por que meu post falhou no Instagram?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Geralmente ocorre por desconexão da conta corporativa ou se a imagem não seguir as proporções permitidas pelo Instagram (mínimo 4:5, máximo 1.91:1). Verifique a aba Configurações e tente reconectar.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left font-medium">Como altero a data de um post agendado?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Vá até o Calendário ou Dashboard, clique no botão de opções (três pontos) no card do post e escolha "Editar". Altere a data/hora e salve novamente.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left font-medium">O plano gratuito expira?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Não, o plano gratuito é vitalício, porém limitado a 15 postagens por mês. Ideal para iniciar e testar o funcionamento da plataforma.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left font-medium">Posso agendar vídeos no TikTok?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Sim! Certifique-se de que sua conta TikTok conectada seja uma conta "Business/Creator" para ter acesso total à API de publicação.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left font-medium">A plataforma encurta links automaticamente?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  No momento não encurtamos links automaticamente nas legendas. Sugerimos utilizar serviços externos ou colocar o link na Bio da sua loja.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Envie uma Mensagem</CardTitle>
                <CardDescription>Preencha o formulário e responderemos via e-mail.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome</label>
                      <Input required placeholder="Seu nome" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assunto</label>
                      <Input required placeholder="Motivo do contato" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mensagem</label>
                    <Textarea required placeholder="Detalhe sua dúvida ou problema..." className="min-h-[150px]" />
                  </div>
                  <Button type="submit" className="w-full">
                    <Send className="mr-2 h-4 w-4" /> Enviar Mensagem
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}