"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "@/components/session-context";
import {
  createWishlistItem,
  fetchUserProfile,
  listenToWishlistItems,
  setReservation,
} from "@/lib/firestore";
import { FAMILY_NAMES } from "@/lib/allowed-names";
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
  const [adding, setAdding] = useState(false);
  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestTitle, setSuggestTitle] = useState("");
  const [suggestDescription, setSuggestDescription] = useState("");
  const [suggestLink, setSuggestLink] = useState("");
  const [reserveDialogItem, setReserveDialogItem] = useState<WishlistItem | null>(null);
  const [reservePartner, setReservePartner] = useState<string>("");
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
    if (item.reservedBy === user.id) {
      try {
        await setReservation(item.id, user.id, false);
        setInfo("Vous avez libere ce cadeau.");
      } catch (error) {
        console.error(error);
        setInfo(
          error instanceof Error
            ? error.message
            : "Impossible de mettre a jour la reservation."
        );
      }
      return;
    }
    if (item.reservedBy && item.reservedBy !== user.id) {
      setInfo("Deja pris.");
      return;
    }
    setReserveDialogItem(item);
    setReservePartner("");
    setInfo(null);
  };

  const confirmReservation = async () => {
    if (!reserveDialogItem || !user) return;
    try {
      await setReservation(
        reserveDialogItem.id,
        user.id,
        true,
        reservePartner || null
      );
      setInfo("Cadeau mis de cote pour vous.");
    } catch (error) {
      console.error(error);
      setInfo(
        error instanceof Error
          ? error.message
          : "Impossible de mettre a jour la reservation."
      );
    } finally {
      setReserveDialogItem(null);
    }
  };

  const handleSuggestion = async () => {
    if (!user) {
      setInfo("Connectez-vous pour proposer une idee.");
      return;
    }
    if (!suggestTitle.trim()) {
      setInfo("Ajoutez un titre pour proposer une idee.");
      return;
    }
    setAdding(true);
    setInfo(null);
    try {
      await createWishlistItem(decodedUserId, {
        title: suggestTitle.trim(),
        description: suggestDescription.trim() || null,
        link: suggestLink.trim() || null,
        imageUrl: null,
        position: null,
        hiddenFromOwner: true,
        suggestedBy: user.id,
      });
      setInfo("Idee proposee pour la famille (cachee au proprietaire).");
      setSuggestTitle("");
      setSuggestDescription("");
      setSuggestLink("");
      setSuggestionOpen(false);
    } catch (error) {
      console.error(error);
      setInfo("Impossible d ajouter l idee pour le moment.");
    } finally {
      setAdding(false);
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
  const visibleItems = items.filter(
    (item) => !(isOwner && item.hiddenFromOwner)
  );
  const partnerOptions = FAMILY_NAMES.filter(
    (name) => name !== profile.displayName && name !== user?.displayName
  );

  return (
    <div className="space-y-6">
      <header className="-mx-4 -mt-4 bg-white px-4 pt-4 pb-5 md:-mx-8 md:-mt-6 md:px-8 border-b border-slate-200 shadow-[0_6px_30px_-28px_rgba(0,0,0,0.4)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Liste publique
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">
          {profile.displayName ?? "Liste famille"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {isOwner
            ? "Vous voyez votre propre liste. Les noms des personnes qui reservent restent caches."
            : "Prenez un cadeau pour eviter les doublons. Le proprietaire ne saura pas que c'est vous."}
        </p>
        <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-emerald-200 to-transparent" />
      </header>

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
        {visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-600">
            Aucun cadeau ajoute pour le moment.
          </div>
        ) : (
          visibleItems.map((item) => {
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
                    {item.reservedWith && reservedByViewer && (
                      <p className="text-xs font-semibold text-slate-600">
                        Pris avec {item.reservedWith}
                      </p>
                    )}
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 font-semibold text-amber-800">
                          Pris
                          {item.reservedWith && (
                            <span className="text-amber-700">
                              (avec {item.reservedWith})
                            </span>
                          )}
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
                    {item.hiddenFromOwner && !isOwner && (
                      <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-center text-indigo-800">
                        Idee proposee par {item.suggestedBy ?? "un membre"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!isOwner && user && (
        <button
          type="button"
          onClick={() => setSuggestionOpen(true)}
          className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl md:bottom-10 md:right-10"
          aria-label="Proposer une idee"
        >
          💡
        </button>
      )}

      {!isOwner && user && suggestionOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-sm sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => {
              setSuggestionOpen(false);
              setSuggestTitle("");
              setSuggestDescription("");
              setSuggestLink("");
            }}
          />
          <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-indigo-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Idee famille
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  Proposer une idee pour {profile.displayName ?? "ce membre"}
                </h2>
                <p className="text-xs text-slate-600">
                  Visible par la famille uniquement, pas par le proprietaire.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSuggestionOpen(false);
                  setSuggestTitle("");
                  setSuggestDescription("");
                  setSuggestLink("");
                }}
                className="text-xs font-semibold text-indigo-700 underline"
              >
                Fermer
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Titre*
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
                  value={suggestTitle}
                  onChange={(e) => setSuggestTitle(e.target.value)}
                  placeholder="Ex : Idee surprise"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Description
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
                  value={suggestDescription}
                  onChange={(e) => setSuggestDescription(e.target.value)}
                  placeholder="Details, taille..."
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Lien
                </label>
                <input
                  className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none"
                  value={suggestLink}
                  onChange={(e) => setSuggestLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleSuggestion}
                disabled={adding}
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow disabled:opacity-60"
              >
                {adding ? "Ajout..." : "Proposer a la famille"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!isOwner && user && reserveDialogItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-sm sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => {
              setReserveDialogItem(null);
              setReservePartner("");
            }}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-red-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Reservation
                </p>
                <h2 className="text-lg font-semibold text-slate-900">
                  Cadeau a plusieurs ?
                </h2>
                <p className="text-xs text-slate-600">
                  Tu peux ajouter une seule autre personne, sinon laisse vide.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReserveDialogItem(null);
                  setReservePartner("");
                }}
                className="text-xs font-semibold text-red-600 underline"
              >
                Fermer
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Personne avec qui reserver (optionnel)
                </label>
                <select
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none"
                  value={reservePartner}
                  onChange={(e) => setReservePartner(e.target.value)}
                >
                  <option value="">Seul</option>
                  {partnerOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setReserveDialogItem(null);
                  setReservePartner("");
                }}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmReservation}
                className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

