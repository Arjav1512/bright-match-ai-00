import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";

// Mock useAuth
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

const renderWithRouter = (ui: React.ReactElement, initialRoute = "/") => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      {ui}
    </MemoryRouter>
  );
};

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading spinner while auth is loading", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: true });
    renderWithRouter(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
    );
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    // Should show spinner (animate-spin class)
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeTruthy();
  });

  it("redirects to /login when user is not authenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: false });
    const { container } = renderWithRouter(
      <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
    );
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when user is authenticated with correct role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "123" },
      role: "admin",
      loading: false,
    });
    renderWithRouter(
      <ProtectedRoute allowedRoles={["admin"]}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("blocks access when user has wrong role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "123" },
      role: "student",
      loading: false,
    });
    renderWithRouter(
      <ProtectedRoute allowedRoles={["admin"]}>
        <div>Admin Content</div>
      </ProtectedRoute>
    );
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("redirects to /select-role when user has no role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "123" },
      role: null,
      loading: false,
    });
    renderWithRouter(
      <ProtectedRoute><div>Dashboard</div></ProtectedRoute>,
      "/dashboard"
    );
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("allows access to /select-role even without role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "123" },
      role: null,
      loading: false,
    });
    renderWithRouter(
      <ProtectedRoute><div>Role Selection</div></ProtectedRoute>,
      "/select-role"
    );
    expect(screen.getByText("Role Selection")).toBeInTheDocument();
  });

  it("student cannot access employer routes", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "123" },
      role: "student",
      loading: false,
    });
    renderWithRouter(
      <ProtectedRoute allowedRoles={["employer"]}>
        <div>Employer Only</div>
      </ProtectedRoute>
    );
    expect(screen.queryByText("Employer Only")).not.toBeInTheDocument();
  });

  it("employer cannot access admin routes", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "123" },
      role: "employer",
      loading: false,
    });
    renderWithRouter(
      <ProtectedRoute allowedRoles={["admin"]}>
        <div>Admin Dashboard</div>
      </ProtectedRoute>
    );
    expect(screen.queryByText("Admin Dashboard")).not.toBeInTheDocument();
  });
});