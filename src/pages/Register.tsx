import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpWithEmail } from "@/lib/auth";
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
  LogIn,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const USER_EMAIL_KEY = "socialpilot_user_email";
const MASTER_ACCESS_KEY = "socialpilot_master_access";
const FREE_PLAN_POST_LIMIT = 3;
const FREE_TRIAL_DAYS = 3;

const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "Informe o nome da empresa ou responsável" }),

    email: z
      .string()
      .min(1, { message: "Informe seu e-mail" })
      .email({ message: "Informe um e-mail válido" }),

    password: z
      .string()
      .min(8, { message: "A senha precisa ter pelo menos 8 caracteres" }),

    confirmPassword: z.string().min(1, { message: "Confirme a senha" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const registerHighlights = [
  {
    icon: CalendarCheck,
    title: "Organize sua rotina",
    description: "Cadastre sua conta e comece a planejar posts com clareza.",
  },
  {
    icon: Send,
    title: "Publique com autorização",
    description: "O usuário cria, revisa e confirma cada publicação.",
  },
  {
    icon: ShieldCheck,
    title: "Comece com controle",
    description: "Plano gratuito com limite definido e painel simples de uso.",
  },
];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getFreeTrialDates() {
  const startedAt = new Date();
  const expiresAt = new Date(startedAt);

  expiresAt.setDate(expiresAt.getDate() + FREE_TRIAL_DAYS);

  return {
    free_started_at: startedAt.toISOString(),
    free_expires_at: expiresAt.toISOString(),
  };
}

async function saveFreeTrialDates(
  email: string,
  name: string,
  trialDates: ReturnType<typeof getFreeTrialDates>
) {
  const payload = {
    name,
    email,
    plan: "free",
    plan_status: "active",
    status: "active",
    is_blocked: false,
    posts_used: 0,
    posts_limit: FREE_PLAN_POST_LIMIT,
    ...trialDates,
  };

  const { data: updatedRows, error: updateError } = await supabase
    .from("companies")
    .update(payload)
    .eq("email", email)
    .select("id");

  if (!updateError && Array.isArray(updatedRows) && updatedRows.length > 0) {
    return trialDates;
  }

  const { error: insertError } = await supabase.from("companies").insert(payload);

  if (insertError) {
    console.warn("Não foi possível salvar o prazo gratuito na tabela companies:", {
      updateError,
      insertError,
    });
  }

  return trialDates;
}

export default function Register() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    document.title = "Cadastro | Social Pilot PRO";
  }, []);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const { innerWidth, innerHeight } = window;

    setParallax({
      x: (event.clientX / innerWidth - 0.5) * 18,
      y: (event.clientY / innerHeight - 0.5) * 18,
    });
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);

    try {
      const cleanEmail = normalizeEmail(values.email);
      const cleanName = values.name.trim();
      const trialDates = getFreeTrialDates();

      await signUpWithEmail(cleanEmail, values.password, {
        name: cleanName,
        companyName: cleanName,
        plan: "free",
        planStatus: "active",
        postsUsed: 0,
        postsLimit: FREE_PLAN_POST_LIMIT,
        freeStartedAt: trialDates.free_started_at,
        freeExpiresAt: trialDates.free_expires_at,
        free_started_at: trialDates.free_started_at,
        free_expires_at: trialDates.free_expires_at,
      } as any);

      await saveFreeTrialDates(cleanEmail, cleanName, trialDates);

      localStorage.setItem(USER_EMAIL_KEY, cleanEmail);
      localStorage.removeItem(MASTER_ACCESS_KEY);

      toast.success("Conta criada com sucesso!");
      setLocation("/dashboard");
    } catch (error: any) {
      console.error("Erro ao criar conta:", error);

      const message =
        error?.message === "User already registered"
          ? "Este e-mail já está cadastrado. Faça login ou use outro e-mail."
          : error?.message || "Não foi possível criar a conta. Tente novamente.";

      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="auth-page relative min-h-screen overflow-hidden bg-[#06115f] text-white"
      onMouseMove={handleMouseMove}
    >
      <style>{`
        .auth-page {
          background:
            radial-gradient(circle at 18% 18%, rgba(255, 106, 0, 0.24), transparent 24rem),
            radial-gradient(circle at 82% 12%, rgba(59, 130, 246, 0.34), transparent 28rem),
            radial-gradient(circle at 72% 78%, rgba(14, 165, 233, 0.18), transparent 26rem),
            linear-gradient(135deg, #050b3f 0%, #07166f 45%, #020617 100%);
        }

        .auth-grid {
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
          background-size: 72px 72px;
          -webkit-mask-image: radial-gradient(circle at center, black 0%, transparent 72%);
          mask-image: radial-gradient(circle at center, black 0%, transparent 72%);
        }

        .auth-rain-line {
          position: absolute;
          width: 2px;
          height: var(--rain-length);
          border-radius: 999px;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,0.82), transparent);
          transform: rotate(-28deg);
          animation: auth-rain-fall linear infinite;
          opacity: var(--rain-opacity);
        }

        @keyframes auth-rain-fall {
          0% {
            transform: translate3d(-18vw, -18vh, 0) rotate(-28deg);
          }
          100% {
            transform: translate3d(30vw, 118vh, 0) rotate(-28deg);
          }
        }

        .auth-rise {
          animation: auth-rise 0.78s ease both;
        }

        .auth-rise-delay-1 {
          animation-delay: 0.12s;
        }

        .auth-rise-delay-2 {
          animation-delay: 0.24s;
        }

        .auth-rise-delay-3 {
          animation-delay: 0.36s;
        }

        .auth-float {
          animation: auth-float 5.8s ease-in-out infinite;
        }

        .auth-pulse {
          animation: auth-pulse 2.8s ease-in-out infinite;
        }

        @keyframes auth-rise {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes auth-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes auth-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(255, 106, 0, 0.42);
          }
          50% {
            box-shadow: 0 0 0 14px rgba(255, 106, 0, 0);
          }
        }
      `}</style>

      <div className="auth-grid pointer-events-none absolute inset-0 opacity-70" />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {rainDrops.map((drop) => (
          <span
            key={drop.id}
            className="auth-rain-line"
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
              <Link href="/login" className="inline-flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Entrar
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-81px)] w-full max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:py-16">
        <section className="max-w-2xl">
          <div className="auth-rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-blue-100 backdrop-blur">
            <Sparkles className="h-4 w-4 text-orange-300" />
            Cadastro oficial do Social Pilot PRO
          </div>

          <h1 className="auth-rise auth-rise-delay-1 mt-6 text-4xl font-black leading-tight md:text-6xl">
            Crie sua conta e comece a organizar suas publicações.
          </h1>

          <p className="auth-rise auth-rise-delay-2 mt-6 max-w-xl text-lg leading-8 text-blue-100/90">
            Configure seu acesso para criar posts, conectar contas autorizadas,
            agendar conteúdos e acompanhar seu limite de uso em um painel
            simples.
          </p>

          <div className="auth-rise auth-rise-delay-3 mt-8 grid gap-4 sm:grid-cols-3">
            {registerHighlights.map((item) => {
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

        <section className="auth-rise auth-rise-delay-2">
          <div className="relative mx-auto w-full max-w-xl">
            <div className="auth-float absolute -left-5 -top-5 hidden rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white shadow-xl backdrop-blur md:block">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Comece grátis
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/20 bg-white/10 p-2 shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/95 p-6 text-slate-950 shadow-xl md:p-8">
                <div className="text-center">
                  <div className="auth-pulse mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#06115f] p-2 shadow-xl">
                    <img
                      src="/ícone_social_pilotpro.png"
                      alt="Logo oficial do Social Pilot PRO"
                      className="h-full w-full rounded-xl object-cover"
                    />
                  </div>

                  <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
                    <LockKeyhole className="h-3.5 w-3.5" />
                    Criar acesso
                  </p>

                  <h2 className="mt-4 text-3xl font-black tracking-tight">
                    Criar uma conta
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Informe seus dados para começar a usar o Social Pilot PRO.
                  </p>
                </div>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="mt-7 space-y-5"
                  >
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold">
                            Nome da empresa ou responsável
                          </FormLabel>

                          <FormControl>
                            <Input
                              placeholder="Minha Empresa"
                              autoComplete="organization"
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

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">Senha</FormLabel>

                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="Mínimo 8 caracteres"
                                  type={showPassword ? "text" : "password"}
                                  autoComplete="new-password"
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

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold">
                              Confirmar senha
                            </FormLabel>

                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="Repita a senha"
                                  type={
                                    showConfirmPassword ? "text" : "password"
                                  }
                                  autoComplete="new-password"
                                  disabled={isLoading}
                                  className="h-12 rounded-lg border-slate-200 bg-slate-50 pr-12 font-medium shadow-sm transition-all duration-300 focus-visible:ring-2 focus-visible:ring-blue-500"
                                  {...field}
                                />

                                <button
                                  type="button"
                                  onClick={() =>
                                    setShowConfirmPassword((value) => !value)
                                  }
                                  disabled={isLoading}
                                  className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                                  aria-label={
                                    showConfirmPassword
                                      ? "Ocultar confirmação de senha"
                                      : "Mostrar confirmação de senha"
                                  }
                                >
                                  {showConfirmPassword ? (
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
                    </div>

                    <Button
                      type="submit"
                      className="group h-12 w-full rounded-lg bg-[#06115f] text-base font-black text-white shadow-lg shadow-blue-950/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-orange-500/25"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        <>
                          Criar conta
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>

                <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                  <p className="text-sm text-slate-600">Já tem uma conta?</p>

                  <Button
                    variant="outline"
                    className="mt-3 w-full rounded-lg border-blue-200 font-black text-blue-700 transition-all duration-300 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700"
                    asChild
                  >
                    <Link href="/login">Fazer login</Link>
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
