import type { Timestamp } from "firebase/firestore";

export type UserProfile = {
  id: string;
  email: string;
  displayName: string | null;
  pin?: string | null;
  createdAt?: Timestamp | null;
};

export type WishlistItem = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  link?: string | null;
  imageUrl?: string | null;
  position?: number | null;
  removedByOwner?: boolean;
  reservedBy?: string | null;
  reservedWith?: string | null;
  createdAt?: Timestamp | null;
  hiddenFromOwner?: boolean;
  suggestedBy?: string | null;
};
