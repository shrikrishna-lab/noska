// TEMPORARY dev-only Clerk stub for previewing on origins Clerk rejects.
import type { ReactNode } from "react";
export function ClerkProvider({ children }: { children: ReactNode }) { return <>{children}</>; }
export function useAuth() { return { isLoaded: true, isSignedIn: false, userId: null, sessionId: null, actor: null, orgId: null, orgRole: null }; }
export function useUser() { return { isLoaded: true, isSignedIn: false, user: null }; }
export function useClerk() { return { signOut: () => {}, client: {}, openSignIn: () => {} }; }
export function useSession() { return { isLoaded: true, session: null }; }
export function useSignIn() { return { isLoaded: true, signIn: null }; }
export function useSignUp() { return { isLoaded: true, signUp: null }; }
export function RedirectToSignIn() { return null; }
export function SignIn() { return null; }
export function SignUp() { return null; }
