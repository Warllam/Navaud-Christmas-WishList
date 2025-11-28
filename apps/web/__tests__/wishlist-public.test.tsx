import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WishlistPublicPage from "@/app/listes/[userId]/page";
import type { UserProfile, WishlistItem } from "@/lib/types";
import { Suspense } from "react";
import { vi } from "vitest";

type SessionState = {
  user: { id: string; displayName: string } | null;
  loading: boolean;
};

const {
  sessionState,
  fetchUserProfileMock,
  listenToWishlistItemsMock,
  setReservationMock,
  createWishlistItemMock,
}: {
  sessionState: SessionState;
  fetchUserProfileMock: ReturnType<
    typeof vi.fn<[string], Promise<UserProfile | null>>
  >;
  listenToWishlistItemsMock: ReturnType<
    typeof vi.fn<[string, (items: WishlistItem[]) => void], () => void>
  >;
  setReservationMock: ReturnType<
    typeof vi.fn<[string, string, boolean, string?], Promise<void>>
  >;
  createWishlistItemMock: ReturnType<
    typeof vi.fn<
      [
        string,
        {
          title: string;
          description?: string | null;
          link?: string | null;
          imageUrl?: string | null;
          position?: number | null;
          hiddenFromOwner?: boolean;
          suggestedBy?: string | null;
        }
      ],
      Promise<void>
    >
  >;
} = vi.hoisted(() => ({
  sessionState: { user: { id: "JJ", displayName: "JJ" }, loading: false },
  fetchUserProfileMock: vi.fn<[string], Promise<UserProfile | null>>(),
  listenToWishlistItemsMock: vi.fn<
    [string, (items: WishlistItem[]) => void],
    () => void
  >(),
  setReservationMock: vi.fn<[string, string, boolean, string?], Promise<void>>(),
  createWishlistItemMock: vi.fn<
    [
      string,
      {
        title: string;
        description?: string | null;
        link?: string | null;
        imageUrl?: string | null;
        position?: number | null;
        hiddenFromOwner?: boolean;
        suggestedBy?: string | null;
      }
    ],
    Promise<void>
  >(),
}));

vi.mock("@/components/session-context", () => ({
  useSession: () => sessionState,
}));

vi.mock("@/lib/firestore", () => ({
  fetchUserProfile: fetchUserProfileMock,
  listenToWishlistItems: listenToWishlistItemsMock,
  setReservation: setReservationMock,
  createWishlistItem: createWishlistItemMock,
}));

const sampleProfile: UserProfile = {
  id: "paul",
  displayName: "Paul",
  email: "",
};

const baseItem: WishlistItem = {
  id: "item-1",
  userId: "paul",
  title: "Pull en laine",
  reservedBy: null,
  removedByOwner: false,
  hiddenFromOwner: false,
};

const createResolvedParams = () => {
  const promise = Promise.resolve({ userId: "paul" }) as Promise<{ userId: string }> & {
    status?: string;
    value?: { userId: string };
  };
  promise.status = "fulfilled";
  promise.value = { userId: "paul" };
  return promise;
};

const renderPage = () =>
  render(
    <Suspense fallback={<div>Chargement test</div>}>
      <WishlistPublicPage params={createResolvedParams()} />
    </Suspense>
  );

const waitForPageReady = async () => {
  await waitFor(() => expect(fetchUserProfileMock).toHaveBeenCalled());
  await screen.findByText(/Liste publique/i);
};

describe("Page liste publique /listes/[userId]", () => {
  beforeEach(() => {
    sessionState.user = { id: "JJ", displayName: "JJ" };
    sessionState.loading = false;
    fetchUserProfileMock.mockResolvedValue(sampleProfile);
    listenToWishlistItemsMock.mockImplementation((_, onData) => {
      onData([baseItem]);
      return vi.fn();
    });
    setReservationMock.mockResolvedValue();
  });

  it("demande une connexion avant de reserver", async () => {
    sessionState.user = null;
    const user = userEvent.setup();

    renderPage();
    await waitForPageReady();

    const reserveButton = await screen.findByRole("button", {
      name: /je le prends/i,
    });
    await user.click(reserveButton);

    expect(setReservationMock).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Connectez-vous pour prendre un cadeau/i)
    ).toBeInTheDocument();
  });

  it("permet de liberer un cadeau reserve par le visiteur", async () => {
    const reservedItem = { ...baseItem, reservedBy: sessionState.user?.id };
    listenToWishlistItemsMock.mockImplementation((_, onData) => {
      onData([reservedItem]);
      return vi.fn();
    });
    const user = userEvent.setup();

    renderPage();
    await waitForPageReady();

    const releaseButton = await screen.findByRole("button", {
      name: /je ne le prends plus/i,
    });
    await user.click(releaseButton);

    await waitFor(() =>
      expect(setReservationMock).toHaveBeenCalledWith(
        reservedItem.id,
        sessionState.user?.id ?? "",
        false
      )
    );
    expect(
      await screen.findByText(/Vous avez libere ce cadeau/i)
    ).toBeInTheDocument();
  });

  it("permet de proposer une idee cachee au proprietaire", async () => {
    createWishlistItemMock.mockResolvedValue();
    const user = userEvent.setup();

    renderPage();
    await waitForPageReady();

    await user.click(
      screen.getByRole("button", { name: /Proposer une idee/i })
    );
    await user.type(screen.getByPlaceholderText(/Idee surprise/i), "Idee test");
    await user.type(screen.getByPlaceholderText(/Details, taille/i), "bleu");
    await user.type(
      screen.getByPlaceholderText(/https:\/\/\.\.\./i),
      "https://test"
    );
    await user.click(
      screen.getByRole("button", { name: /Proposer a la famille/i })
    );

    await waitFor(() =>
      expect(createWishlistItemMock).toHaveBeenCalledWith(
        "paul",
        expect.objectContaining({
          title: "Idee test",
          description: "bleu",
          link: "https://test",
          hiddenFromOwner: true,
          suggestedBy: sessionState.user?.id,
        })
      )
    );
    expect(
      await screen.findByText(/Idee proposee pour la famille/i)
    ).toBeInTheDocument();
  });

  it("cache les idees famille pour le proprietaire", async () => {
    sessionState.user = { id: "paul", displayName: "Paul" };
    const hiddenItem = { ...baseItem, id: "hidden-1", hiddenFromOwner: true };
    listenToWishlistItemsMock.mockImplementation((_, onData) => {
      onData([hiddenItem]);
      return vi.fn();
    });

    renderPage();
    await waitForPageReady();

    expect(screen.queryByText(hiddenItem.title)).not.toBeInTheDocument();
  });
});
