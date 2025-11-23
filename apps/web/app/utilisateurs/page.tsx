"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/session-context";
import { listenToUsers } from "@/lib/firestore";
import type { UserProfile } from "@/lib/types";

export default function UsersPage() {
  const { user, loading } = useSession();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const visibleUsers = users.filter((member) => member.id !== user?.id);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenToUsers(setUsers);
    return unsubscribe;
  }, [user]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/90 p-6 text-sm text-slate-700 shadow-lg ring-1 ring-red-100">
        Chargement de la famille...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-green-100">
        <p className="text-sm font-medium text-emerald-700">
          Listes visibles par toute la famille
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">
          Choisissez une personne
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Chaque carte ouvre la liste publique du membre selectionne. Vous
          pouvez y reserver un cadeau en toute discretion.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleUsers.map((member) => (
          <Link
            key={member.id}
            href={`/listes/${member.id}`}
            className="group rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-md transition hover:-translate-y-1 hover:shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Wishlist
                </p>
                <h3 className="text-lg font-semibold text-slate-900">
                  {member.displayName ?? "Membre"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">{member.email}</p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-sm transition group-hover:scale-105 group-hover:bg-emerald-500">
                Ouvrir
              </span>
            </div>
          </Link>
        ))}
        {visibleUsers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-600">
            Aucune autre liste pour l instant. Demandez aux autres de se
            connecter une premiere fois pour apparaitre ici.
          </div>
        )}
      </div>
    </div>
  );
}
