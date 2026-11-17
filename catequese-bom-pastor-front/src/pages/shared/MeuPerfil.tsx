import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import { ADMIN_NAV_ITEMS, CATECHIST_NAV_ITEMS, COORDENADOR_NAV_ITEMS, PARENT_NAV_ITEMS, SECRETARIA_NAV_ITEMS } from "@/lib/sidebarNavItems";
import { Camera, Cross, Loader2, LogOut, Menu, Save, Trash2, UserRound } from "lucide-react";

type ProfileData = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  fotoUrl: string | null;
  criadoEm: string;
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

function getInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "U";
}

export default function MeuPerfil() {
  const { role, logout } = useAuth();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacaoNovaSenha, setConfirmacaoNovaSenha] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const navigationItems = role === "admin"
    ? ADMIN_NAV_ITEMS
    : role === "catequista"
      ? CATECHIST_NAV_ITEMS
      : role === "secretaria"
        ? SECRETARIA_NAV_ITEMS
        : role === "coordenador"
          ? COORDENADOR_NAV_ITEMS
          : PARENT_NAV_ITEMS;

  useEffect(() => {
    let active = true;
    api.get(API_ROUTES.auth.me)
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.message || "Não foi possível carregar o perfil.");
        if (!active) return;
        setProfile(payload);
        setNome(payload.nome ?? "");
        setTelefone(payload.telefone ?? "");
        setFotoPreview(payload.fotoUrl ?? null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast({
          title: "Erro ao carregar perfil",
          description: error instanceof Error ? error.message : "Tente novamente.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [toast]);

  useEffect(() => () => {
    if (fotoPreview?.startsWith("blob:")) URL.revokeObjectURL(fotoPreview);
  }, [fotoPreview]);

  const handlePhotoChange = (file?: File) => {
    setPhotoError("");
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) {
      setPhotoError("Escolha uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setPhotoError("A foto deve ter no máximo 5 MB.");
      return;
    }
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    setRemoverFoto(false);
  };

  const handleRemovePhoto = () => {
    setFotoFile(null);
    setFotoPreview(null);
    setRemoverFoto(Boolean(profile?.fotoUrl));
    setPhotoError("");
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nome.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe seu nome.", variant: "destructive" });
      return;
    }

    const changingPassword = Boolean(senhaAtual || novaSenha || confirmacaoNovaSenha);
    if (changingPassword) {
      if (!senhaAtual || !novaSenha || !confirmacaoNovaSenha) {
        toast({ title: "Dados de senha incompletos", description: "Preencha os três campos de senha.", variant: "destructive" });
        return;
      }
      if (novaSenha !== confirmacaoNovaSenha) {
        toast({ title: "Senhas diferentes", description: "A nova senha e a confirmação não coincidem.", variant: "destructive" });
        return;
      }
      if (!STRONG_PASSWORD.test(novaSenha)) {
        toast({ title: "Senha fraca", description: "Use 12 caracteres ou mais, com maiúscula, minúscula, número e símbolo.", variant: "destructive" });
        return;
      }
    }

    const formData = new FormData();
    formData.append("nome", nome.trim());
    formData.append("telefone", telefone.trim());
    formData.append("removerFoto", String(removerFoto));
    if (fotoFile) formData.append("fotoPerfil", fotoFile);
    if (changingPassword) {
      formData.append("senhaAtual", senhaAtual);
      formData.append("novaSenha", novaSenha);
      formData.append("confirmacaoNovaSenha", confirmacaoNovaSenha);
    }

    setSaving(true);
    try {
      const response = await api.patch(API_ROUTES.auth.me, formData);
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Não foi possível salvar as alterações.");

      setProfile(payload);
      setNome(payload.nome ?? "");
      setTelefone(payload.telefone ?? "");
      setFotoFile(null);
      setFotoPreview(payload.fotoUrl ?? null);
      setRemoverFoto(false);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacaoNovaSenha("");
      window.dispatchEvent(new Event("profile-updated"));
      toast({ title: "Perfil atualizado", description: "Suas alterações foram salvas." });
    } catch (error: unknown) {
      toast({
        title: "Não foi possível salvar",
        description: error instanceof Error ? error.message : "Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flex min-h-screen bg-background transition-[padding] duration-300 ${sidebarOpen ? "lg:pl-64" : "lg:pl-0"}`}>
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Cross className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold">Catequese</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Fechar menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <SidebarUser />
          <SidebarNav items={navigationItems} pathname={location.pathname} />
          <div className="border-t p-4">
            <Button variant="nav" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={logout}>
              <LogOut className="mr-3 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b bg-card">
          <div className="flex h-16 items-center gap-4 px-4">
            <Button variant="ghost" size="icon" className={sidebarOpen ? "lg:hidden" : ""} onClick={toggleSidebar} aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold">Meu perfil</h1>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Meu perfil</h2>
              <p className="text-sm text-muted-foreground">Atualize seus dados e sua foto de perfil.</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Dados pessoais</CardTitle>
                    <CardDescription>Seu e-mail de acesso não pode ser alterado por esta tela.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                      <Avatar className="h-24 w-24">
                        {fotoPreview && <AvatarImage src={fotoPreview} alt={`Foto de ${nome}`} />}
                        <AvatarFallback><UserRound className="h-10 w-10" /></AvatarFallback>
                      </Avatar>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" asChild>
                          <label className="cursor-pointer">
                            <Camera className="mr-2 h-4 w-4" /> Escolher foto
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="sr-only"
                              onChange={(event) => handlePhotoChange(event.target.files?.[0])}
                            />
                          </label>
                        </Button>
                        {fotoPreview && (
                          <Button type="button" variant="ghost" onClick={handleRemovePhoto}>
                            <Trash2 className="mr-2 h-4 w-4" /> Remover foto
                          </Button>
                        )}
                        <p className="basis-full text-xs text-muted-foreground">JPG, PNG ou WEBP até 5 MB.</p>
                        {photoError && <p className="basis-full text-sm text-destructive">{photoError}</p>}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="profile-name">Nome</Label>
                        <Input id="profile-name" value={nome} onChange={(event) => setNome(event.target.value)} maxLength={100} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-email">E-mail</Label>
                        <Input id="profile-email" value={profile?.email ?? ""} readOnly />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="profile-phone">Telefone</Label>
                        <Input id="profile-phone" type="tel" value={telefone} onChange={(event) => setTelefone(event.target.value)} maxLength={30} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Segurança</CardTitle>
                    <CardDescription>Deixe em branco para manter sua senha atual.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Senha atual</Label>
                      <Input id="current-password" type="password" autoComplete="current-password" value={senhaAtual} onChange={(event) => setSenhaAtual(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nova senha</Label>
                      <Input id="new-password" type="password" autoComplete="new-password" value={novaSenha} onChange={(event) => setNovaSenha(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                      <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmacaoNovaSenha} onChange={(event) => setConfirmacaoNovaSenha(event.target.value)} />
                    </div>
                    <p className="text-xs text-muted-foreground sm:col-span-3">A nova senha deve ter 12 caracteres ou mais, com maiúscula, minúscula, número e símbolo.</p>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving || loading}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar alterações
                  </Button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}