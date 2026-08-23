import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LoginRoute from "../LoginRoute";

vi.mock("../../App.jsx", () => ({ default: () => <div data-testid="login-flow" /> }));

const authState = { isLoaded: true, isSignedIn: false };
vi.mock("@clerk/react", () => ({ useAuth: () => authState }));

const platform = { isDesktop: () => false };
vi.mock("../../lib/desktop/platform", () => ({ isDesktop: () => platform.isDesktop() }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/dashboard" element={<div data-testid="workspace">workspace</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  authState.isLoaded = true;
  authState.isSignedIn = false;
  platform.isDesktop = () => false;
});

describe("LoginRoute", () => {
  it("web + cached session: goes straight to the workspace (no login form)", () => {
    authState.isSignedIn = true;
    renderAt("/login");
    expect(screen.getByTestId("workspace")).toBeTruthy();
    expect(screen.queryByTestId("login-flow")).toBeNull();
  });

  it("web + no session: shows the login experience", () => {
    renderAt("/login");
    expect(screen.getByTestId("login-flow")).toBeTruthy();
  });

  it("web + session unresolved: spinner instead of login flash", () => {
    authState.isLoaded = false;
    renderAt("/login");
    expect(screen.queryByTestId("login-flow")).toBeNull();
    expect(screen.queryByTestId("workspace")).toBeNull();
  });

  it("desktop: always delegates to the App auth flow", () => {
    platform.isDesktop = () => true;
    authState.isSignedIn = true; // even signed in — App owns desktop routing
    renderAt("/login");
    expect(screen.getByTestId("login-flow")).toBeTruthy();
    expect(screen.queryByTestId("workspace")).toBeNull();
  });
});
