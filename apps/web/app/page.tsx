"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/components/session-context";
import { FAMILY_NAMES } from "@/lib/allowed-names";

export default function Home() {
  const { user, loading, login } = useSession();
  const router = useRouter();
  const [selectedName, setSelectedName] = useState(FAMILY_NAMES[0]);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (user) {
      router.replace("/tableau-de-bord");
    }
  }, [user, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedName || !pin) {
      setMessage("Choisissez un prenom et un pin.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      await login(selectedName, pin);
      router.replace("/tableau-de-bord");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Impossible de se connecter."
      );
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="grid gap-6 rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-green-100 md:grid-cols-2 md:p-8">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-red-100 px-4 py-1 text-xs font-semibold text-red-800">
          Noel en famille
        </div>
        <h1 className="text-3xl font-semibold text-slate-900 md:text-4xl">
          Connexion rapide par pin
        </h1>
        <p className="text-sm text-slate-700">
          Choisis ton prenom, entre ton pin. Les reservations restent anonymes
          pour celui qui possede la liste.
        </p>
        <p className="text-xs text-slate-500">
          Pas de compte a creer : le pin suffit et reste en clair pour la
          famille. Tu pourras le changer ensuite.
        </p>
      </div>

      <div className="rounded-2xl border border-red-100 bg-slate-900 p-6 text-white shadow-lg">
        <h2 className="text-xl font-semibold">Connexion</h2>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-200">
            Prenom
            <select
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-500/40 bg-slate-800 px-3 py-3 text-sm text-white focus:border-white focus:outline-none"
            >
              {FAMILY_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-200">
            Code pin
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Ton pin secret"
              className="mt-2 w-full rounded-xl border border-slate-500/40 bg-slate-800 px-3 py-3 text-sm text-white placeholder:text-slate-400 focus:border-white focus:outline-none"
              required
            />
          </label>
          <button
            type="submit"
            disabled={loading || status === "loading"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-800/30 transition hover:-translate-y-0.5 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "loading" ? "Connexion..." : "Entrer"}
          </button>
          {message && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                status === "error"
                  ? "bg-rose-100 text-rose-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
