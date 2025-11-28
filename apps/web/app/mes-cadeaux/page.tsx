"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/session-context";
import { listenToUserReservations, setReservation } from "@/lib/firestore";
import type { WishlistItem } from "@/lib/types";

export default function MyGiftsPage() {
  const { user, loading } = useSession();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenToUserReservations(user.id, setItems);
    return unsubscribe;
  }, [user]);

  const grouped = useMemo(() => {
    const map = new Map<string, WishlistItem[]>();
    items.forEach((item) => {
      const key = item.userId;
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    });
    return Array.from(map.entries()).map(([person, gifts]) => ({
      person,
      gifts: gifts.sort((a, b) => {
        const aTime =
          a.createdAt && "toMillis" in a.createdAt ? a.createdAt.toMillis() : 0;
        const bTime =
          b.createdAt && "toMillis" in b.createdAt ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      }),
    }));
  }, [items]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/90 p-6 text-sm text-slate-700 shadow-lg ring-1 ring-red-100">
        Chargement...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl bg-white/90 p-6 text-sm text-slate-700 shadow-lg ring-1 ring-red-100">
        Connecte-toi pour voir tes cadeaux en cours.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="-mx-4 -mt-4 bg-white px-4 pt-4 pb-5 md:-mx-8 md:-mt-6 md:px-8 border-b border-slate-200 shadow-[0_6px_30px_-28px_rgba(0,0,0,0.4)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">
          Mes cadeaux en cours
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">
          Cadeaux que je prends
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Vue d ensemble de ce que tu as reserve pour la famille.
        </p>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </header>

      {info && (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-700 shadow">
          {info}
        </div>
      )}

      <section className="space-y-3 rounded-3xl bg-white/98 p-6 shadow-lg ring-1 ring-slate-100">
        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-600">
            Aucun cadeau reserve pour le moment.
          </div>
        ) : (
          grouped.map(({ person, gifts }) => (
            <div
              key={person}
              className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  {person}
                </h3>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {gifts.length} cadeau{gifts.length > 1 ? "x" : ""}
                </span>
              </div>
              <div className="space-y-3">
                {gifts.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {item.title}
                        </span>
                        {item.reservedWith && (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                            Avec {item.reservedWith}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-700">
                          {item.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800 hover:bg-slate-200"
                          >
                            Ouvrir le lien
                          </a>
                        )}
                        {item.hiddenFromOwner && (
                          <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
                            Idee famille (cachee au proprietaire)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await setReservation(item.id, user.id, false);
                            setInfo("Reservation liberee.");
                          } catch (error) {
                            console.error(error);
                            setInfo("Impossible de liberer pour le moment.");
                          }
                        }}
                        className="rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:-translate-y-0.5 hover:shadow"
                      >
                        Je ne le prends plus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
