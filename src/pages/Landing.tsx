import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Link2,
  LockKeyhole,
  LogIn,
  PenLine,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

const features = [
  {
    icon: PenLine,
    title: "Criação de conteúdos",
    description:
      "Crie posts, legendas, ideias de campanhas e organize conteúdos para suas redes sociais em um só painel.",
  },
  {
    icon: CalendarCheck,
    title: "Agendamento de publicações",
    description:
      "Planeje datas e horários para manter uma frequência profissional de publicações.",
  },
  {
    icon: ShieldCheck,
    title: "Publicação autorizada",
    description:
      "O Social Pilot PRO só publica quando o usuário conecta uma conta autorizada e confirma a ação.",
  },
];

const steps = [
  "O usuário entra no Social Pilot PRO.",
  "Conecta suas contas sociais pelo fluxo de autorização.",
  "Cria ou envia o conteúdo que deseja publicar.",
  "Escolhe publicar agora ou agendar para depois.",
  "Confirma a ação dentro da plataforma.",
];

const faq = [
  {
    question: "O Social Pilot PRO publica sozinho?",
    answer:
      "Não. O Social Pilot PRO não publica nada sem ação do usuário. Toda publicação ou agendamento precisa ser criado, configurado e confirmado dentro da plataforma.",
  },
  {
    question: "Para que serve o Social Pilot PRO?",
    answer:
      "Ele serve para criar, organizar, agendar e publicar conteúdos autorizados em redes sociais, ajudando criadores, empresas e empreendedores a manterem uma rotina de postagens.",
  },
  {
    question: "Preciso conectar minhas redes sociais?",
    answer:
      "Sim, para publicar ou agendar em uma rede social, o usuário precisa conectar uma conta autorizada e permitir o acesso necessário.",
  },
  {
    question: "Posso revisar o conteúdo antes de publicar?",
    answer:
      "Sim. O usuário cria o post, revisa as informações, escolhe a conta conectada e confirma se deseja publicar ou agendar.",
  },
];

function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.18 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-700 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function Landing() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    document.title = "Social Pilot PRO | Crie, agende e publique conteúdos";
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <a href="/" className="flex items-center gap-3 text-lg font-black">
            <img
              src="/ícone_social_pilotpro.png"
              alt="Logo oficial do Social Pilot PRO"
              className="h-12 w-12 rounded-lg object-cover"
            />
            <span>Social Pilot PRO</span>
          </a>

          <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-600">
            <a href="#recursos" className="hover:text-blue-600">
              Recursos
            </a>
            <a href="#como-funciona" className="hover:text-blue-600">
              Como funciona
            </a>
            <a href="#faq" className="hover:text-blue-600">
              FAQ
            </a>
            <a href="/privacy" className="hover:text-blue-600">
              Política de Privacidade
            </a>
            <a href="/terms" className="hover:text-blue-600">
              Termos de Uso
            </a>

            <div className="flex items-center gap-2">
              <a
                href="/login"
                className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-900 hover:border-blue-600 hover:text-blue-600"
              >
                Entrar
              </a>

              <a
                href="/register"
                className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700"
              >
                Cadastre-se
              </a>
            </div>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-blue-50 via-white to-white px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <Reveal>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700">
              <Sparkles className="h-4 w-4" />
              Plataforma oficial do Social Pilot PRO
            </p>

            <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
              Crie, agende e publique conteúdos autorizados para suas redes
              sociais.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
              O Social Pilot PRO ajuda criadores, empresas e empreendedores a
              organizar sua presença digital com um painel simples para preparar
              posts, conectar contas autorizadas, agendar publicações e publicar
              conteúdos confirmados pelo próprio usuário.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
              >
                <UserPlus className="h-5 w-5" />
                Cadastre-se grátis
              </a>

              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-bold text-slate-900 hover:border-blue-600 hover:text-blue-600"
              >
                <LogIn className="h-5 w-5" />
                Entrar
              </a>

              <a
                href="#como-funciona"
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-bold text-slate-900 hover:border-blue-600 hover:text-blue-600"
              >
                Ver como funciona
              </a>
            </div>

            <p className="mt-6 flex max-w-3xl gap-2 text-sm leading-6 text-slate-600">
              <LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-blue-600" />
              O sistema não publica nada sem autorização. O usuário cria,
              revisa, seleciona a conta conectada e confirma a publicação ou o
              agendamento.
            </p>
          </Reveal>

          <div
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl transition-transform duration-300"
            style={{ transform: `translateY(${scrollY * 0.04}px)` }}
          >
            <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
              <span className="font-bold text-slate-700">Painel de conteúdo</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                Autorizado
              </span>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex items-center gap-2 font-bold">
                  <FileText className="h-5 w-5 text-blue-600" />
                  Criar postagem
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  Escreva legenda, adicione mídia e prepare o conteúdo.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-2 flex items-center gap-2 font-bold">
                  <Link2 className="h-5 w-5 text-blue-600" />
                  Conta conectada
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  Escolha uma conta social previamente autorizada.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-blue-50 p-4 text-center font-bold text-blue-700">
                  <Clock3 className="mx-auto mb-2 h-5 w-5" />
                  Agendar
                </div>
                <div className="rounded-lg bg-blue-50 p-4 text-center font-bold text-blue-700">
                  <Send className="mx-auto mb-2 h-5 w-5" />
                  Publicar
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="px-6 py-20">
        <Reveal className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-black md:text-4xl">
            O que o Social Pilot PRO faz
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">
            A plataforma centraliza as principais etapas da rotina de conteúdo:
            criação, organização, agendamento e publicação autorizada.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">{feature.title}</h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </Reveal>
      </section>

      <section id="como-funciona" className="bg-slate-50 px-6 py-20">
        <Reveal className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-black md:text-4xl">
            Como funciona o fluxo de publicação
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {steps.map((step, index) => (
              <div key={step} className="rounded-lg bg-white p-5 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-black text-white">
                  {index + 1}
                </div>
                <p className="leading-7 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-6 py-20">
        <Reveal className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-6">
            <Users className="mb-4 h-7 w-7 text-blue-600" />
            <h3 className="text-xl font-bold">Para criadores e empresas</h3>
            <p className="mt-3 leading-7 text-slate-600">
              Ideal para quem precisa manter redes sociais ativas com mais
              organização e controle.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-6">
            <CheckCircle2 className="mb-4 h-7 w-7 text-blue-600" />
            <h3 className="text-xl font-bold">Controle do usuário</h3>
            <p className="mt-3 leading-7 text-slate-600">
              Cada ação depende da escolha e confirmação do usuário dentro da
              plataforma.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 p-6">
            <ShieldCheck className="mb-4 h-7 w-7 text-blue-600" />
            <h3 className="text-xl font-bold">Links legais visíveis</h3>
            <p className="mt-3 leading-7 text-slate-600">
              Política de Privacidade e Termos de Uso ficam disponíveis para
              consulta pública.
            </p>
          </div>
        </Reveal>
      </section>

      <section id="faq" className="bg-slate-50 px-6 py-20">
        <Reveal className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-black md:text-4xl">
            Perguntas frequentes
          </h2>

          <div className="mt-8 space-y-4">
            {faq.map((item) => (
              <details
                key={item.question}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                <summary className="cursor-pointer font-bold text-slate-900">
                  {item.question}
                </summary>
                <p className="mt-3 leading-7 text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="px-6 py-20">
        <Reveal className="mx-auto max-w-7xl rounded-lg bg-slate-950 p-8 text-white md:p-12">
          <h2 className="text-3xl font-black">
            Comece agora no Social Pilot PRO
          </h2>
          <p className="mt-4 max-w-3xl leading-8 text-slate-300">
            Cadastre-se para criar posts, organizar conteúdos, agendar
            publicações e publicar conteúdos autorizados em contas conectadas.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
            >
              <UserPlus className="h-5 w-5" />
              Criar minha conta
            </a>

            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-5 py-3 font-bold text-white hover:border-white"
            >
              <LogIn className="h-5 w-5" />
              Já tenho conta
            </a>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-slate-200 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>© 2026 Social Pilot PRO. Todos os direitos reservados.</span>

          <div className="flex flex-wrap gap-4 font-bold">
            <a href="/privacy" className="hover:text-blue-600">
              Política de Privacidade
            </a>
            <a href="/terms" className="hover:text-blue-600">
              Termos de Uso
            </a>
            <a href="/register" className="hover:text-blue-600">
              Cadastre-se
            </a>
            <a href="/login" className="hover:text-blue-600">
              Entrar
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
