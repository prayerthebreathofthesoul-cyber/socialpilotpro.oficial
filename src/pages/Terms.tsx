import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, LogIn, UserPlus } from "lucide-react";

export default function Terms() {
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
            Termos de Serviço — Social Pilot PRO
          </h1>

          <p className="mb-6 text-slate-600">
            Última atualização: 07/06/2026
          </p>

          <div className="space-y-5 leading-relaxed text-slate-700">
            <p>
              Ao utilizar o Social Pilot PRO, o usuário concorda com estes
              Termos de Serviço. Caso não concorde, não deverá utilizar a
              plataforma.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              1. Sobre o serviço
            </h2>

            <p>
              O Social Pilot PRO é uma ferramenta para criação, organização,
              rascunho, agendamento e gerenciamento de conteúdos para redes
              sociais.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              2. Cadastro e conta
            </h2>

            <p>
              O usuário é responsável por fornecer informações verdadeiras no
              cadastro e por manter a segurança de sua conta, senha e acessos.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              3. Uso permitido
            </h2>

            <p>
              O usuário concorda em utilizar a plataforma apenas para fins
              lícitos, respeitando as regras das redes sociais, direitos
              autorais, marcas, privacidade de terceiros e leis aplicáveis.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              4. Conteúdo do usuário
            </h2>

            <p>
              O usuário é responsável por todo conteúdo criado, enviado,
              armazenado, agendado ou publicado por meio da plataforma,
              incluindo textos, imagens, hashtags e links.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              5. Integrações com terceiros
            </h2>

            <p>
              Algumas funções dependem de serviços de terceiros, como Facebook,
              Instagram, Meta, Supabase e provedores de hospedagem. Mudanças,
              limitações ou falhas nesses serviços podem afetar funcionalidades
              da plataforma.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              6. Publicação em redes sociais
            </h2>

            <p>
              A publicação automática em redes sociais depende de autorização do
              usuário e das permissões fornecidas pelas APIs oficiais. A
              plataforma não garante publicação caso a conta conectada esteja
              restrita, sem permissão ou fora das regras da rede social.
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              7. Cancelamento e remoção
            </h2>

            <p>
              O usuário pode parar de utilizar o serviço a qualquer momento e
              pode solicitar a exclusão dos seus dados conforme a página de{" "}
              <Link href="/data-deletion" className="font-semibold text-blue-600 hover:underline">
                exclusão de dados
              </Link>
              .
            </p>

            <h2 className="text-xl font-semibold text-slate-900">
              8. Contato
            </h2>

            <p>
              Para dúvidas sobre estes Termos de Serviço, entre em contato pelo
              e-mail:{" "}
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
