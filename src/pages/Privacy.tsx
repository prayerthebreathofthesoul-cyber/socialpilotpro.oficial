import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, LogIn, UserPlus } from "lucide-react";

export default function Privacy() {
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
            Política de Privacidade — Social Pilot PRO
          </h1>

          <p className="mb-6 text-slate-600">
            Última atualização: 07/06/2026
          </p>

          <div className="space-y-5 leading-relaxed text-slate-700">
            <p>
              O Social Pilot PRO é uma plataforma criada para ajudar usuários,
              empresas e criadores de conteúdo a organizar, criar, agendar e
              gerenciar postagens para redes sociais.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              1. Informações que coletamos
            </h2>

            <p>
              Podemos coletar informações fornecidas pelo usuário, como nome,
              e-mail, nome da empresa, CPF ou CNPJ, segmento de atuação, posts
              criados, legendas, hashtags, imagens e dados necessários para uso
              da plataforma.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              2. Integração com redes sociais
            </h2>

            <p>
              Quando o usuário conectar contas do Facebook ou Instagram,
              poderemos acessar informações autorizadas pelo próprio usuário,
              como páginas gerenciadas, contas profissionais conectadas e
              permissões necessárias para preparar ou publicar conteúdo.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              3. Como usamos os dados
            </h2>

            <p>
              Usamos os dados para autenticar usuários, organizar contas,
              armazenar postagens, exibir informações no painel, permitir
              agendamento, melhorar a experiência da plataforma e executar ações
              autorizadas pelo usuário.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              4. Compartilhamento de dados
            </h2>

            <p>
              Não vendemos dados pessoais. Os dados podem ser compartilhados
              apenas com provedores necessários para funcionamento do sistema,
              como hospedagem, banco de dados, autenticação e APIs autorizadas
              pelo usuário.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              5. Segurança
            </h2>

            <p>
              Utilizamos medidas técnicas para proteger as informações dos
              usuários, incluindo autenticação, permissões de acesso e separação
              dos dados por conta ou empresa.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              6. Exclusão de dados
            </h2>

            <p>
              O usuário pode solicitar a exclusão dos seus dados acessando a
              página de exclusão de dados disponível em{" "}
              <Link href="/data-deletion" className="font-semibold text-blue-600 hover:underline">
                /data-deletion
              </Link>{" "}
              ou entrando em contato pelo e-mail oficial da plataforma.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              7. Contato
            </h2>

            <p>
              Em caso de dúvidas sobre esta Política de Privacidade, entre em
              contato pelo e-mail:{" "}
              <a
                href="mailto:socialpilotpro.oficial@gmail.com"
                className="font-semibold text-blue-600 hover:underline"
              >
                socialpilotpro.oficial@gmail.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
