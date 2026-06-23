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
import { Loader2, Home, UserPlus } from "lucide-react";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Informe seu e-mail" })
    .email({ message: "Informe um e-mail válido" }),
  password: z.string().min(1, { message: "Informe sua senha" }),
});

async function checkCompanyBlocked(email: string) {
  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("email", cleanEmail)
    .limit(1);

  if (error) {
    throw error;
  }

  const company = data?.[0];

  return (
    company?.is_blocked === true ||
    company?.plan_status === "blocked" ||
    company?.status === "blocked"
  );
}

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setIsLoading(true);

    try {
      const cleanEmail = values.email.trim().toLowerCase();

      await signInWithEmail(cleanEmail, values.password);

      const isBlocked = await checkCompanyBlocked(cleanEmail);

      if (isBlocked) {
        await signOut();
        toast.error("Conta bloqueada. Entre em contato com o suporte.");
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
              <Link href="/register" className="inline-flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Cadastre-se
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex w-full items-center justify-center p-4 py-10">
        <Card className="w-full max-w-md shadow-lg border-primary/10">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 flex justify-center">
              <img
                src="/ícone_social_pilotpro.png"
                alt="Logo oficial do Social Pilot PRO"
                className="h-20 w-20 rounded-2xl object-cover shadow-sm"
              />
            </div>

            <CardTitle className="text-2xl font-bold tracking-tight">
              Bem-vindo de volta
            </CardTitle>

            <CardDescription>Entre na sua conta Social Pilot PRO</CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Senha</FormLabel>

                        <button
                          type="button"
                          className="text-sm font-medium text-primary hover:underline"
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
                        <Input
                          placeholder="******"
                          type="password"
                          autoComplete="current-password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 items-center justify-center border-t p-6">
            <div className="text-sm text-muted-foreground text-center">
              Ainda não tem uma conta?
            </div>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/register">Cadastrar-se</Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
