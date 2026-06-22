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
const STORES_KEY = "socialpilot_demo_stores";

type DocumentType = "cpf" | "cnpj";

type StorePlan = "free" | "premium";
type StorePlanStatus = "active" | "blocked" | "cancelled";

type StoreRecord = {
  id: number;
  name: string;
  email?: string | null;
  ownerName?: string | null;
  segment?: string | null;
  cnpj?: string | null;
  documentType?: DocumentType;
  documentNumber?: string | null;
  instagramConnected?: boolean;
  facebookConnected?: boolean;
  tiktokConnected?: boolean;
  plan?: StorePlan;
  planStatus?: StorePlanStatus;
  postsLimit?: number | null;
  postsUsed?: number;
  createdAt?: string;
  isMaster?: boolean;
};

function onlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeDocument(value?: string) {
  return onlyNumbers(value || "");
}

function formatCpfCnpj(value: string, type: DocumentType) {
  const numbers = onlyNumbers(value);

  if (type === "cpf") {
    return numbers
      .slice(0, 11)
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
  }

  return numbers
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

function getStoredStores(): StoreRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORES_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

function saveStoredStores(stores: StoreRecord[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(STORES_KEY, JSON.stringify(stores));
}

function documentAlreadyExists(documentNumber: string) {
  const cleanDocument = normalizeDocument(documentNumber);

  if (!cleanDocument) return false;

  const stores = getStoredStores();

  return stores.some((store) => {
    const savedDocument =
      normalizeDocument(store.documentNumber || "") ||
      normalizeDocument(store.cnpj || "");

    return savedDocument === cleanDocument;
  });
}

function emailAlreadyExists(email: string) {
  const cleanEmail = normalizeEmail(email);

  const stores = getStoredStores();

  return stores.some((store) => {
    return normalizeEmail(store.email || "") === cleanEmail;
  });
}

function createStoreForMaster(values: {
  name: string;
  email: string;
  documentType: DocumentType;
  documentNumber: string;
}) {
  const stores = getStoredStores();

  const nextId =
    Math.max(0, ...stores.map((store) => Number(store.id) || 0)) + 1;

  const cleanDocument = normalizeDocument(values.documentNumber);
  const cleanEmail = normalizeEmail(values.email);

  const newStore: StoreRecord = {
    id: nextId,
    name: values.name,
    email: cleanEmail,
    ownerName: values.name,
    segment: "Não informado",
    cnpj: cleanDocument,
    documentType: values.documentType,
    documentNumber: cleanDocument,
    instagramConnected: false,
    facebookConnected: false,
    tiktokConnected: false,
    plan: "free",
    planStatus: "active",
    postsLimit: 15,
    postsUsed: 0,
    createdAt: new Date().toISOString(),
    isMaster: false,
  };

  saveStoredStores([...stores, newStore]);

  return newStore;
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

    documentType: z.enum(["cpf", "cnpj"]),

    documentNumber: z
      .string()
      .min(1, { message: "Informe o CPF ou CNPJ" }),

    password: z
      .string()
      .min(6, { message: "A senha precisa ter pelo menos 6 caracteres" }),

    confirmPassword: z.string().min(1, { message: "Confirme a senha" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      const document = normalizeDocument(data.documentNumber);

      if (data.documentType === "cpf") {
        return document.length === 11;
      }

      return document.length === 14;
    },
    {
      message: "Informe um CPF ou CNPJ válido",
      path: ["documentNumber"],
    }
  );

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
      const cleanEmail = normalizeEmail(values.email);
      const cleanDocument = normalizeDocument(values.documentNumber);

      if (emailAlreadyExists(cleanEmail)) {
        toast.error("Este e-mail já está cadastrado. Faça login ou use outro e-mail.");
        setIsLoading(false);
        return;
      }

      if (documentAlreadyExists(cleanDocument)) {
        toast.error(
          values.documentType === "cpf"
            ? "Já existe uma conta cadastrada com este CPF."
            : "Já existe uma conta cadastrada com este CNPJ."
        );

        setIsLoading(false);
        return;
      }

      await signUpWithEmail(cleanEmail, values.password, {
        name: values.name,
        companyName: values.name,
        documentType: values.documentType,
        documentNumber: cleanDocument,
        cpf: values.documentType === "cpf" ? cleanDocument : "",
        cnpj: values.documentType === "cnpj" ? cleanDocument : cleanDocument,
        plan: "free",
        planStatus: "active",
        postsUsed: 0,
        postsLimit: 15,
      } as any);

      createStoreForMaster({
        name: values.name,
        email: cleanEmail,
        documentType: values.documentType,
        documentNumber: cleanDocument,
      });

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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                            onChange={(event) => {
                              field.onChange(event.target.value);
                              form.setValue("documentNumber", "");
                            }}
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
                          {documentType === "cpf" ? "CPF" : "CNPJ"}
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder={
                              documentType === "cpf"
                                ? "000.000.000-00"
                                : "00.000.000/0000-00"
                            }
                            disabled={isLoading}
                            value={field.value}
                            onChange={(event) => {
                              const formatted = formatCpfCnpj(
                                event.target.value,
                                documentType
                              );

                              field.onChange(formatted);
                            }}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                              placeholder="******"
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
                              placeholder="******"
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
      </main>
    </div>
  );
}
