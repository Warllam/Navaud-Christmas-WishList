"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/session-context";
import {
  changePin,
  createWishlistItem,
  deleteWishlistItem,
  fetchUserProfile,
  listenToWishlistItems,
  updateWishlistItemDetails,
  updateWishlistPositions,
} from "@/lib/firestore";
import type { UserProfile, WishlistItem } from "@/lib/types";

const emptyForm = {
  title: "",
  description: "",
  link: "",
};

const reorderList = (
  list: WishlistItem[],
  draggedId: string,
  targetId: string
) => {
  const next = [...list];
  const fromIndex = next.findIndex((item) => item.id === draggedId);
  const toIndex = next.findIndex((item) => item.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return list;
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

const normalizeOrderPayload = (items: WishlistItem[]) =>
  items.map((item, index) => ({ id: item.id, position: index + 1 }));

const nextPosition = (items: WishlistItem[]) => {
  if (!items.length) return 1;
  const highest = Math.max(...items.map((item) => item.position ?? 0));
  return Number.isFinite(highest) ? highest + 1 : items.length + 1;
};

export default function DashboardPage() {
  const { user, loading } = useSession();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [orderSaving, setOrderSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showExtras, setShowExtras] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [orderBootstrapped, setOrderBootstrapped] = useState(false);
  const activeItems = useMemo(
    () => items.filter((item) => !item.removedByOwner),
    [items]
  );

  useEffect(() => {
    if (!user) return;
    const unsubscribe = listenToWishlistItems(user.id, setItems);
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      setProfileLoading(true);
      const profileDoc = await fetchUserProfile(user.id);
      setProfile(profileDoc);
      setProfileLoading(false);
    };
    void loadProfile();
  }, [user]);

  useEffect(() => {
    if (!items.length || orderBootstrapped) return;
    const missingPosition = items.some(
      (item) => item.position === undefined || item.position === null
    );
    if (!missingPosition) return;

    const payload = normalizeOrderPayload(items);
    setOrderBootstrapped(true);
    void updateWishlistPositions(payload).catch((error) => {
      console.error(error);
      setOrderBootstrapped(false);
    });
  }, [items, orderBootstrapped]);

  const shareLink = useMemo(() => {
    if (typeof window === "undefined" || !user) return "";
    const encoded = encodeURIComponent(user.id);
    return `${window.location.origin}/listes/${encoded}`;
  }, [user]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    if (!form.title.trim()) {
      setFeedback("Ajoutez un titre pour enregistrer le cadeau.");
      return;
    }

    const currentItem = editingId
      ? items.find((item) => item.id === editingId)
      : null;
    setSaving(true);
    setFeedback(null);
    try {
      const descriptionValue = form.description.trim()
        ? form.description.trim()
        : null;
      const linkValue = form.link.trim() ? form.link.trim() : null;
      const payload = {
        title: form.title.trim(),
        description: descriptionValue,
        link: linkValue,
        imageUrl: null,
        position: editingId ? currentItem?.position : nextPosition(activeItems),
      };

      if (editingId) {
        await updateWishlistItemDetails(editingId, payload);
        setFeedback("Cadeau mis a jour !");
      } else {
        await createWishlistItem(user.id, payload);
        setFeedback("Cadeau ajoute a votre liste.");
      }
      resetForm();
      setFormOpen(false);
    } catch (error) {
      console.error(error);
      setFeedback("Une erreur est survenue. Reessayez.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: WishlistItem) => {
    if (!item.id) return;
    setSaving(true);
    setFeedback(null);
    try {
      await deleteWishlistItem(item.id);
      setFeedback("Cadeau retire de votre liste.");
    } catch (error) {
      console.error(error);
      setFeedback("Suppression non effectuee pour le moment.");
    } finally {
      setSaving(false);
      resetForm();
    }
  };

  const handleEdit = (item: WishlistItem) => {
    setEditingId(item.id);
    setForm({
      title: item.title ?? "",
      description: item.description ?? "",
      link: item.link ?? "",
    });
    setFormOpen(true);
  };

  const startNewItem = () => {
    resetForm();
    setFormOpen(true);
  };

  const persistOrder = async (orderedItems: WishlistItem[]) => {
    setOrderSaving(true);
    try {
      await updateWishlistPositions(normalizeOrderPayload(orderedItems));
      setFeedback("Nouvel ordre sauvegarde.");
    } catch (error) {
      console.error(error);
      setFeedback("Impossible de mettre a jour l'ordre.");
    } finally {
      setOrderSaving(false);
    }
  };

  const handleDragEnter = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setItems((prev) => reorderList(prev, draggingId, targetId));
  };

  const handleDragEnd = () => {
    if (!draggingId) return;
    const snapshot = items.filter((item) => !item.removedByOwner);
    setDraggingId(null);
    void persistOrder(snapshot);
  };

  if (loading || profileLoading) {
    return (
      <div className="rounded-2xl bg-white/90 p-6 text-sm text-slate-700 shadow-lg ring-1 ring-red-100">
        Chargement en cours...
      </div>
    );
  }

  if (!profile?.displayName) {
    return (
      <div className="rounded-3xl bg-white/95 p-6 shadow-xl ring-1 ring-green-100">
        <h1 className="text-2xl font-semibold text-slate-900">
          Profil incomplet
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Ce prenom ne dispose pas de profil valide. Reconnecte toi depuis l
          accueil ou contacte un admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="rounded-3xl bg-white/95 p-6 shadow-xl ring-1 ring-green-100">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-green-700">
              Bonjour {profile.displayName}
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Votre liste d envies
            </h1>
            <p className="text-sm text-slate-600">
              Ajoutez vos idees, organisez-les par glisser/deposer et partagez
              le lien public si besoin.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">
              Options pratiques (lien public, pin)
            </p>
            <button
              type="button"
              onClick={() => setShowExtras((value) => !value)}
              className="text-xs font-semibold text-red-600 underline"
            >
              {showExtras ? "Masquer" : "Afficher"}
            </button>
          </div>
          {showExtras && (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-semibold text-slate-900">
                  Lien public
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  A partager uniquement si besoin. Les reservations restent
                  anonymes.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-800">
                    {shareLink || "Lien de partage"}
                  </code>
                  <button
                    type="button"
                    className="rounded-full bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    onClick={async () => {
                      if (!shareLink) return;
                      try {
                        await navigator.clipboard.writeText(shareLink);
                        setFeedback("Lien copie dans le presse-papiers.");
                      } catch (error) {
                        console.error(error);
                        setFeedback(
                          "Copie impossible, copiez le lien manuellement."
                        );
                      }
                    }}
                  >
                    Copier le lien
                  </button>
                </div>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <p className="text-sm font-semibold text-slate-900">
                  Mettre a jour le pin
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Pin stocke en clair pour la famille. Changez-le si necessaire.
                </p>
                <form
                  className="mt-3 flex flex-col gap-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const data = new FormData(e.currentTarget);
                    const newPin = (data.get("newPin") as string) ?? "";
                    if (!newPin.trim()) {
                      setFeedback("Ajoutez un pin.");
                      return;
                    }
                    if (!user) {
                      setFeedback("Reconnexion requise pour modifier le pin.");
                      return;
                    }
                    try {
                      await changePin(user.id, newPin.trim());
                      setFeedback(
                        "Pin mis a jour (visible en clair dans la base)."
                      );
                      e.currentTarget.reset();
                    } catch (error) {
                      console.error(error);
                      setFeedback("Impossible de mettre a jour le pin.");
                    }
                  }}
                >
                  <input
                    name="newPin"
                    type="text"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-400 focus:outline-none"
                    placeholder="Nouveau pin"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                  >
                    Sauvegarder le pin
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Vos cadeaux</p>
            <p className="text-xs text-slate-600">
              Glisser/deposer pour changer l ordre.
            </p>
          </div>
          {orderSaving && (
            <span className="text-xs font-semibold text-emerald-700">
              Sauvegarde...
            </span>
          )}
        </div>

        {activeItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-600">
            Aucun cadeau encore. Appuyez sur le bouton flottant pour ajouter
            votre premiere envie.
          </div>
        ) : (
          activeItems.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => setDraggingId(item.id)}
              onDragEnter={() => handleDragEnter(item.id)}
              onDragEnd={handleDragEnd}
              className={`group relative rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-xl ${
                draggingId === item.id ? "ring-2 ring-red-300" : ""
              }`}
            >
              <div className="absolute left-3 top-3 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                #{index + 1}
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-slate-700">{item.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 font-semibold text-slate-700">
                    Maintiens pour reordonner
                  </span>
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
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    className="rounded-full border border-slate-300 px-3 py-2 text-slate-800 transition hover:-translate-y-0.5 hover:shadow"
                    onClick={() => handleEdit(item)}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rose-200 px-3 py-2 text-rose-600 transition hover:-translate-y-0.5 hover:shadow"
                    onClick={() => handleDelete(item)}
                    disabled={saving}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {feedback && (
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 text-sm text-slate-700 shadow">
          {feedback}
        </div>
      )}

      <button
        type="button"
        onClick={startNewItem}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-2xl font-bold text-white shadow-xl transition hover:-translate-y-1 hover:shadow-2xl md:bottom-10 md:right-10"
        aria-label="Ajouter un cadeau"
      >
        +
      </button>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-3 backdrop-blur-sm sm:items-center">
          <div
            className="absolute inset-0"
            onClick={() => {
              setFormOpen(false);
              resetForm();
            }}
          />
          <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-green-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Cadeau
                </p>
                <h2 className="text-xl font-semibold text-slate-900">
                  {editingId ? "Modifier le cadeau" : "Ajouter un cadeau"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  resetForm();
                }}
                className="text-xs font-semibold text-red-600 underline"
              >
                Fermer
              </button>
            </div>

            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-800">
                Titre*
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-red-400 focus:outline-none"
                  placeholder="Ex : pull en laine"
                  required
                />
              </label>
              <label className="block text-sm font-medium text-slate-800">
                Description
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-red-400 focus:outline-none"
                  rows={3}
                  placeholder="Details, couleur, taille..."
                />
              </label>
              <label className="block text-sm font-medium text-slate-800">
                Lien produit
                <input
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm focus:border-red-400 focus:outline-none"
                  placeholder="https://..."
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-2xl disabled:opacity-60"
                disabled={saving}
              >
                {editingId ? "Mettre a jour" : "Ajouter a ma liste"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
