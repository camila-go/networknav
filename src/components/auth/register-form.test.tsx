import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RegisterForm } from "./register-form";

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
}));

// Mock useToast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should render all required fields", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/position/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("should render company field as optional", () => {
    render(<RegisterForm />);
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
  });

  it("should render submit button", () => {
    render(<RegisterForm />);
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("should render password strength indicators", () => {
    render(<RegisterForm />);
    expect(screen.getByText(/8\+ characters/i)).toBeInTheDocument();
    expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/lowercase letter/i)).toBeInTheDocument();
    expect(screen.getByText(/number/i)).toBeInTheDocument();
  });

  it("should update password strength indicators as user types", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />);

    const passwordInput = screen.getByLabelText(/^password$/i);

    // Initially all should use the unmet style (text-white/40)
    const indicators = screen.getAllByText(/8\+ characters|uppercase|lowercase|number/i);
    indicators.forEach((el) => {
      expect(el.closest("div")).toHaveClass("text-white/40");
    });

    // Type a password that meets all requirements
    await user.type(passwordInput, "StrongPass1");

    await waitFor(() => {
      const met8Chars = screen.getByText(/8\+ characters/i).closest("div");
      expect(met8Chars).toHaveClass("text-cyan-400");
    });
  });

  it("should call API with correct data on valid submit", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { user: {} } }),
    } as Response);

    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/position/i), "VP of Product");
    await user.type(screen.getByLabelText(/title/i), "Product Leader");
    await user.type(screen.getByLabelText(/^password$/i), "StrongPass1");
    await user.type(screen.getByLabelText(/confirm password/i), "StrongPass1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/register", expect.objectContaining({
        method: "POST",
      }));
    });
  });

  it("should redirect to onboarding on successful registration", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: true, data: { user: {} } }),
    } as Response);

    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/position/i), "VP of Product");
    await user.type(screen.getByLabelText(/title/i), "Product Leader");
    await user.type(screen.getByLabelText(/^password$/i), "StrongPass1");
    await user.type(screen.getByLabelText(/confirm password/i), "StrongPass1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("should show error toast on failed registration", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      json: async () => ({ success: false, error: "Email already exists" }),
    } as Response);

    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/position/i), "VP of Product");
    await user.type(screen.getByLabelText(/title/i), "Product Leader");
    await user.type(screen.getByLabelText(/^password$/i), "StrongPass1");
    await user.type(screen.getByLabelText(/confirm password/i), "StrongPass1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Registration failed",
        })
      );
    });
  });

  it("should show error toast on network failure", async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network error"));

    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/full name/i), "Jane Smith");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    await user.type(screen.getByLabelText(/position/i), "VP of Product");
    await user.type(screen.getByLabelText(/title/i), "Product Leader");
    await user.type(screen.getByLabelText(/^password$/i), "StrongPass1");
    await user.type(screen.getByLabelText(/confirm password/i), "StrongPass1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

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
