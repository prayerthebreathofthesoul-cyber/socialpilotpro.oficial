import { useLocation } from "wouter";
import {
  Crown,
  ShieldCheck,
  Sparkles,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Settings,
  BarChart3,
  CalendarDays,
  ImageIcon,
  Headphones,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function OfficialAccount() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 text-white md:flex">
          <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 font-bold text-white">
              SP
            </div>

            <div>
              <h1 className="text-lg font-bold leading-tight">
                SocialPilot Pro
              </h1>
              <p className="text-xs text-slate-400">Conta Oficial</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            <button
              onClick={() => setLocation("/dashboard")}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <LayoutDashboard className="h-5 w-5" />
              Dashboard
            </button>

            <button
              onClick={() => setLocation("/calendar")}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <CalendarDays className="h-5 w-5" />
              Calendário
            </button>

            <button
              onClick={() => setLocation("/media")}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <ImageIcon className="h-5 w-5" />
              Biblioteca
            </button>

            <button
              onClick={() => setLocation("/analytics")}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <BarChart3 className="h-5 w-5" />
              Analytics
            </button>

            <button
              onClick={() => setLocation("/settings")}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <Settings className="h-5 w-5" />
              Configurações
            </button>

            <button
              onClick={() => setLocation("/support")}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
            >
              <Headphones className="h-5 w-5" />
              Suporte
            </button>
          </nav>

          <div className="border-t border-slate-800 p-4">
            <button
              onClick={() => setLocation("/master")}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
            >
              <Crown className="h-5 w-5" />
              Abrir Painel Master
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8">
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
                      Posts ilimitados para testes
                    </li>

                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      Limites liberados
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

                  <h2 className="mb-3 text-xl font-bold">
                    Ambiente de testes
                  </h2>

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
                      Testar calendário
                    </li>

                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      Simular clientes reais
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
        </main>
      </div>
    </div>
  );
}
