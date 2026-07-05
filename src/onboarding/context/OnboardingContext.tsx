import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from "react";
import { saveOnboardingState, loadOnboardingState, clearOnboardingState } from "../services/onboardingService";
import type { OnboardingFormData, OnboardingPagePreview, OnboardingTeammate } from "../types";

const TOTAL_STEPS = 6;

interface OnboardingState {
  step: number;
  direction: 1 | -1;
  completed: boolean;
  skipped: boolean;
  form: OnboardingFormData;
}

const initialState: OnboardingState = {
  step: 0,
  direction: 1,
  completed: false,
  skipped: false,
  form: {
    workspaceName: "",
    workspaceIcon: "🏢",
    role: "",
    useCase: [],
    teammates: [],
    template: ""
  }
};

type OnboardingAction =
  | { type: "GO_TO"; step: number }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "SET_FORM"; payload: Partial<OnboardingFormData> }
  | { type: "SET_FORM_FIELD"; field: keyof OnboardingFormData; value: OnboardingFormData[keyof OnboardingFormData] }
  | { type: "COMPLETE" }
  | { type: "SKIP" }
  | { type: "RESET" }
  | { type: "RESTORE"; payload: Partial<OnboardingState> };

function reducer(state: OnboardingState, action: OnboardingAction): OnboardingState {
  switch (action.type) {
    case "GO_TO": {
      const target = Math.max(0, Math.min(action.step, TOTAL_STEPS - 1));
      return { ...state, step: target, direction: target > state.step ? 1 : -1 };
    }
    case "NEXT": {
      const next = Math.min(state.step + 1, TOTAL_STEPS - 1);
      return { ...state, step: next, direction: 1 };
    }
    case "BACK": {
      const prev = Math.max(state.step - 1, 0);
      return { ...state, step: prev, direction: -1 };
    }
    case "SET_FORM":
      return { ...state, form: { ...state.form, ...action.payload } };
    case "SET_FORM_FIELD":
      return { ...state, form: { ...state.form, [action.field]: action.value } };
    case "COMPLETE":
      return { ...state, completed: true, step: TOTAL_STEPS - 1 };
    case "SKIP":
      return { ...state, skipped: true, completed: true };
    case "RESET":
      return { ...initialState, step: 0, direction: 1 };
    case "RESTORE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export interface OnboardingContextValue extends OnboardingState {
  goTo: (step: number) => void;
  next: () => void;
  back: () => void;
  setForm: (val: Partial<OnboardingFormData>) => void;
  setFormField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void;
  complete: () => Promise<void>;
  skip: () => Promise<void>;
  reset: () => void;
  totalSteps: number;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export interface OnboardingProviderProps {
  children: ReactNode;
  initialWorkspaceName?: string;
  onFinalize?: (data: OnboardingFormData) => Promise<OnboardingPagePreview[]> | OnboardingPagePreview[];
  onComplete?: (data: OnboardingFormData, pages: OnboardingPagePreview[]) => void;
}

export function OnboardingProvider({ children, initialWorkspaceName, onFinalize, onComplete }: OnboardingProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => ({
    ...init,
    form: { ...init.form, workspaceName: initialWorkspaceName || "" }
  }));

  const restored = useRef(false);

  const formRef = useRef(state.form);
  formRef.current = state.form;

  useEffect(() => {
    if (restored.current) return;
    const saved = loadOnboardingState();
    if (saved && !saved.completed && !saved.skipped) {
      dispatch({ type: "RESTORE", payload: saved });
    }
    restored.current = true;
  }, []);

  useEffect(() => {
    if (state.step > 0 && !state.completed && !state.skipped) {
      // saveOnboardingState just JSON-serializes whatever it's given (see
      // onboardingService.ts) — the persisted shape is intentionally
      // untyped there, so widen at this one call site instead of loosening
      // OnboardingState itself.
      saveOnboardingState(state as unknown as Record<string, unknown>);
    }
  }, [state.step, state.completed, state.skipped, state.form]);

  const goTo = useCallback((s: number) => dispatch({ type: "GO_TO", step: s }), []);
  const next = useCallback(() => dispatch({ type: "NEXT" }), []);
  const back = useCallback(() => dispatch({ type: "BACK" }), []);
  const setForm = useCallback((val: Partial<OnboardingFormData>) => dispatch({ type: "SET_FORM", payload: val }), []);
  const setFormField = useCallback(
    <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) =>
      dispatch({ type: "SET_FORM_FIELD", field, value }),
    []
  );
  const complete = useCallback(async () => {
    const data = formRef.current;
    const pages = (await onFinalize?.(data)) || [];
    dispatch({ type: "COMPLETE" });
    clearOnboardingState();
    onComplete?.(data, pages);
  }, [onFinalize, onComplete]);
  const skip = useCallback(async () => {
    const data = formRef.current;
    const pages = (await onFinalize?.(data)) || [];
    dispatch({ type: "SKIP" });
    clearOnboardingState();
    onComplete?.(data, pages);
  }, [onFinalize, onComplete]);
  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    clearOnboardingState();
  }, []);

  const value: OnboardingContextValue = {
    ...state,
    goTo, next, back, setForm, setFormField, complete, skip, reset,
    totalSteps: TOTAL_STEPS
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboardingContext must be used within OnboardingProvider");
  return ctx;
}
