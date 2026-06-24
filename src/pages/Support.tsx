import { useState } from "react";
import type { FormEvent } from "react";
import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  ExternalLink,
  Instagram,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const SUPPORT_EMAIL = "socialpilotpro.oficial@gmail.com";
const SUPPORT_WHATSAPP_DISPLAY = "(92) 99391-1262";
const SUPPORT_WHATSAPP_NUMBER = "5592993911262";

const whatsappMessage =
  "Olá, equipe Social Pilot PRO! Preciso de atendimento para minha conta.";

const tutorialGuides = [
  {
    icon: Instagram,
    title: "Conectar Instagram e Facebook",
    description:
      "Passo a passo para conectar suas contas sociais autorizadas no Social Pilot PRO.",
    steps: [
      "Acesse Configurações no menu lateral.",
      "Clique em conectar Instagram ou Facebook.",
      "Autorize o acesso na conta correta.",
      "Volte ao painel e confirme se a conta aparece como conectada.",
    ],
  },
  {
    icon: CalendarCheck,
    title: "Criar e agendar um post",
    description:
      "Aprenda a preparar uma publicação e deixar o conteúdo agendado no calendário.",
    steps: [
      "Clique em Novo Post no Dashboard.",
      "Escreva a legenda e adicione a mídia.",
      "Escolha a rede social conectada.",
      "Defina data e horário, depois salve o agendamento.",
    ],
  },
  {
    icon: Settings,
    title: "Resolver falhas de publicação",
    description:
      "Checklist rápido para quando um post não for publicado corretamente.",
    steps: [
      "Confirme se a rede social ainda está conectada.",
      "Verifique se a imagem ou vídeo segue o formato permitido.",
      "Revise a data e o horário do agendamento.",
      "Reconecte a conta em Configurações e tente novamente.",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Planos, limites e Premium",
    description:
      "Entenda como acompanhar o uso mensal, limite de posts e ativação Premium.",
    steps: [
      "Veja o uso mensal no Dashboard.",
      "No plano gratuito, acompanhe o limite disponível.",
      "Ao ativar Premium, confira a data de expiração no Dashboard.",
      "Em caso de dúvida no plano, fale com o atendimento direto.",
    ],
  },
];

function buildMailToUrl({
  name,
  subject,
  message,
}: {
  name: string;
  subject: string;
  message: string;
}) {
  const finalSubject = subject.trim()
    ? `Suporte Social Pilot PRO - ${subject.trim()}`
    : "Suporte Social Pilot PRO";

  const body = [
    "Olá, equipe Social Pilot PRO!",
    "",
    `Nome: ${name.trim() || "Não informado"}`,
    `Assunto: ${subject.trim() || "Suporte"}`,
    "",
    "Mensagem:",
    message.trim(),
  ].join("\n");

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    finalSubject
  )}&body=${encodeURIComponent(body)}`;
}

export default function Support() {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const whatsappUrl = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  const emailUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Suporte Social Pilot PRO"
  )}`;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!message.trim()) {
      toast.error("Digite sua mensagem antes de enviar.");
      return;
    }

    window.location.href = buildMailToUrl({ name, subject, message });
    toast.success("Abrimos seu e-mail com a mensagem pronta para envio.");
  };

  const scrollToTutorials = () => {
    document
      .getElementById("central-de-tutoriais")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-bold text-primary">
            <Sparkles className="h-4 w-4" />
            Central oficial de suporte
          </div>

          <h1 className="mt-4 text-3xl font-bold tracking-tight">
            Suporte e Ajuda
          </h1>

          <p className="mt-1 text-muted-foreground">
            Estamos aqui para ajudar você a usar o Social Pilot PRO com mais
            segurança, organização e velocidade.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="flex flex-col items-center justify-center border-primary/20 bg-primary/5 p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
              <Phone className="h-6 w-6" />
            </div>

            <h3 className="mb-2 text-lg font-semibold">Atendimento Direto</h3>

            <p className="mb-2 text-sm text-muted-foreground">
              Fale com nossa equipe comercial ou suporte técnico pelo WhatsApp.
            </p>

            <p className="mb-4 text-sm font-bold text-green-700">
              {SUPPORT_WHATSAPP_DISPLAY}
            </p>

            <Button
              className="mt-auto w-full border-0 bg-green-600 text-white hover:bg-green-700"
              asChild
            >
              <a href={whatsappUrl} target="_blank" rel="noreferrer">
                <MessageSquare className="mr-2 h-4 w-4" />
                Falar pelo WhatsApp
              </a>
            </Button>
          </Card>

          <Card className="flex flex-col items-center justify-center p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
              <BookOpen className="h-6 w-6" />
            </div>

            <h3 className="mb-2 text-lg font-semibold">Central de Tutoriais</h3>

            <p className="mb-4 text-sm text-muted-foreground">
              Guias passo a passo para conectar contas, agendar posts e resolver
              falhas comuns.
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-auto w-full"
              onClick={scrollToTutorials}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Acessar Manuais
            </Button>
          </Card>

          <Card className="flex flex-col items-center justify-center p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
              <Mail className="h-6 w-6" />
            </div>

            <h3 className="mb-2 text-lg font-semibold">E-mail</h3>

            <p className="mb-4 text-sm text-muted-foreground">
              Para questões financeiras, documentos ou atendimento detalhado.
            </p>

            <a
              href={emailUrl}
              className="mb-4 break-all text-sm font-bold text-primary hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>

            <Button variant="outline" className="mt-auto w-full" asChild>
              <a href={emailUrl}>
                <Mail className="mr-2 h-4 w-4" />
                Enviar e-mail
              </a>
            </Button>
          </Card>
        </div>

        <div
          id="central-de-tutoriais"
          className="scroll-mt-8 rounded-lg border bg-card p-6 shadow-sm"
        >
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Central de Tutoriais
              </h2>

              <p className="mt-1 text-muted-foreground">
                Manuais rápidos para resolver as principais dúvidas sem sair do
                painel.
              </p>
            </div>

            <Button variant="outline" asChild>
              <a href={emailUrl}>
                Pedir novo tutorial
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {tutorialGuides.map((guide) => {
              const Icon = guide.icon;

              return (
                <Card key={guide.title} className="border-muted">
                  <CardHeader>
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>

                    <CardTitle className="text-lg">{guide.title}</CardTitle>
                    <CardDescription>{guide.description}</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <ol className="space-y-2">
                      {guide.steps.map((step, index) => (
                        <li key={step} className="flex gap-3 text-sm">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                            {index + 1}
                          </span>
                          <span className="text-muted-foreground">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-6 text-2xl font-bold tracking-tight">
              Dúvidas Frequentes
            </h2>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left font-medium">
                  Por que meu post falhou no Instagram?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Geralmente ocorre por desconexão da conta profissional, mídia
                  fora do formato permitido ou permissão expirada. Verifique a
                  aba Configurações e tente reconectar a conta.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left font-medium">
                  Como altero a data de um post agendado?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Vá até o Calendário ou Dashboard, abra o post desejado, clique
                  em editar, altere a data e o horário, depois salve novamente.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left font-medium">
                  O plano gratuito expira?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  O plano gratuito permanece ativo, mas possui limite de uso. O
                  painel mostra quantos posts ainda estão disponíveis no mês.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left font-medium">
                  Posso agendar vídeos no TikTok?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  A opção depende da integração e das permissões disponíveis
                  para sua conta. Quando a conta estiver conectada corretamente,
                  o painel indicará se o TikTok está ativo ou indisponível.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left font-medium">
                  A plataforma publica sem minha autorização?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  Não. O Social Pilot PRO só publica ou agenda conteúdos quando
                  o usuário cria, configura e confirma a ação dentro da
                  plataforma.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Envie uma Mensagem</CardTitle>
                <CardDescription>
                  Preencha o formulário e seu aplicativo de e-mail abrirá com a
                  mensagem pronta para envio.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Nome</label>
                      <Input
                        required
                        placeholder="Seu nome"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Assunto</label>
                      <Input
                        required
                        placeholder="Motivo do contato"
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mensagem</label>
                    <Textarea
                      required
                      placeholder="Detalhe sua dúvida ou problema..."
                      className="min-h-[150px]"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Mensagem
                  </Button>
                </form>

                <div className="mt-4 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span>
                      Para atendimento mais rápido, use o WhatsApp{" "}
                      <strong className="text-foreground">
                        {SUPPORT_WHATSAPP_DISPLAY}
                      </strong>
                      .
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
