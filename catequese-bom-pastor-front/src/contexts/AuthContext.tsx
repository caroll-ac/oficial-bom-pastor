import { createContext, useContext, useState, ReactNode, useEffect } from "react";

export type UserRole =
  | "responsavel"
  | "catequista"
  | "admin"
  | "secretaria"
  | "coordenador";

interface User {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  perfis?: string[];
}

type AuthUserInput = Omit<User, "role"> & {
  role?: string;
};

interface AuthContextType {
  role: UserRole | null;
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (role: string, accessToken: string, refreshToken: string, user: AuthUserInput) => void;
  logout: () => void;
  getAuthHeader: () => { Authorization: string } | {};
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeRole(role: string | null | undefined): UserRole | null {
  const normalized = String(role || "").toLowerCase().trim();

  if (
    normalized === "admin" ||
    normalized === "administrador" ||
    normalized === "adminstrador"
  ) {
    return "admin";
  }

  if (
    normalized === "secretaria" ||
    normalized === "secretary"
  ) {
    return "secretaria";
  }

  if (
    normalized === "coordenador" ||
    normalized === "coordinator"
  ) {
    return "coordenador";
  }

  if (
    normalized === "catequista" ||
    normalized === "catechist"
  ) {
    return "catequista";
  }

  if (
    normalized === "responsavel" ||
    normalized === "responsável" ||
    normalized === "parent" ||
    normalized === "pai/mãe"
  ) {
    return "responsavel";
  }

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Recupera os dados do localStorage ao carregar
  useEffect(() => {
    const savedRole = localStorage.getItem("userRole");
    const savedToken = localStorage.getItem("accessToken");
    const savedUser = localStorage.getItem("user");
    const normalizedSavedRole = normalizeRole(savedRole);
    
    if (normalizedSavedRole && savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as AuthUserInput;
        const normalizedUserRole = normalizeRole(parsedUser?.role) || normalizedSavedRole;
        const normalizedUser: User = {
          ...parsedUser,
          role: normalizedUserRole,
        };

        setRole(normalizedSavedRole);
        setUser(normalizedUser);
        setAccessToken(savedToken);
        setIsAuthenticated(true);
      } catch (error) {
        // Se houver erro ao parsear, limpa tudo
        localStorage.removeItem("userRole");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      }
    }
  }, []);

  const login = (newRole: string, newAccessToken: string, refreshToken: string, newUser: AuthUserInput) => {
    const normalizedRole = normalizeRole(newRole) || "responsavel";
    const normalizedUserRole = normalizeRole(newUser?.role) || normalizedRole;
    const normalizedUser: User = {
      ...newUser,
      role: normalizedUserRole,
    };

    setRole(normalizedRole);
    setUser(normalizedUser);
    setAccessToken(newAccessToken);
    setIsAuthenticated(true);
    
    localStorage.setItem("userRole", normalizedRole);
    localStorage.setItem("accessToken", newAccessToken);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setRole(null);
    setUser(null);
    setAccessToken(null);
    setIsAuthenticated(false);
    
    localStorage.removeItem("userRole");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const getAuthHeader = () => {
    if (accessToken) {
      return { Authorization: `Bearer ${accessToken}` };
    }
    return {};
  };

  return (
    <AuthContext.Provider value={{ role, user, isAuthenticated, accessToken, login, logout, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}
