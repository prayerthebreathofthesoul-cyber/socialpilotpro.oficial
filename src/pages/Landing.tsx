import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowRight,
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

  const rainDrops = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => ({
        id: index,
        left: `${(index * 17) % 100}%`,
        top: `${(index * 23) % 100}%`,
        delay: `${-(index * 0.19)}s`,
        duration: `${2.8 + (index % 8) * 0.28}s`,
        opacity: 0.2 + (index % 6) * 0.07,
        length: `${52 + (index % 7) * 16}px`,
      })),
    []
  );

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
    <main className="landing-page relative min-h-screen overflow-hidden bg-[#06115f] text-white">
      <style>{`
        .landing-page {
          background:
            radial-gradient(circle at 18% 10%, rgba(255, 106, 0, 0.25), transparent 25rem),
            radial-gradient(circle at 82% 12%, rgba(59, 130, 246, 0.34), transparent 28rem),
            radial-gradient(circle at 70% 58%, rgba(14, 165, 233, 0.16), transparent 30rem),
            linear-gradient(135deg, #050b3f 0%, #07166f 45%, #020617 100%);
        }

        .landing-grid {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
          background-size: 72px 72px;
          -webkit-mask-image: radial-gradient(circle at center, black 0%, transparent 74%);
          mask-image: radial-gradient(circle at center, black 0%, transparent 74%);
        }

        .landing-rain-line {
          position: absolute;
          width: 2px;
          height: var(--rain-length);
          border-radius: 999px;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,0.82), transparent);
          transform: rotate(-28deg);
          animation: landing-rain-fall linear infinite;
          opacity: var(--rain-opacity);
        }

        @keyframes landing-rain-fall {
          0% {
            transform: translate3d(-18vw, -18vh, 0) rotate(-28deg);
          }
          100% {
            transform: translate3d(30vw, 118vh, 0) rotate(-28deg);
          }
        }

        .landing-rise {
          animation: landing-rise 0.78s ease both;
        }

        .landing-rise-delay-1 {
          animation-delay: 0.12s;
        }

        .landing-rise-delay-2 {
          animation-delay: 0.24s;
        }

        .landing-rise-delay-3 {
          animation-delay: 0.36s;
        }

        .landing-float {
          animation: landing-float 5.8s ease-in-out infinite;
        }

        .landing-pulse {
          animation: landing-pulse 2.8s ease-in-out infinite;
        }

        @keyframes landing-rise {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes landing-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes landing-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(255, 106, 0, 0.42);
          }
          50% {
            box-shadow: 0 0 0 14px rgba(255, 106, 0, 0);
          }
        }
      `}</style>

      <div className="landing-grid pointer-events-none fixed inset-0 opacity-70" />

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {rainDrops.map((drop) => (
          <span
            key={drop.id}
            className="landing-rain-line"
            style={
              {
                left: drop.left,
                top: drop.top,
                animationDelay: drop.delay,
                animationDuration: drop.duration,
                "--rain-opacity": drop.opacity,
                "--rain-length": drop.length,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div
        className="pointer-events-none fixed -left-24 top-28 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl transition-transform duration-300"
        style={{
          transform: `translate3d(${scrollY * 0.02}px, ${
            scrollY * 0.01
          }px, 0)`,
        }}
      />

      <div
        className="pointer-events-none fixed -right-20 bottom-12 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl transition-transform duration-300"
        style={{
          transform: `translate3d(${-scrollY * 0.02}px, ${
            -scrollY * 0.01
          }px, 0)`,
        }}
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-white/[0.08] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <a href="/" className="group flex items-center gap-3 text-lg font-black">
            <img
              src="/ícone_social_pilotpro.png"
              alt="Logo oficial do Social Pilot PRO"
              className="h-12 w-12 rounded-lg object-cover shadow-lg shadow-orange-500/25 transition-transform duration-300 group-hover:scale-105"
            />
            <span>Social Pilot PRO</span>
          </a>

          <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-blue-100/85">
            <a href="#recursos" className="hover:text-white">
              Recursos
            </a>
            <a href="#como-funciona" className="hover:text-white">
              Como funciona
            </a>
            <a href="#faq" className="hover:text-white">
              FAQ
            </a>
            <a href="/privacy" className="hover:text-white">
              Política de Privacidade
            </a>
            <a href="/terms" className="hover:text-white">
              Termos de Uso
            </a>

            <div className="flex items-center gap-2">
              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-bold text-white transition-all duration-300 hover:bg-white hover:text-[#06115f]"
              >
                <LogIn className="h-4 w-4" />
                Entrar
              </a>

              <a
                href="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-500"
              >
                <UserPlus className="h-4 w-4" />
                Cadastre-se
              </a>
            </div>
          </nav>
        </div>
      </header>

      <section className="relative z-10 px-6 py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[1.05fr_0.95fr] md:items-center">
          <Reveal>
            <p className="landing-rise mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-blue-100 backdrop-blur">
              <Sparkles className="h-4 w-4 text-orange-300" />
              Plataforma oficial do Social Pilot PRO
            </p>

            <h1 className="landing-rise landing-rise-delay-1 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
              Crie, agende e publique conteúdos autorizados para suas redes
              sociais.
            </h1>

            <p className="landing-rise landing-rise-delay-2 mt-6 max-w-3xl text-lg leading-8 text-blue-100/90">
              O Social Pilot PRO ajuda criadores, empresas e empreendedores a
              organizar sua presença digital com um painel simples para preparar
              posts, conectar contas autorizadas, agendar publicações e publicar
              conteúdos confirmados pelo próprio usuário.
            </p>

            <div className="landing-rise landing-rise-delay-3 mt-8 flex flex-wrap gap-3">
              <a
                href="/register"
                className="group inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-500"
              >
                <UserPlus className="h-5 w-5" />
                Cadastre-se grátis
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>

              <a
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-3 font-bold text-white backdrop-blur transition-all duration-300 hover:bg-white hover:text-[#06115f]"
              >
                <LogIn className="h-5 w-5" />
                Entrar
              </a>

              <a
                href="#como-funciona"
                className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 font-bold text-white backdrop-blur transition-all duration-300 hover:bg-white hover:text-[#06115f]"
              >
                Ver como funciona
              </a>
            </div>

            <p className="mt-6 flex max-w-3xl gap-2 text-sm leading-6 text-blue-100/75">
              <LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-orange-300" />
              O sistema não publica nada sem autorização. O usuário cria,
              revisa, seleciona a conta conectada e confirma a publicação ou o
              agendamento.
            </p>
          </Reveal>

          <div className="landing-float rounded-[2rem] border border-white/20 bg-white/10 p-2 shadow-2xl shadow-black/30 backdrop-blur-2xl">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/95 p-5 text-slate-950 shadow-xl">
              <div className="mb-5 flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="landing-pulse flex h-12 w-12 items-center justify-center rounded-xl bg-[#06115f] p-1.5">
                    <img
                      src="/ícone_social_pilotpro.png"
                      alt="Logo oficial do Social Pilot PRO"
                      className="h-full w-full rounded-lg object-cover"
                    />
                  </div>

                  <span className="font-black text-slate-800">
                    Painel de conteúdo
                  </span>
                </div>

                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  Autorizado
                </span>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <div className="mb-2 flex items-center gap-2 font-bold">
                    <FileText className="h-5 w-5 text-blue-700" />
                    Criar postagem
                  </div>

                  <p className="text-sm leading-6 text-slate-600">
                    Escreva legenda, adicione mídia e prepare o conteúdo.
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <div className="mb-2 flex items-center gap-2 font-bold">
                    <Link2 className="h-5 w-5 text-blue-700" />
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

                  <div className="rounded-lg bg-orange-50 p-4 text-center font-bold text-orange-700">
                    <Send className="mx-auto mb-2 h-5 w-5" />
                    Publicar
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="relative z-10 px-6 py-20">
        <Reveal className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-black md:text-4xl">
            O que o Social Pilot PRO faz
          </h2>

          <p className="mt-4 max-w-3xl text-lg leading-8 text-blue-100/75">
            A plataforma centraliza as principais etapas da rotina de conteúdo:
            criação, organização, agendamento e publicação autorizada.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-lg border border-white/15 bg-white/10 p-6 shadow-xl backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/15"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-500/20 text-orange-200">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-xl font-bold">{feature.title}</h3>

                  <p className="mt-3 leading-7 text-blue-100/75">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </Reveal>
      </section>

      <section id="como-funciona" className="relative z-10 px-6 py-20">
        <Reveal className="mx-auto max-w-7xl rounded-[2rem] border border-white/15 bg-white/10 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-10">
          <h2 className="text-3xl font-black md:text-4xl">
            Como funciona o fluxo de publicação
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {steps.map((step, index) => (
              <div
                key={step}
                className="rounded-lg border border-white/10 bg-white/10 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/15"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-orange-600 font-black text-white">
                  {index + 1}
                </div>

                <p className="leading-7 text-blue-100/80">{step}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="relative z-10 px-6 py-20">
        <Reveal className="mx-auto grid max-w-7xl gap-8 md:grid-cols-3">
          <div className="rounded-lg border border-white/15 bg-white/10 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/15">
            <Users className="mb-4 h-7 w-7 text-orange-300" />

            <h3 className="text-xl font-bold">Para criadores e empresas</h3>

            <p className="mt-3 leading-7 text-blue-100/75">
              Ideal para quem precisa manter redes sociais ativas com mais
              organização e controle.
            </p>
          </div>

          <div className="rounded-lg border border-white/15 bg-white/10 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/15">
            <CheckCircle2 className="mb-4 h-7 w-7 text-emerald-300" />

            <h3 className="text-xl font-bold">Controle do usuário</h3>

            <p className="mt-3 leading-7 text-blue-100/75">
              Cada ação depende da escolha e confirmação do usuário dentro da
              plataforma.
            </p>
          </div>

          <div className="rounded-lg border border-white/15 bg-white/10 p-6 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/15">
            <ShieldCheck className="mb-4 h-7 w-7 text-blue-200" />

            <h3 className="text-xl font-bold">Links legais visíveis</h3>

            <p className="mt-3 leading-7 text-blue-100/75">
              Política de Privacidade e Termos de Uso ficam disponíveis para
              consulta pública.
            </p>
          </div>
        </Reveal>
      </section>

      <section id="faq" className="relative z-10 px-6 py-20">
        <Reveal className="mx-auto max-w-4xl">
          <h2 className="text-3xl font-black md:text-4xl">
            Perguntas frequentes
          </h2>

          <div className="mt-8 space-y-4">
            {faq.map((item) => (
              <details
                key={item.question}
                className="rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur transition-all duration-300 open:bg-white/[0.14]"
              >
                <summary className="cursor-pointer font-bold text-white">
                  {item.question}
                </summary>

                <p className="mt-3 leading-7 text-blue-100/75">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="relative z-10 px-6 py-20">
        <Reveal className="mx-auto max-w-7xl rounded-[2rem] border border-white/15 bg-white/10 p-8 text-white shadow-2xl shadow-black/20 backdrop-blur-xl md:p-12">
          <h2 className="text-3xl font-black">
            Comece agora no Social Pilot PRO
          </h2>

          <p className="mt-4 max-w-3xl leading-8 text-blue-100/75">
            Cadastre-se para criar posts, organizar conteúdos, agendar
            publicações e publicar conteúdos autorizados em contas conectadas.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-500"
            >
              <UserPlus className="h-5 w-5" />
              Criar minha conta
            </a>

            <a
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-3 font-bold text-white transition-all duration-300 hover:bg-white hover:text-[#06115f]"
            >
              <LogIn className="h-5 w-5" />
              Já tenho conta
            </a>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-blue-100/75 md:flex-row md:items-center md:justify-between">
          <span>© 2026 Social Pilot PRO. Todos os direitos reservados.</span>

          <div className="flex flex-wrap gap-4 font-bold">
            <a href="/privacy" className="hover:text-white">
              Política de Privacidade
            </a>
            <a href="/terms" className="hover:text-white">
              Termos de Uso
            </a>
            <a href="/register" className="hover:text-white">
              Cadastre-se
            </a>
            <a href="/login" className="hover:text-white">
              Entrar
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
