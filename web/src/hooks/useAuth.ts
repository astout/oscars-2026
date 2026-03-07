import { useState, useEffect, useCallback } from "react";
import {
  signUp as cognitoSignUp,
  confirmSignUp as cognitoConfirmSignUp,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  getCurrentSession,
  forgotPassword as cognitoForgotPassword,
  confirmForgotPassword as cognitoConfirmForgotPassword,
  resendConfirmationCode as cognitoResendCode,
  type AuthTokens,
  type SignUpParams,
} from "../auth/cognito.js";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  email: string | null;
  error: string | null;
}

function parseIdToken(idToken: string): { sub: string; email: string } {
  const payload = JSON.parse(atob(idToken.split(".")[1]));
  return { sub: payload.sub, email: payload.email };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    email: null,
    error: null,
  });

  // Check for existing session on mount
  useEffect(() => {
    getCurrentSession().then((tokens) => {
      if (tokens) {
        const { sub, email } = parseIdToken(tokens.idToken);
        setState({
          isAuthenticated: true,
          isLoading: false,
          userId: sub,
          email,
          error: null,
        });
      } else {
        setState((s) => ({ ...s, isLoading: false }));
      }
    });
  }, []);

  const setAuthenticated = useCallback((tokens: AuthTokens) => {
    const { sub, email } = parseIdToken(tokens.idToken);
    setState({
      isAuthenticated: true,
      isLoading: false,
      userId: sub,
      email,
      error: null,
    });
  }, []);

  const setError = useCallback((err: unknown) => {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    setState((s) => ({ ...s, error: message, isLoading: false }));
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const signUp = useCallback(
    async (params: SignUpParams) => {
      clearError();
      try {
        await cognitoSignUp(params);
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [clearError, setError]
  );

  const confirmSignUp = useCallback(
    async (email: string, code: string) => {
      clearError();
      try {
        await cognitoConfirmSignUp(email, code);
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [clearError, setError]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      clearError();
      try {
        const tokens = await cognitoSignIn(email, password);
        setAuthenticated(tokens);
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [clearError, setError, setAuthenticated]
  );

  const signOut = useCallback(() => {
    cognitoSignOut();
    setState({
      isAuthenticated: false,
      isLoading: false,
      userId: null,
      email: null,
      error: null,
    });
  }, []);

  const forgotPassword = useCallback(
    async (email: string) => {
      clearError();
      try {
        await cognitoForgotPassword(email);
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [clearError, setError]
  );

  const confirmForgotPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      clearError();
      try {
        await cognitoConfirmForgotPassword(email, code, newPassword);
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [clearError, setError]
  );

  const resendCode = useCallback(
    async (email: string) => {
      clearError();
      try {
        await cognitoResendCode(email);
      } catch (err) {
        setError(err);
        throw err;
      }
    },
    [clearError, setError]
  );

  return {
    ...state,
    signUp,
    confirmSignUp,
    signIn,
    signOut,
    forgotPassword,
    confirmForgotPassword,
    resendCode,
    clearError,
  };
}
