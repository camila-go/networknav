import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: vi.fn(),
    forward: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should render email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("should render submit button", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument();
  });

  it("should render forgot password link", () => {
    render(<LoginForm />);
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it("should render Corporate SSO link", () => {
    render(<LoginForm />);
    const sso = screen.getByRole("link", { name: /sign in with corporate sso/i });
    expect(sso).toHaveAttribute("href", "/api/auth/sso/login");
  });

  it("should toggle password visibility", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute("type", "password");

    // Click the toggle button (the one next to the password field)
    const toggleButtons = screen.getAllByRole("button");
    const toggleBtn = toggleButtons.find((btn) => btn.getAttribute("type") === "button");
    if (toggleBtn) {
      await user.click(toggleBtn);
      expect(passwordInput).toHaveAttribute("type", "text");
    }
  });

  it("should show validation errors for empty fields on submit", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      // React Hook Form + Zod will show validation errors
      const errorMessages = screen.getAllByText(/./i).filter(
        (el) => el.classList.contains("text-red-400")
      );
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it("should call API with correct data on submit", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { user: { questionnaireCompleted: true } },
      }),
    } as Response);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "Password1");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/login",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: "test@example.com", password: "Password1" }),
        })
      );
    });
  });

  it("should show error toast on failed login", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: "Invalid credentials" }),
    } as Response);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "Password1");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Login failed",
        })
      );
    });
  });

  it("should redirect to dashboard when questionnaire completed", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { user: { questionnaireCompleted: true } },
      }),
    } as Response);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "Password1");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("should redirect to onboarding when questionnaire not completed", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { user: { questionnaireCompleted: false } },
      }),
    } as Response);

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "Password1");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("should show error toast on network failure", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "Password1");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Something went wrong",
        })
      );
    });
  });
});
