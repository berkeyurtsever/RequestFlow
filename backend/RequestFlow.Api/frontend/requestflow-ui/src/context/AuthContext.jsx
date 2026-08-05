import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

const TOKEN_KEY = "token";
const USER_KEY = "user";

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);

  delete api.defaults.headers.common.Authorization;
}

function parseStoredUser(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    console.error(
      "Stored user information could not be parsed:",
      error
    );

    return null;
  }
}

function getStoredSession() {
  const localToken =
    localStorage.getItem(TOKEN_KEY);

  if (localToken) {
    return {
      token: localToken,
      user: parseStoredUser(
        localStorage.getItem(USER_KEY)
      ),
      rememberMe: true
    };
  }

  const sessionToken =
    sessionStorage.getItem(TOKEN_KEY);

  if (sessionToken) {
    return {
      token: sessionToken,
      user: parseStoredUser(
        sessionStorage.getItem(USER_KEY)
      ),
      rememberMe: false
    };
  }

  return {
    token: null,
    user: null,
    rememberMe: false
  };
}

function saveSession({
  token,
  user,
  rememberMe
}) {
  const selectedStorage = rememberMe
    ? localStorage
    : sessionStorage;

  const unusedStorage = rememberMe
    ? sessionStorage
    : localStorage;

  unusedStorage.removeItem(TOKEN_KEY);
  unusedStorage.removeItem(USER_KEY);

  selectedStorage.setItem(
    TOKEN_KEY,
    token
  );

  selectedStorage.setItem(
    USER_KEY,
    JSON.stringify(user)
  );

  api.defaults.headers.common.Authorization =
    `Bearer ${token}`;
}

function decodeJwtPayload(token) {
  if (!token) {
    return null;
  }

  try {
    const payloadPart =
      token.split(".")[1];

    if (!payloadPart) {
      return null;
    }

    const normalizedPayload =
      payloadPart
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const paddingLength =
      (4 -
        (normalizedPayload.length % 4)) %
      4;

    const paddedPayload =
      normalizedPayload +
      "=".repeat(paddingLength);

    const decodedPayload =
      decodeURIComponent(
        atob(paddedPayload)
          .split("")
          .map(character => {
            const hexadecimalValue =
              character
                .charCodeAt(0)
                .toString(16)
                .padStart(2, "0");

            return `%${hexadecimalValue}`;
          })
          .join("")
      );

    return JSON.parse(decodedPayload);
  } catch (error) {
    console.error(
      "JWT token could not be decoded:",
      error
    );

    return null;
  }
}

function normalizeUser(
  responseData,
  token
) {
  const source =
    responseData?.user ||
    responseData?.currentUser ||
    responseData?.data?.user ||
    responseData ||
    {};

  const claims =
    decodeJwtPayload(token) || {};

  const id =
    source.id ??
    source.userId ??
    source.sub ??
    claims.sub ??
    claims.nameid ??
    null;

  const email =
    source.email ??
    claims.email ??
    "";

  const fullName =
    source.fullName ||
    source.name ||
    claims.name ||
    email ||
    "RequestFlow User";

  const role =
    source.role ||
    claims.role ||
    "User";

  return {
    ...source,
    id,
    userId: id,
    fullName,
    name: fullName,
    email,
    role,
    createdAt:
      source.createdAt ?? null
  };
}

function extractToken(responseData) {
  return (
    responseData?.token ||
    responseData?.accessToken ||
    responseData?.jwtToken ||
    responseData?.data?.token ||
    responseData?.data?.accessToken ||
    null
  );
}

function getBackendMessage(
  requestError
) {
  const responseData =
    requestError.response?.data;

  if (
    typeof responseData === "string"
  ) {
    return responseData;
  }

  return (
    responseData?.message ||
    responseData?.detail ||
    responseData?.title ||
    null
  );
}

export function AuthProvider({
  children
}) {
  const initialSession =
    getStoredSession();

  const [token, setToken] =
    useState(initialSession.token);

  const [user, setUser] =
    useState(initialSession.user);

  const [
    isAuthLoading,
    setIsAuthLoading
  ] = useState(true);

  const loadCurrentUser =
    useCallback(
      async currentToken => {
        const activeToken =
          currentToken ||
          getStoredSession().token;

        if (!activeToken) {
          setToken(null);
          setUser(null);
          return null;
        }

        api.defaults.headers.common.Authorization =
          `Bearer ${activeToken}`;

        const response =
          await api.get("/Auth/me");

        const currentUser =
          normalizeUser(
            response.data,
            activeToken
          );

        const rememberMe = Boolean(
          localStorage.getItem(
            TOKEN_KEY
          )
        );

        saveSession({
          token: activeToken,
          user: currentUser,
          rememberMe
        });

        setToken(activeToken);
        setUser(currentUser);

        return currentUser;
      },
      []
    );

  useEffect(() => {
    const restoreSession =
      async () => {
        const storedSession =
          getStoredSession();

        if (!storedSession.token) {
          setToken(null);
          setUser(null);
          setIsAuthLoading(false);
          return;
        }

        try {
          await loadCurrentUser(
            storedSession.token
          );
        } catch (requestError) {
          console.error(
            "User session could not be restored:",
            requestError
          );

          clearStoredSession();
          setToken(null);
          setUser(null);
        } finally {
          setIsAuthLoading(false);
        }
      };

    void restoreSession();
  }, [loadCurrentUser]);

  const login = useCallback(
    async (
      emailOrCredentials,
      passwordValue,
      rememberMeValue = false
    ) => {
      const credentials =
        typeof emailOrCredentials ===
        "object"
          ? emailOrCredentials
          : {
              email:
                emailOrCredentials,
              password:
                passwordValue,
              rememberMe:
                rememberMeValue
            };

      const email = String(
        credentials?.email || ""
      )
        .trim()
        .toLowerCase();

      const password = String(
        credentials?.password || ""
      );

      const rememberMe = Boolean(
        credentials?.rememberMe
      );

      if (!email) {
        throw new Error(
          "Email address is required."
        );
      }

      if (!password) {
        throw new Error(
          "Password is required."
        );
      }

      try {
        const response =
          await api.post(
            "/Auth/login",
            {
              email,
              password
            }
          );

        const responseData =
          response.data || {};

        const authToken =
          extractToken(responseData);

        if (!authToken) {
          throw new Error(
            "The login response did not include a JWT token."
          );
        }

        let authenticatedUser =
          normalizeUser(
            responseData,
            authToken
          );

        saveSession({
          token: authToken,
          user: authenticatedUser,
          rememberMe
        });

        setToken(authToken);
        setUser(authenticatedUser);

        if (
          !authenticatedUser.id ||
          !authenticatedUser.email
        ) {
          authenticatedUser =
            await loadCurrentUser(
              authToken
            );
        }

        return {
          ...responseData,
          token: authToken,
          user: authenticatedUser
        };
      } catch (requestError) {
        console.error(
          "Login request failed:",
          requestError
        );

        clearStoredSession();
        setToken(null);
        setUser(null);

        if (
          requestError instanceof Error &&
          !requestError.response
        ) {
          if (
            requestError.message ===
            "The login response did not include a JWT token."
          ) {
            throw requestError;
          }
        }

        const status =
          requestError.response?.status;

        const backendMessage =
          getBackendMessage(
            requestError
          );

        if (status === 400) {
          throw new Error(
            backendMessage ||
            "The login information is not valid."
          );
        }

        if (status === 401) {
          throw new Error(
            backendMessage ||
            "Email address or password is incorrect."
          );
        }

        if (status === 403) {
          throw new Error(
            backendMessage ||
            "This account is not authorized to sign in."
          );
        }

        if (status === 404) {
          throw new Error(
            "The login endpoint could not be found."
          );
        }

        if (status === 500) {
          throw new Error(
            backendMessage ||
            "The server encountered an error during sign in."
          );
        }

        if (
          !requestError.response
        ) {
          throw new Error(
            "The backend server could not be reached."
          );
        }

        throw new Error(
          backendMessage ||
          "Sign in could not be completed."
        );
      }
    },
    [loadCurrentUser]
  );

  const register = useCallback(
    async registrationData => {
      try {
        const response =
          await api.post(
            "/Auth/register",
            {
              fullName:
                registrationData
                  ?.fullName
                  ?.trim(),

              email:
                registrationData
                  ?.email
                  ?.trim()
                  .toLowerCase(),

              password:
                registrationData
                  ?.password
            }
          );

        return response.data;
      } catch (requestError) {
        throw new Error(
          getBackendMessage(
            requestError
          ) ||
          "The account could not be created."
        );
      }
    },
    []
  );

  const forgotPassword =
    useCallback(async email => {
      try {
        const response =
          await api.post(
            "/Auth/forgot-password",
            {
              email: String(
                email || ""
              )
                .trim()
                .toLowerCase()
            }
          );

        return response.data;
      } catch (requestError) {
        throw new Error(
          getBackendMessage(
            requestError
          ) ||
          "The password reset request could not be completed."
        );
      }
    }, []);

  const changePassword =
    useCallback(
      async passwordData => {
        try {
          const response =
            await api.post(
              "/Auth/change-password",
              passwordData
            );

          return response.data;
        } catch (requestError) {
          throw new Error(
            getBackendMessage(
              requestError
            ) ||
            "The password could not be changed."
          );
        }
      },
      []
    );

  const refreshUser =
    useCallback(async () => {
      if (!token) {
        return null;
      }

      return loadCurrentUser(token);
    }, [
      loadCurrentUser,
      token
    ]);

  const logout = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
  }, []);

  const normalizedRole = String(
    user?.role || "User"
  )
    .trim()
    .toLowerCase();

  const contextValue = useMemo(
    () => ({
      user,
      setUser,
      token,

      isAuthLoading,
      isLoading:
        isAuthLoading,
      loading:
        isAuthLoading,

      isAuthenticated:
        Boolean(token && user),

      isAdmin:
        normalizedRole === "admin",

      isSupervisor:
        normalizedRole ===
        "supervisor",

      isStaff:
        normalizedRole === "staff",

      isManagement:
        normalizedRole === "admin" ||
        normalizedRole ===
          "supervisor",

      login,
      register,
      logout,
      forgotPassword,
      changePassword,
      refreshUser
    }),
    [
      user,
      token,
      isAuthLoading,
      normalizedRole,
      login,
      register,
      logout,
      forgotPassword,
      changePassword,
      refreshUser
    ]
  );

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}

export default AuthContext;