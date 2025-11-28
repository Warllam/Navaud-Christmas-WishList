"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import noelHero from "@/app/static/noel_navaud.png";
import { useSession } from "./session-context";

const navLinks = [
  { href: "/tableau-de-bord", label: "Ma liste" },
  { href: "/utilisateurs", label: "Listes famille" },
  { href: "/mes-cadeaux", label: "Mes cadeaux" },
];

const NavLink = ({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) => (
  <Link
    href={href}
    className={`rounded-full px-3 py-2 text-sm font-medium transition ${
      active
        ? "bg-slate-900 text-white shadow-sm"
        : "text-slate-700 hover:bg-white/70 hover:text-slate-900"
    }`}
  >
    {label}
  </Link>
);

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useSession();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-red-100/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 md:py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-900"
            >
              <span className="relative flex h-9 w-9 overflow-hidden rounded-xl border border-red-100 bg-rose-50">
                <Image
                  src={noelHero}
                  alt="Noel Navaud"
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </span>
              <div className="flex flex-col leading-tight">
                <span>Navaud Noel</span>
                <span className="text-[10px] font-medium text-slate-500">
                  Listes et reservations
                </span>
              </div>
            </Link>
            <span className="hidden text-xs font-medium text-slate-500 sm:inline">
              Naviguez entre votre liste et celles de la famille
            </span>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  {...link}
                  active={pathname === link.href}
                />
              ))}
            </nav>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <div className="hidden flex-col text-right text-xs text-slate-600 sm:flex">
                    <span className="font-semibold text-slate-900">
                      {user.displayName}
                    </span>
                    <span>Connecte</span>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      router.push("/");
                    }}
                    className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    Deconnexion
                  </button>
                </>
              ) : (
                <Link
                  href="/"
                  className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  Connexion
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {user && (
        <nav className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between rounded-full border border-white/80 bg-white/95 px-4 py-3 text-xs font-semibold text-slate-700 shadow-xl shadow-slate-900/10 md:hidden">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-1 items-center justify-center rounded-full px-3 py-2 ${
                  active ? "bg-slate-900 text-white" : "text-slate-700"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-24 md:pb-12 md:pt-6">
        {children}
      </main>
      <footer className="border-t border-red-100/80 bg-white/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 text-xs text-slate-600">
          <span>Fait pour la famille Navaud.</span>
          <span className="hidden sm:inline">
            Connexion par lien magique . Donnees protegees par Firestore
          </span>
        </div>
      </footer>
    </div>
  );
};
