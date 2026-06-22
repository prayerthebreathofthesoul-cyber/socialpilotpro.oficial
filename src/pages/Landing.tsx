import { useEffect } from "react";

export default function Landing() {
  useEffect(() => {
    document.title = "Social Pilot PRO | Plataforma de agendamento de conteúdos";
  }, []);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <a href="/" className="flex items-center gap-3 text-lg font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">
              SP
            </span>
            <span>Social Pilot PRO</span>
          </a>

          <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-600">
            <a href="/privacy" className="hover:text-blue-600">
              Política de Privacidade
            </a>
            <a href="/terms" className="hover:text-blue-600">
              Termos de Uso
            </a>
            <a
              href="/login"
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-900 hover:border-blue-600 hover:text-blue-600"
            >
              Entrar
            </a>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-blue-50 to-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <p className="mb-5 inline-flex rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-blue-700">
            Site oficial do Social Pilot PRO
          </p>

          <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
            Social Pilot PRO
          </h1>

          <p className="mt-6 text-xl leading-8 text-slate-700">
            O Social Pilot PRO é uma plataforma para criar, organizar, agendar e
            publicar conteúdos autorizados em redes sociais.
          </p>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            O usuário cria a publicação dentro do painel, seleciona a conta
            conectada, define o conteúdo e confirma a publicação ou o
            agendamento. O sistema não publica conteúdo sem ação ou autorização
            do usuário.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/login"
              className="rounded-lg bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
            >
              Entrar no Social Pilot PRO
            </a>

            <a
              href="/privacy"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-bold text-slate-900 hover:border-blue-600 hover:text-blue-600"
            >
              Política de Privacidade
            </a>

            <a
              href="/terms"
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-bold text-slate-900 hover:border-blue-600 hover:text-blue-600"
            >
              Termos de Uso
            </a>
          </div>
        </div>
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Criar conteúdos</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Crie legendas, organize ideias, prepare campanhas e monte posts
              para suas redes sociais.
            </p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Agendar publicações</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Escolha datas e horários para manter um calendário de publicações
              organizado.
            </p>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-bold">Publicar com autorização</h2>
            <p className="mt-3 leading-7 text-slate-600">
              Publique apenas conteúdos criados e confirmados pelo próprio
              usuário em contas conectadas autorizadas.
            </p>
          </article>
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>© 2026 Social Pilot PRO. Todos os direitos reservados.</span>

          <div className="flex flex-wrap gap-4 font-bold">
            <a href="/privacy" className="hover:text-blue-600">
              Política de Privacidade
            </a>
            <a href="/terms" className="hover:text-blue-600">
              Termos de Uso
            </a>
            <a href="/login" className="hover:text-blue-600">
              Entrar
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
