import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import MarketingShell from "../MarketingShell";

// Heavy real modules are mocked; only shell behavior is under test.
vi.mock("../../App.jsx", () => ({ default: () => <div data-testid="app-root" /> }));
vi.mock("../../pages/marketing/MarketingLayout", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="marketing-layout">{children}</div>
  ),
}));

const authState = { isLoaded: true, isSignedIn: false };
vi.mock("@clerk/react", () => ({
  useAuth: () => authState,
}));

const platform = { isDesktop: () => false };
vi.mock("../../lib/desktop/platform", () => ({
  isDesktop: () => platform.isDesktop(),
}));

function Probe() {
  const location = useLocation();
  return <span data-testid="probe-path">{location.pathname}</span>;
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<MarketingShell><h2>landing-body</h2></MarketingShell>} />
        <Route path="/dashboard" element={<MarketingShell><Probe /></MarketingShell>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  authState.isLoaded = true;
  authState.isSignedIn = false;
  platform.isDesktop = () => false;
});

describe("MarketingShell", () => {
  it("desktop: renders the app regardless of auth state (never marketing)", () => {
    platform.isDesktop = () => true;
    authState.isLoaded = false;
    renderAt("/");
    expect(screen.getByTestId("app-root")).toBeTruthy();
    expect(screen.queryByTestId("marketing-layout")).toBeNull();
  });

  it("web + auth unresolved: shows spinner, never marketing flash", () => {
    authState.isLoaded = false;
    renderAt("/");
    expect(screen.queryByTestId("marketing-layout")).toBeNull();
    expect(screen.queryByTestId("app-root")).toBeNull();
  });

  it("web + signed out: shows the landing page", () => {
    renderAt("/");
    expect(screen.getByTestId("marketing-layout")).toBeTruthy();
    expect(screen.getByText("landing-body")).toBeTruthy();
  });

  it("web + signed in on '/': redirects to /dashboard", () => {
    authState.isSignedIn = true;
    renderAt("/");
    expect(screen.getByTestId("probe-path")).toBeTruthy();
    expect(screen.getByText("/dashboard")).toBeTruthy();
  });

  it("web + signed in on inner marketing pages: content stays accessible", () => {
    authState.isSignedIn = true;
    render(
      <MemoryRouter initialEntries={["/pricing"]}>
        <Routes>
          <Route path="/pricing" element={<MarketingShell><h2>pricing-body</h2></MarketingShell>} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText("pricing-body")).toBeTruthy();
  });
});
