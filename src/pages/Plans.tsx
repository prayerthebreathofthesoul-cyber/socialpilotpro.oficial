import { useLocation } from "wouter";
import {
  Crown,
  ShieldCheck,
  Sparkles,
  Building2,
  CheckCircle2,
  LayoutDashboard,
} from "lucide-react";

import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const OFFICIAL_EMAIL = "socialpilotpro.oficial@gmail.com";

function getStoredUserEmail() {
  const possibleDirectKeys = [
    "socialpilot_user_email",
    "user_email",
    "email",
    "auth_email",
  ];

  for (const key of possibleDirectKeys) {
    const value = localStorage.getItem(key);

    if (value && value.includes("@")) {
      return value.trim().toLowerCase();
    }
  }

  const possibleJsonKeys = [
    "socialpilot_user",
    "user",
    "auth_user",
    "currentUser",
    "session",
  ];

  for (const key of possibleJsonKeys) {
    const value = localStorage.getItem(key);

    if (!value) continue;

    try {
      const parsed = JSON.parse(value);

      const email =
        parsed?.email ||
        parsed?.user?.email ||
        parsed?.profile?.email ||
        parsed?.session?.user?.email;

      if (email && typeof email === "string") {
        return email.trim().toLowerCase();
      }
    } catch {
      // Ignora valores que não são JSON válido
    }
  }

  return "";
}

export default function Plans() {
  const [, setLocation] = useLocation();

  const userEmail = getStoredUserEmail();
  const isOfficialAccount = userEmail === OFFICIAL_EMAIL.toLowerCase();

  if (!isOfficialAccount) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Planos</h1>
            <p className="text-slate-600">
              Escolha o melhor plano para sua empresa.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-slate-900">Gratuito</h2>

                <p className="mt-2 text-sm text-slate-600">
                  Ideal para testar a plataforma.
                </p>

                <p className="mt-6 text-4xl font-bold text-slate-900">R$ 0</p>
                <p className="text-sm text-slate-500">Até 15 posts/mês</p>

                <Button className="mt-6 w-full">Plano atual</Button>
              </CardContent>
            </Card>

            <Card className="border-orange-500 shadow-md">
              <CardContent className="p-6">
                <div className="mb-3 inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                  Mais escolhido
                </div>

                <h2 className="text-xl font-bold text-slate-900">Premium</h2>

                <p className="mt-2 text-sm text-slate-600">
                  Para empresas que publicam com frequência.
                </p>

                <p className="mt-6 text-4xl font-bold text-slate-900">R$ 49</p>
                <p className="text-sm text-slate-500">por mês</p>

                <Button className="mt-6 w-full bg-orange-600 hover:bg-orange-700">
                  Ativar Premium
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-slate-900">
                  Empresarial
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Para agências e equipes maiores.
                </p>

                <p className="mt-6 text-3xl font-bold text-slate-900">
                  Sob consulta
                </p>

                <Button variant="outline" className="mt-6 w-full">
                  Falar com suporte
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-900 p-6 text-white shadow-xl md:p-12">
        <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10">
            <Crown className="h-9 w-9 text-yellow-400" />
          </div>

          <div>
            <span className="mb-3 inline-flex rounded-full bg-emerald-500 px-3 py-1 text-sm font-semibold text-white">
              Conta especial do proprietário
            </span>

            <h1 className="text-4xl font-black tracking-tight md:text-6xl">
              Conta Oficial
            </h1>

            <p className="mt-4 max-w-4xl text-base text-slate-200 md:text-lg">
              Acesso liberado para testes, administração e uso ilimitado da
              plataforma SocialPilot Pro.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/10 text-white shadow-none backdrop-blur">
            <CardContent className="p-6">
              <ShieldCheck className="mb-4 h-8 w-8 text-emerald-400" />

              <h2 className="mb-3 text-xl font-bold">Acesso ilimitado</h2>

              <p className="mb-6 text-sm leading-relaxed text-slate-200">
                Sua conta oficial não segue as limitações dos planos comuns.
              </p>

              <ul className="space-y-3 text-sm text-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Posts ilimitados
                </li>

                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Limites mensais liberados
                </li>

                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Recursos premium liberados
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/10 text-white shadow-none backdrop-blur">
            <CardContent className="p-6">
              <Sparkles className="mb-4 h-8 w-8 text-cyan-400" />

              <h2 className="mb-3 text-xl font-bold">Ambiente de testes</h2>

              <p className="mb-6 text-sm leading-relaxed text-slate-200">
                Use esta conta para validar funções e experimentar novas
                melhorias antes de liberar para clientes.
              </p>

              <ul className="space-y-3 text-sm text-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Criar e testar posts
                </li>

                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Testar calendário e biblioteca
                </li>

                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Simular empresas reais
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/10 text-white shadow-none backdrop-blur">
            <CardContent className="p-6">
              <Building2 className="mb-4 h-8 w-8 text-orange-400" />

              <h2 className="mb-3 text-xl font-bold">Conta do dono</h2>

              <p className="mb-6 text-sm leading-relaxed text-slate-200">
                Exclusiva para o e-mail principal do sistema e para uso
                administrativo.
              </p>

              <ul className="space-y-3 text-sm text-slate-100">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  E-mail: socialpilotpro.oficial@gmail.com
                </li>

                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Conta protegida
                </li>

                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  Uso administrativo
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Button
            onClick={() => setLocation("/dashboard")}
            className="bg-white px-6 py-6 text-base font-bold text-slate-950 hover:bg-slate-100"
          >
            <LayoutDashboard className="mr-2 h-5 w-5" />
            Ir para o Dashboard
          </Button>

          <Button
            onClick={() => setLocation("/master")}
            variant="outline"
            className="border-white/30 bg-white/10 px-6 py-6 text-base font-bold text-white hover:bg-white/20 hover:text-white"
          >
            <Crown className="mr-2 h-5 w-5" />
            Abrir Painel Master
          </Button>
        </div>
      </section>
    </Layout>
  );
}
