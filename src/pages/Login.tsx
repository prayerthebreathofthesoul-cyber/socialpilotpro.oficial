import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInWithEmail, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Home,
  Loader2,
  LockKeyhole,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Informe seu e-mail" })
    .email({ message: "Informe um e-mail válido" }),
  password: z.string().min(1, { message: "Informe sua senha" }),
});

const loginHighlights = [
  {
    icon: CalendarCheck,
    title: "Agende com precisão",
    description: "Organize posts, datas e horários em um painel profissional.",
  },
  {
    icon: Send,
    title: "Publique com controle",
    description: "Toda publicação depende da confirmação do próprio usuário.",
  },
  {
    icon: ShieldCheck,
    title: "Acesso protegido",
    description: "Contas bloqueadas são barradas antes de entrar no sistema.",
  },
];

type CompanyAccess = {
  id?: string;
  plan?: string | null;
  status?: string | null;
  plan_status?: string | null;
  is_blocked?: boolean | null;
  free_expires_at?: string | null;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

async function syncExpiredFreeCompanies() {
  const { error } = await supabase.rpc("block_expired_free_companies");

  if (error) {
    console.warn("Não foi possível sincronizar contas gratuitas vencidas:", error);
  }
}

function isFreeTrialExpired(company?: CompanyAccess | null) {
  if (!company || company.plan !== "free" || !company.free_expires_at) {
    return false;
  }

  const expiresAt = new Date(company.free_expires_at);

  if (Number.isNaN(expiresAt.getTime())) {
    return false;
  }

  return expiresAt.getTime() <= Date.now();
}

async function blockExpiredFreeCompany(company: CompanyAccess, email: string) {
  const payload = {
    plan_status: "blocked",
    status: "blocked",
    is_blocked: true,
  };

  const { error } = company.id
    ? await supabase.from("companies").update(payload).eq("id", company.id)
    : await supabase.from("companies").update(payload).eq("email", email);

  if (error) {
    console.warn(
      "O acesso gratuito venceu, mas o Supabase não permitiu salvar o bloqueio:",
      error
    );
  }
}

async function checkCompanyBlocked(email: string) {
  const cleanEmail = normalizeEmail(email);

  await syncExpiredFreeCompanies();

  const { data, error } = await supabase
    .from("companies")
    .select("id, plan, plan_status, status, is_blocked, free_expires_at")
    .eq("email", cleanEmail)
    .limit(1);

  if (error) {
    throw error;
  }

  const company = data?.[0] as CompanyAccess | undefined;

  const alreadyBlocked =
    company?.is_blocked === true ||
    company?.plan_status === "blocked" ||
    company?.status === "blocked";

  if (alreadyBlocked) {
    return {
      blocked: true,
      reason: "blocked" as const,
    };
  }

  if (isFreeTrialExpired(company)) {
    await blockExpiredFreeCompany(company, cleanEmail);

    return {
      blocked: true,
      reason: "free_expired" as const,
    };
  }

  return {
    blocked: false,
    reason: null,
  };
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const rainDrops = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => ({
        id: index,
        left: `${(index * 17) % 100}%`,
        top: `${(index * 23) % 100}%`,
        delay: `${-(index * 0.19)}s`,
        duration: `${2.8 + (index % 8) * 0.28}s`,
        opacity: 0.22 + (index % 6) * 0.08,
        length: `${52 + (index % 7) * 16}px`,
      })),
    []
  );

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    document.title = "Login | Social Pilot PRO";
  }, []);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const { innerWidth, innerHeight } = window;

    setParallax({
      x: (event.clientX / innerWidth - 0.5) * 18,
      y: (event.clientY / innerHeight - 0.5) * 18,
    });
  };

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);

    try {
      const cleanEmail = normalizeEmail(values.email);

      await signInWithEmail(cleanEmail, values.password);

      const access = await checkCompanyBlocked(cleanEmail);

      if (access.blocked) {
        await signOut();

        toast.error(
          access.reason === "free_expired"
            ? "Seu acesso gratuito de 3 dias expirou. Ative o Premium para continuar usando."
            : "Conta bloqueada. Entre em contato com o suporte."
        );

        return;
      }

      localStorage.setItem("socialpilot_user_email", cleanEmail);

      toast.success("Login realizado com sucesso!");
      setLocation("/dashboard");
    } catch (error: any) {
      console.error(error);

      await signOut();

      const message =
        error?.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : "Não foi possível fazer login. Verifique seus dados e tente novamente.";

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="login-page relative min-h-screen overflow-hidden bg-[#06115f] text-white"
      onMouseMove={handleMouseMove}
    >
      <style>{`
        .login-page {
          background:
            radial-gradient(circle at 18% 18%, rgba(255, 106, 0, 0.24), transparent 24rem),
            radial-gradient(circle at 82% 12%, rgba(59, 130, 246, 0.34), transparent 28rem),
            radial-gradient(circle at 72% 78%, rgba(14, 165, 233, 0.18), transparent 26rem),
            linear-gradient(135deg, #050b3f 0%, #07166f 45%, #020617 100%);
        }

        .login-grid {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
          background-size: 72px 72px;
          -webkit-mask-image: radial-gradient(circle at center, black 0%, transparent 72%);
          mask-image: radial-gradient(circle at center, black 0%, transparent 72%);
        }

        .login-rain-line {
          position: absolute;
          width: 2px;
          height: var(--rain-length);
          border-radius: 999px;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,0.82), transparent);
          transform: rotate(-28deg);
          animation: login-rain-fall linear infinite;
          opacity: var(--rain-opacity);
        }

        @keyframes login-rain-fall {
          0% {
            transform: translate3d(-18vw, -18vh, 0) rotate(-28deg);
          }
          100% {
            transform: translate3d(30vw, 118vh, 0) rotate(-28deg);
          }
        }

        .login-rise {
          animation: login-rise 0.78s ease both;
        }

        .login-rise-delay-1 {
          animation-delay: 0.12s;
        }

        .login-rise-delay-2 {
          animation-delay: 0.24s;
        }

        .login-rise-delay-3 {
          animation-delay: 0.36s;
        }

        .login-float {
          animation: login-float 5.8s ease-in-out infinite;
        }

        .login-pulse {
          animation: login-pulse 2.8s ease-in-out infinite;
        }

        @keyframes login-rise {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes login-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes login-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(255, 106, 0, 0.42);
          }
          50% {
            box-shadow: 0 0 0 14px rgba(255, 106, 0, 0);
          }
        }
      `}</style>

      <div className="login-grid pointer-events-none absolute inset-0 opacity-70" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {rainDrops.map((drop) => (
          <span
            key={drop.id}
            className="login-rain-line"
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
        className="pointer-events-none absolute -left-24 top-28 h-72 w-72 rounded-full bg-orange-500/25 blur-3xl transition-transform duration-300"
        style={{
          transform: `translate3d(${parallax.x}px, ${parallax.y}px, 0)`,
        }}
      />

      <div
        className="pointer-events-none absolute -right-20 bottom-12 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl transition-transform duration-300"
        style={{
          transform: `translate3d(${-parallax.x}px, ${-parallax.y}px, 0)`,
        }}
      />

      <header className="relative z-20 border-b border-white/10 bg-white/[0.08] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            className="group flex items-center gap-3 text-lg font-black"
          >
            <img
              src="/ícone_social_pilotpro.png"
              alt="Logo oficial do Social Pilot PRO"
              className="h-12 w-12 rounded-lg object-cover shadow-lg shadow-orange-500/25 transition-transform duration-300 group-hover:scale-105"
            />
            <span>Social Pilot PRO</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              asChild
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/" className="inline-flex items-center gap-2">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </Button>

            <Button
              variant="outline"
              asChild
              className="border-white/20 bg-white/10 text-white hover:bg-white hover:text-[#06115f]"
            >
              <Link href="/register" className="inline-flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Cadastre-se
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-81px)] w-full max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <section className="max-w-2xl">
          <div className="login-rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-blue-100 backdrop-blur">
            <Sparkles className="h-4 w-4 text-orange-300" />
            Plataforma oficial para organizar suas redes sociais
          </div>

          <h1 className="login-rise login-rise-delay-1 mt-6 text-4xl font-black leading-tight md:text-6xl">
            Entre no seu painel e mantenha seus posts em movimento.
          </h1>

          <p className="login-rise login-rise-delay-2 mt-6 max-w-xl text-lg leading-8 text-blue-100/90">
            Acesse o Social Pilot PRO para criar, agendar e publicar conteúdos
            autorizados com mais controle, clareza e velocidade.
          </p>

          <div className="login-rise login-rise-delay-3 mt-8 grid gap-4 sm:grid-cols-3">
            {loginHighlights.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-lg border border-white/10 bg-white/10 p-4 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:bg-white/15"
                >
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/20 text-orange-200">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h2 className="text-sm font-black">{item.title}</h2>

                  <p className="mt-2 text-xs leading-5 text-blue-100/75">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="login-rise login-rise-delay-2">
          <div className="relative mx-auto w-full max-w-md">
            <div className="login-float absolute -left-5 -top-5 hidden rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white shadow-xl backdrop-blur md:block">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Login seguro
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/20 bg-white/10 p-2 shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/95 p-6 text-slate-950 shadow-xl md:p-8">
                <div className="text-center">
                  <div className="login-pulse mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#06115f] p-2 shadow-xl">
                    <img
                      src="/ícone_social_pilotpro.png"
                      alt="Logo oficial do Social Pilot PRO"
                      className="h-full w-full rounded-xl object-cover"
                    />
                  </div>

                  <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    Acesso ao painel
                  </p>

                  <h2 className="mt-4 text-3xl font-black tracking-tight">
                    Bem-vindo de volta
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Entre na sua conta para continuar criando, agendando e
                    acompanhando suas publicações.
                  </p>
                </div>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="mt-7 space-y-5"
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">E-mail</FormLabel>

                          <FormControl>
                            <Input
                              placeholder="seu@email.com"
                              type="email"
                              autoComplete="email"
                              disabled={isLoading}
                              className="h-12 rounded-lg border-slate-200 bg-slate-50 font-medium shadow-sm transition-all duration-300 focus-visible:ring-2 focus-visible:ring-blue-500"
                              {...field}
                            />
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between gap-3">
                            <FormLabel className="font-bold">Senha</FormLabel>

                            <button
                              type="button"
                              className="text-sm font-bold text-blue-700 hover:text-orange-600 hover:underline"
                              onClick={() =>
                                toast.info(
                                  "A recuperação de senha será configurada no próximo passo."
                                )
                              }
                            >
                              Esqueci minha senha
                            </button>
                          </div>

                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Digite sua senha"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                disabled={isLoading}
                                className="h-12 rounded-lg border-slate-200 bg-slate-50 pr-12 font-medium shadow-sm transition-all duration-300 focus-visible:ring-2 focus-visible:ring-blue-500"
                                {...field}
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  setShowPassword((value) => !value)
                                }
                                disabled={isLoading}
                                className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label={
                                  showPassword
                                    ? "Ocultar senha"
                                    : "Mostrar senha"
                                }
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </FormControl>

                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="group h-12 w-full rounded-lg bg-[#06115f] text-base font-black text-white shadow-lg shadow-blue-950/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-orange-500/25"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          Entrar no painel
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-sm text-slate-600">
                    Ainda não tem uma conta?
                  </p>

                  <Button
                    variant="outline"
                    className="mt-3 w-full rounded-lg border-blue-200 font-black text-blue-700 transition-all duration-300 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700"
                    asChild
                  >
                    <Link href="/register">Criar conta agora</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
