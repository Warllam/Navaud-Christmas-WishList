import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  runTransaction,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { UserProfile, WishlistItem } from "./types";
import { FAMILY_NAMES } from "./allowed-names";

const USERS_COLLECTION = "users";
const ITEMS_COLLECTION = "wishlistItems";

const toUserProfile = (id: string, data: Record<string, unknown>): UserProfile => ({
  id,
  email: (data.email as string) ?? "",
  displayName: (data.displayName as string | null | undefined) ?? null,
  pin: (data.pin as string | null | undefined) ?? null,
  createdAt: (data.createdAt as Timestamp) ?? null,
});

const toWishlistItem = (id: string, data: Record<string, unknown>): WishlistItem => ({
  id,
  userId: (data.userId as string) ?? "",
  title: (data.title as string) ?? "",
  description: (data.description as string | null | undefined) ?? null,
  link: (data.link as string | null | undefined) ?? null,
  imageUrl: (data.imageUrl as string | null | undefined) ?? null,
  position:
    data.position === undefined || data.position === null
      ? null
      : Number(data.position),
  removedByOwner: Boolean(data.removedByOwner),
  reservedBy: (data.reservedBy as string | null | undefined) ?? null,
  createdAt: (data.createdAt as Timestamp) ?? null,
});

export const createOrVerifyUserWithPin = async (
  displayName: string,
  pin: string
): Promise<UserProfile> => {
  if (!FAMILY_NAMES.includes(displayName)) {
    throw new Error("Nom non autorise.");
  }
  const userId = displayName;
  const ref = doc(db, USERS_COLLECTION, userId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      const newProfile: UserProfile = {
        id: userId,
        email: "",
        displayName,
        pin,
      };
      transaction.set(ref, {
        displayName,
        email: "",
        pin,
        createdAt: serverTimestamp(),
      });
      return newProfile;
    }
    const current = snap.data() as Record<string, unknown>;
    if ((current.pin as string) !== pin) {
      throw new Error("Pin incorrect pour ce prénom.");
    }
    return toUserProfile(userId, current);
  });
};

export const changePin = async (userId: string, newPin: string) => {
  const ref = doc(db, USERS_COLLECTION, userId);
  await updateDoc(ref, { pin: newPin });
};

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const ref = doc(db, USERS_COLLECTION, userId);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return toUserProfile(snapshot.id, snapshot.data());
};

export const listenToUsers = (onData: (users: UserProfile[]) => void): Unsubscribe => {
  const q = query(collection(db, USERS_COLLECTION), orderBy("displayName"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) =>
      toUserProfile(docSnap.id, docSnap.data() as Record<string, unknown>)
    );
    onData(items);
  });
};

export const listenToWishlistItems = (
  userId: string,
  onData: (items: WishlistItem[]) => void
): Unsubscribe => {
  const q = query(collection(db, ITEMS_COLLECTION), where("userId", "==", userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const filtered = snapshot.docs
        .map((docSnap) =>
          toWishlistItem(docSnap.id, docSnap.data() as Record<string, unknown>)
        )
        .filter((item) => item.userId === userId)
        .sort((a, b) => {
          const positionA =
            a.position ?? (a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0);
          const positionB =
            b.position ?? (b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0);
          return positionA - positionB;
        });
      onData(filtered);
    },
    (error) => {
      console.error("Wishlist listener error", error);
      onData([]);
    }
  );
};

type ItemPayload = Pick<WishlistItem, "title" | "description" | "link" | "imageUrl" | "position">;

const normalizeOptionalString = (value?: string | null) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const createWishlistItem = async (userId: string, payload: ItemPayload) => {
  const description = normalizeOptionalString(payload.description);
  const link = normalizeOptionalString(payload.link);
  const imageUrl = normalizeOptionalString(payload.imageUrl);
  const position =
    payload.position !== undefined && Number.isFinite(payload.position)
      ? payload.position
      : Date.now();

  const data: Record<string, unknown> = {
    title: payload.title,
    userId,
    reservedBy: null,
    createdAt: serverTimestamp(),
    position,
    removedByOwner: false,
  };

  if (description !== undefined) {
    data.description = description;
  }

  if (link !== undefined) {
    data.link = link;
  }

  if (imageUrl !== undefined) {
    data.imageUrl = imageUrl;
  }

  await addDoc(collection(db, ITEMS_COLLECTION), data);
};

export const updateWishlistItemDetails = async (itemId: string, payload: ItemPayload) => {
  const ref = doc(db, ITEMS_COLLECTION, itemId);
  const description = normalizeOptionalString(payload.description);
  const link = normalizeOptionalString(payload.link);
  const imageUrl = normalizeOptionalString(payload.imageUrl);

  const updatePayload: Record<string, unknown> = {
    title: payload.title,
  };

  if (description !== undefined) {
    updatePayload.description = description;
  }

  if (link !== undefined) {
    updatePayload.link = link;
  }

  if (imageUrl !== undefined) {
    updatePayload.imageUrl = imageUrl;
  }

  if (payload.position !== undefined && Number.isFinite(payload.position)) {
    updatePayload.position = payload.position;
  }

  await updateDoc(ref, updatePayload);
};

export const deleteWishlistItem = async (itemId: string) => {
  const ref = doc(db, ITEMS_COLLECTION, itemId);
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) return;
    const data = snap.data() as WishlistItem;
    if (data.reservedBy) {
      transaction.update(ref, { removedByOwner: true });
    } else {
      transaction.delete(ref);
    }
  });
};

export const setReservation = async (itemId: string, userId: string, reserve: boolean) => {
  const ref = doc(db, ITEMS_COLLECTION, itemId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) {
      throw new Error("Cadeau introuvable.");
    }
    const data = snapshot.data() as WishlistItem;
    if (reserve) {
      if (data.reservedBy && data.reservedBy !== userId) {
        throw new Error("Deja reserve par quelqu'un d'autre.");
      }
      transaction.update(ref, { reservedBy: userId, removedByOwner: false });
    } else {
      if (data.reservedBy && data.reservedBy !== userId) {
        throw new Error("Vous ne pouvez pas liberer ce cadeau.");
      }
      if (data.removedByOwner) {
        transaction.delete(ref);
      } else {
        transaction.update(ref, { reservedBy: null });
      }
    }
  });
};

export const updateWishlistPositions = async (
  items: { id: string; position: number }[]
) => {
  if (!items.length) return;
  const batch = writeBatch(db);
  items.forEach(({ id, position }) => {
    const ref = doc(db, ITEMS_COLLECTION, id);
    batch.update(ref, { position });
  });
  await batch.commit();
};
