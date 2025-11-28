import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { FAMILY_NAMES } from "@/lib/allowed-names";
import { vi } from "vitest";

const loginMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/components/session-context", () => ({
  useSession: () => ({
    user: null,
    loading: false,
    login: loginMock,
  }),
}));

describe("Home page - connexion", () => {
  it("appelle le login et redirige vers le tableau de bord", async () => {
    loginMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();

    render(<Home />);

    await user.selectOptions(
      screen.getByLabelText(/Prenom/i),
      FAMILY_NAMES[1]
    );
    await user.type(screen.getByLabelText(/Code pin/i), "1234");
    await user.click(screen.getByRole("button", { name: /entrer/i }));

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith(FAMILY_NAMES[1], "1234")
    );
    expect(replaceMock).toHaveBeenCalledWith("/tableau-de-bord");
  });

  it("affiche un message d erreur si le login echoue", async () => {
    loginMock.mockRejectedValueOnce(new Error("Pin incorrect"));
    const user = userEvent.setup();
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      render(<Home />);

      await user.selectOptions(
        screen.getByLabelText(/Prenom/i),
        FAMILY_NAMES[0]
      );
      await user.type(screen.getByLabelText(/Code pin/i), "0000");
      await user.click(screen.getByRole("button", { name: /entrer/i }));

      expect(await screen.findByText(/Pin incorrect/i)).toBeInTheDocument();
      expect(replaceMock).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
