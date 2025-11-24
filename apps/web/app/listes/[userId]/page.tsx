"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "@/components/session-context";
import {
  fetchUserProfile,
  listenToWishlistItems,
  setReservation,
} from "@/lib/firestore";
import type { UserProfile, WishlistItem } from "@/lib/types";

type Props = {
  params: Promise<{ userId: string }>;
};

export default function WishlistPublicPage({ params }: Props) {
  const { userId } = use(params);
  const decodedUserId = decodeURIComponent(userId);
  const { user, loading } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const hasReservationByViewer = items.some(
    (item) => !!user && item.reservedBy === user.id
  );

  useEffect(() => {
    const load = async () => {
      setProfileLoading(true);
      const data = await fetchUserProfile(decodedUserId);
      setProfile(data);
      setProfileLoading(false);
    };
    void load();
  }, [decodedUserId]);

  useEffect(() => {
    const unsubscribe = listenToWishlistItems(decodedUserId, setItems);
    return unsubscribe;
  }, [decodedUserId]);

  const handleReservation = async (item: WishlistItem) => {
    if (!user) {
      setInfo("Connectez-vous pour prendre un cadeau.");
      return;
    }
    try {
      const reserve = item.reservedBy !== user.id;
      await setReservation(item.id, user.id, reserve);
      setInfo(
        reserve ? "Cadeau mis de cote pour vous." : "Vous avez libere ce cadeau."
      );
    } catch (error) {
      console.error(error);
      setInfo(
        error instanceof Error
          ? error.message
          : "Impossible de mettre a jour la reservation."
      );
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/90 p-6 text-sm text-slate-700 shadow-lg ring-1 ring-red-100">
        Chargement de la liste...
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="rounded-2xl bg-white/90 p-6 shadow-lg ring-1 ring-red-100">
        <h1 className="text-2xl font-semibold text-slate-900">
          Chargement du profil...
        </h1>
        <p className="mt-2 text-slate-600">
          Quelques secondes, le temps de recuperer la liste.
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl bg-white/90 p-6 shadow-lg ring-1 ring-red-100">
        <h1 className="text-2xl font-semibold text-slate-900">
          Liste introuvable
        </h1>
        <p className="mt-2 text-slate-600">
          Verifiez le lien partage ou demandez a la personne de se reconnecter.
        </p>
      </div>
    );
  }

  const isOwner = user?.id === decodedUserId;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-green-100">
        <p className="text-sm font-medium text-emerald-700">Liste publique</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">
          {profile.displayName ?? "Liste famille"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isOwner
            ? "Vous voyez votre propre liste. Les noms des personnes qui reservent restent caches."
            : "Prenez un cadeau pour eviter les doublons. Le proprietaire ne saura pas que c'est vous."}
        </p>
      </div>

      {info && (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-700 shadow">
          {info}
        </div>
      )}

      {hasReservationByViewer && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow">
          Attention : tu as reserve un cadeau ici. Si tu ne le prends plus, appuie sur{" "}
          <strong>Je ne le prends plus</strong> pour liberer la liste.
        </div>
      )}

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-600">
            Aucun cadeau ajoute pour le moment.
          </div>
        ) : (
          items.map((item) => {
            const reservedByViewer = item.reservedBy === user?.id;
            const reservedByOther = Boolean(item.reservedBy) && !reservedByViewer;
            const removedByOwner = Boolean(item.removedByOwner);
            if (removedByOwner && !reservedByViewer) {
              return null;
            }
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {item.title}
                    </h3>
                    {removedByOwner && reservedByViewer && (
                      <p className="mt-1 text-xs font-semibold text-amber-700">
                        ATTENTION : {profile.displayName ?? "Auteur"} a retire ce cadeau de sa liste.
                      </p>
                    )}
                    {item.description && (
                      <p className="mt-2 text-sm text-slate-700">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
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
                      {item.reservedBy && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                          Pris
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-xs font-semibold">
                    {isOwner ? (
                      <span className="rounded-full border border-slate-200 px-3 py-2 text-center text-slate-600">
                        Les reservations restent anonymes
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReservation(item)}
                        className={`rounded-full px-3 py-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow ${
                          reservedByViewer
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                            : reservedByOther
                            ? "border border-slate-200 bg-slate-100 text-slate-700"
                            : "border border-red-600 bg-red-600 text-white"
                        }`}
                        disabled={reservedByOther}
                      >
                        {reservedByViewer
                          ? "Je ne le prends plus"
                          : reservedByOther
                          ? "Deja pris"
                          : "Je le prends"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
