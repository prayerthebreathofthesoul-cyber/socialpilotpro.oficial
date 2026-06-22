import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, LogIn, UserPlus } from "lucide-react";

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-slate-50">
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

            <Button asChild>
              <Link href="/register" className="inline-flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Cadastre-se
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="mb-4 text-3xl font-bold">
            Exclusão de Dados — Social Pilot PRO
          </h1>

          <p className="mb-6 text-slate-600">
            Última atualização: 07/06/2026
          </p>

          <div className="space-y-5 leading-relaxed text-slate-700">
            <p>
              O usuário pode solicitar a exclusão dos seus dados pessoais
              armazenados pelo Social Pilot PRO a qualquer momento.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              Como solicitar a exclusão
            </h2>

            <p>
              Para solicitar a exclusão dos seus dados, envie um e-mail para:
            </p>

            <p>
              <a
                href="mailto:socialpilotpro.oficial@gmail.com"
                className="font-semibold text-blue-600 hover:underline"
              >
                socialpilotpro.oficial@gmail.com
              </a>
            </p>

            <p>No assunto do e-mail, escreva:</p>

            <p className="font-semibold text-slate-900">
              Solicitação de exclusão de dados — Social Pilot PRO
            </p>

            <p>
              No corpo do e-mail, informe o e-mail usado no cadastro da conta e,
              se possível, o nome da empresa ou perfil cadastrado.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              Prazo de processamento
            </h2>

            <p>
              Após recebermos a solicitação, os dados serão analisados e
              removidos em prazo razoável, conforme exigências legais,
              obrigações de segurança e funcionamento da plataforma.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              Dados que podem ser removidos
            </h2>

            <p>
              Podem ser removidos dados de cadastro, dados da empresa,
              postagens, mídias, integrações sociais e demais informações
              associadas à conta do usuário.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              Revogação de acesso Meta
            </h2>

            <p>
              O usuário também pode remover o acesso do Social Pilot PRO
              diretamente nas configurações da sua conta Facebook/Meta, na área
              de aplicativos e sites conectados.
            </p>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
              <p className="font-semibold text-slate-900">
                Links úteis:
              </p>

              <div className="mt-3 flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <Link href="/privacy">Política de Privacidade</Link>
                </Button>

                <Button variant="outline" asChild>
                  <Link href="/terms">Termos de Uso</Link>
                </Button>

                <Button asChild>
                  <Link href="/">Voltar para Home</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
