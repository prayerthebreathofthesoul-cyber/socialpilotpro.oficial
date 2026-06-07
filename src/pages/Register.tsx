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
import { Loader2 } from "lucide-react";

const registerSchema = z
  .object({
    name: z.string().min(1, { message: "Informe o nome da empresa ou responsável" }),
    email: z
      .string()
      .min(1, { message: "Informe seu e-mail" })
      .email({ message: "Informe um e-mail válido" }),
    documentType: z.enum(["cpf", "cnpj"]),
    documentNumber: z.string().optional().or(z.literal("")),
    password: z
      .string()
      .min(6, { message: "A senha precisa ter pelo menos 6 caracteres" }),
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

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      documentType: "cnpj",
      documentNumber: "",
      password: "",
      confirmPassword: "",
    },
  });

  const documentType = form.watch("documentType");

  const onSubmit = async (values: RegisterFormValues) => {
    setIsLoading(true);

    try {
      await signUpWithEmail(values.email, values.password, {
        name: values.name,
        companyName: values.name,
        cnpj: values.documentType === "cnpj" ? values.documentNumber || "" : "",
        documentType: values.documentType,
        documentNumber: values.documentNumber || "",
      } as any);

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
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/50 p-4 py-12">
      <Card className="w-full max-w-lg shadow-lg border-primary/10">
        <CardHeader className="space-y-1 text-center">
          <div className="w-12 h-12 bg-primary rounded-lg mx-auto mb-4 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">
              SP
            </span>
          </div>

          <CardTitle className="text-2xl font-bold tracking-tight">
            Criar uma conta
          </CardTitle>

          <CardDescription>
            Configure sua conta para começar a organizar seus posts com o
            SocialPilot Pro
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
                    <FormLabel>
                      {documentType === "cpf"
                        ? "Nome Completo"
                        : "Nome da Empresa"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={
                          documentType === "cpf"
                            ? "Seu nome completo"
                            : "Minha Empresa"
                        }
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="documentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cadastro</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          disabled={isLoading}
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <option value="cnpj">Pessoa Jurídica - CNPJ</option>
                          <option value="cpf">Pessoa Física - CPF</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="documentNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {documentType === "cpf" ? "CPF Opcional" : "CNPJ Opcional"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={
                            documentType === "cpf"
                              ? "000.000.000-00"
                              : "00.000.000/0000-00"
                          }
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="******"
                          type="password"
                          autoComplete="new-password"
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
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Senha</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="******"
                          type="password"
                          autoComplete="new-password"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full mt-6" disabled={isLoading}>
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
    </div>
  );
}
