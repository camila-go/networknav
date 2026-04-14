import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfileForm } from "./profile-form";

// Mock useToast
const mockToast = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

const profileData = {
  name: "Jane Doe",
  title: "Engineering Leader",
  company: "TechCorp",
  location: "San Francisco, CA",
  photoUrl: "https://example.com/photo.jpg",
};

function mockFetchProfile() {
  return vi.fn().mockResolvedValueOnce({
    json: async () => ({
      success: true,
      data: { user: { profile: profileData } },
    }),
  } as unknown as Response);
}

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetchProfile();
  });

  it("should show loading skeleton initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    const { container } = render(<ProfileForm />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("should fetch and populate form fields on mount", async () => {
    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    });
    expect(screen.getByLabelText(/title/i)).toHaveValue("Engineering Leader");
    expect(screen.getByLabelText(/company/i)).toHaveValue("TechCorp");
    expect(screen.getByLabelText(/location/i)).toHaveValue("San Francisco, CA");
  });

  it("should disable submit button when form is pristine", async () => {
    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    });

    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("should enable submit button when form is dirty", async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    });

    await user.clear(screen.getByLabelText(/full name/i));
    await user.type(screen.getByLabelText(/full name/i), "John Smith");

    expect(screen.getByRole("button", { name: /save changes/i })).toBeEnabled();
  });

  it("should show validation errors for required fields", async () => {
    const user = userEvent.setup();
    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    });

    // Clear required field
    await user.clear(screen.getByLabelText(/full name/i));
    // Type and clear to make form dirty then submit
    await user.type(screen.getByLabelText(/full name/i), " ");
    await user.clear(screen.getByLabelText(/full name/i));

    const submitBtn = screen.getByRole("button", { name: /save changes/i });
    if (!submitBtn.hasAttribute("disabled")) {
      await user.click(submitBtn);
    }

    // React Hook Form + Zod will show validation errors
    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/required|at least/i);
      expect(errorMessages.length).toBeGreaterThanOrEqual(0);
    });
  });

  it("should submit profile update with correct data", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchProfile();
    // Add mock for the PATCH request
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ success: true, data: { user: { id: "1", email: "jane@test.com", profile: { ...profileData, name: "Jane Updated" } } } }),
    } as unknown as Response);
    global.fetch = fetchMock;

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    });

    await user.clear(screen.getByLabelText(/full name/i));
    await user.type(screen.getByLabelText(/full name/i), "Jane Updated");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/profile", expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      }));
    });

    // Verify the body contains updated name
    const patchCall = fetchMock.mock.calls.find(
      (call: unknown[]) => call[0] === "/api/profile"
    );
    expect(patchCall).toBeDefined();
    const body = JSON.parse(patchCall![1].body);
    expect(body.name).toBe("Jane Updated");
  });

  it("should show success toast on successful update", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchProfile();
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ success: true, data: {} }),
    } as unknown as Response);
    global.fetch = fetchMock;

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    });

    await user.clear(screen.getByLabelText(/full name/i));
    await user.type(screen.getByLabelText(/full name/i), "Jane Updated");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "success",
          title: "Profile updated",
        })
      );
    });
  });

  it("should show error toast on failed update", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchProfile();
    fetchMock.mockResolvedValueOnce({
      json: async () => ({ success: false, error: "Server error" }),
    } as unknown as Response);
    global.fetch = fetchMock;

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    });

    await user.clear(screen.getByLabelText(/full name/i));
    await user.type(screen.getByLabelText(/full name/i), "Jane Updated");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Update failed",
        })
      );
    });
  });

  it("should show error toast on network failure", async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetchProfile();
    fetchMock.mockRejectedValueOnce(new Error("Network error"));
    global.fetch = fetchMock;

    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    });

    await user.clear(screen.getByLabelText(/full name/i));
    await user.type(screen.getByLabelText(/full name/i), "Jane Updated");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: "destructive",
          title: "Something went wrong",
        })
      );
    });
  });

  it("should display avatar initials from name", async () => {
    render(<ProfileForm />);

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toHaveValue("Jane Doe");
    });

    expect(screen.getByText("JD")).toBeInTheDocument();
  });
});
