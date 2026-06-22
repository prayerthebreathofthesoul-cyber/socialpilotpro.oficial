import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { signUpWithEmail } from "@/lib/auth";
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
import { Eye, EyeOff, Home, Loader2, LogIn } from "lucide-react";

const USER_EMAIL_KEY = "socialpilot_user_email";
const MASTER_ACCESS_KEY = "socialpilot_master_access";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

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

export default function Register() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);

    try {
      const cleanEmail = normalizeEmail(values.email);
      const cleanName = values.name.trim();

      await signUpWithEmail(cleanEmail, values.password, {
        name: cleanName,
        companyName: cleanName,
        plan: "free",
        planStatus: "active",
        postsUsed: 0,
        postsLimit: 15,
      } as any);

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
    <div className="min-h-screen bg-muted/50">
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="flex items-center gap-3 text-lg font-black">
            <img
              src="/ícone_social_pilotpro.png"
              alt="Logo oficial do Social Pilot PRO"
              className="h-12 w-12 rounded-lg object-cover shadow-sm"
            />
            <span>Social Pilot PRO</span>
          </Link>

          <nav className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/" className="inline-flex items-center gap-2">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href="/login" className="inline-flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Entrar
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex w-full items-center justify-center p-4 py-10">
        <Card className="w-full max-w-lg shadow-lg border-primary/10">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <img
                src="/ícone_social_pilotpro.png"
                alt="Logo oficial do Social Pilot PRO"
                className="h-20 w-20 rounded-2xl object-cover shadow-sm"
              />
            </div>

            <CardTitle className="text-2xl font-bold tracking-tight">
              Criar uma conta
            </CardTitle>

            <CardDescription>
              Configure sua conta para começar a organizar seus posts com o
              Social Pilot PRO
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da empresa ou responsável</FormLabel>

                      <FormControl>
                        <Input
                          placeholder="Minha Empresa"
                          autoComplete="organization"
                          disabled={isLoading}
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
                      <FormLabel>E-mail</FormLabel>

                      <FormControl>
                        <Input
                          placeholder="seu@email.com"
                          type="email"
                          autoComplete="email"
                          disabled={isLoading}
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
                        <FormLabel>Senha</FormLabel>

                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="********"
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              disabled={isLoading}
                              className="pr-10"
                              {...field}
                            />

                            <button
                              type="button"
                              onClick={() => setShowPassword((value) => !value)}
                              className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-900"
                              aria-label={
                                showPassword ? "Ocultar senha" : "Mostrar senha"
                              }
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
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
                        <FormLabel>Confirmar Senha</FormLabel>

                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="********"
                              type={showConfirmPassword ? "text" : "password"}
                              autoComplete="new-password"
                              disabled={isLoading}
                              className="pr-10"
                              {...field}
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword((value) => !value)
                              }
                              className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-900"
                              aria-label={
                                showConfirmPassword
                                  ? "Ocultar confirmação de senha"
                                  : "Mostrar confirmação de senha"
                              }
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
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
                  className="w-full mt-6"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    "Criar Conta"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 items-center justify-center border-t p-6">
            <div className="text-sm text-muted-foreground text-center">
              Já tem uma conta?
            </div>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">Fazer Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
