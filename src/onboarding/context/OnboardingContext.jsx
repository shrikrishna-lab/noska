import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from "react";
import { saveOnboardingState, loadOnboardingState, clearOnboardingState } from "../services/onboardingService";

const TOTAL_STEPS = 6;

const initialState = {
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

function reducer(state, action) {
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

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children, initialWorkspaceName, onFinalize, onComplete }) {
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
      saveOnboardingState(state);
    }
  }, [state.step, state.completed, state.skipped, state.form]);

  const goTo = useCallback((s) => dispatch({ type: "GO_TO", step: s }), []);
  const next = useCallback(() => dispatch({ type: "NEXT" }), []);
  const back = useCallback(() => dispatch({ type: "BACK" }), []);
  const setForm = useCallback((val) => dispatch({ type: "SET_FORM", payload: val }), []);
  const setFormField = useCallback((field, value) => dispatch({ type: "SET_FORM_FIELD", field, value }), []);
  const complete = useCallback(async () => {
    const data = formRef.current;
    const pages = await onFinalize?.(data) || [];
    dispatch({ type: "COMPLETE" });
    clearOnboardingState();
    onComplete?.(data, pages);
  }, [onFinalize, onComplete]);
  const skip = useCallback(async () => {
    const data = formRef.current;
    const pages = await onFinalize?.(data) || [];
    dispatch({ type: "SKIP" });
    clearOnboardingState();
    onComplete?.(data, pages);
  }, [onFinalize, onComplete]);
  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
    clearOnboardingState();
  }, []);

  const value = {
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

export function useOnboardingContext() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboardingContext must be used within OnboardingProvider");
  return ctx;
}
