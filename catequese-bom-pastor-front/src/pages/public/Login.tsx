import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cross, Eye, EyeOff, LogIn } from "lucide-react";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha e-mail e senha para continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await api.postPublic(API_ROUTES.auth.login, { email, senha: password });

      if (!response.ok) {
        let errorMessage = "Erro ao fazer login";

        try {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorMessage;
        } catch {
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
          }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data?.user || !data?.accessToken || !data?.refreshToken) {
        throw new Error("Resposta de login inválida");
      }
      
      login(data.user.role, data.accessToken, data.refreshToken, data.user);
      
      toast({
        title: "Login realizado!",
        description: `Bem-vindo(a), ${data.user.nome}!`,
      });

      // Redireciona baseado no role (normalizar para minúsculas)
      const role = String(data.user.role || "").toLowerCase().trim();

      if (
        role === "admin" ||
        role === "administrador" ||
        role === "adminstrador"
      ) {
        navigate("/admin");
      } else if (role === "secretaria") {
        navigate("/secretaria/matriculas");
      } else if (role === "coordenador") {
        navigate("/coordenador/matriculas");
      } else if (
        role === "catequista" ||
        role === "catechist"
      ) {
        navigate("/catequista");
      } else {
        navigate("/pais");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <MainLayout showFooter={false}>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gradient-to-br from-background via-muted/30 to-sage-light/20 px-4 py-12">
        <Card variant="elevated" className="w-full max-w-md animate-slide-up">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Cross className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">Bem-vindo(a) de volta</CardTitle>
              <CardDescription className="mt-2">
                Acesse sua conta para acompanhar a catequese
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link
                    to="/esqueci-senha"
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueci a senha
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                <LogIn className="mr-2 h-4 w-4" />
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
