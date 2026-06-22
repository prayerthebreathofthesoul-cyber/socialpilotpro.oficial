import { Link } from "wouter";
import { Home, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
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
  );
}
