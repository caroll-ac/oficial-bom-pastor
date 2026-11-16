import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { ADMIN_NAV_ITEMS } from "@/lib/sidebarNavItems";
import { API_ROUTES } from "@/lib/routes";
import { fetchWithAuth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  Cross,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";

interface PhotoItem {
  id: string;
  title: string;
  description?: string | null;
  imageUrl: string;
  storageKey: string;
  isActive: boolean;
  criadoEm: string;
  updatedAt: string;
}

interface PhotoFormState {
  title: string;
  description: string;
  isActive: boolean;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function normalizePhotoList(data: unknown): PhotoItem[] {
  const list = Array.isArray((data as any)?.photos)
    ? (data as any).photos
    : Array.isArray(data)
      ? data
      : [];

  return list.map((item: any) => ({
    id: String(item.id),
    title: String(item.title || ""),
    description: item.description ?? null,
    imageUrl: String(item.imageUrl || ""),
    storageKey: String(item.storageKey || ""),
    isActive: Boolean(item.isActive),
    criadoEm: String(item.criadoEm || ""),
    updatedAt: String(item.updatedAt || ""),
  }));
}

export default function Photos() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const location = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PhotoItem | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null);
  const [form, setForm] = useState<PhotoFormState>({
    title: "",
    description: "",
    isActive: true,
  });

  useEffect(() => {
    if (!selectedFile) {
      setSelectedFilePreview(null);
      return;
    }

    const preview = URL.createObjectURL(selectedFile);
    setSelectedFilePreview(preview);

    return () => URL.revokeObjectURL(preview);
  }, [selectedFile]);

  const stats = useMemo(
    () => ({
      total: photos.length,
      active: photos.filter((photo) => photo.isActive).length,
      hidden: photos.filter((photo) => !photo.isActive).length,
    }),
    [photos],
  );

  const resetForm = () => {
    setEditingPhoto(null);
    setForm({
      title: "",
      description: "",
      isActive: true,
    });
    setSelectedFile(null);
    setSelectedFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(API_ROUTES.photosAdmin);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Falha ao carregar fotos");
      }

      const data = await response.json();
      setPhotos(normalizePhotoList(data));
    } catch (error: any) {
      setPhotos([]);
      toast({
        title: "Erro",
        description: error?.message || "Nao foi possivel carregar as fotos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPhotos();
  }, []);

  const handleOpenCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (photo: PhotoItem) => {
    setEditingPhoto(photo);
    setForm({
      title: photo.title,
      description: photo.description || "",
      isActive: photo.isActive,
    });
    setSelectedFile(null);
    setSelectedFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleSavePhoto = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Informe o título da foto.",
        variant: "destructive",
      });
      return;
    }

    if (!editingPhoto && !selectedFile) {
      toast({
        title: "Imagem obrigatória",
        description: "Selecione uma imagem para cadastrar a foto.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", form.title.trim());
    if (form.description.trim()) {
      formData.append("description", form.description.trim());
    }
    formData.append("isActive", String(form.isActive));
    if (selectedFile) {
      formData.append("image", selectedFile);
    }

    setSaving(true);
    try {
      const endpoint = editingPhoto ? API_ROUTES.photosUpdate(editingPhoto.id) : API_ROUTES.photosBase;
      const response = await fetchWithAuth(endpoint, {
        method: editingPhoto ? "PUT" : "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Nao foi possivel salvar a foto");
      }

      toast({
        title: editingPhoto ? "Foto atualizada" : "Foto cadastrada",
        description: editingPhoto ? "As alterações foram salvas com sucesso." : "A nova foto foi publicada com sucesso.",
      });

      setIsModalOpen(false);
      resetForm();
      await loadPhotos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao salvar a foto",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePhotoStatus = async (photo: PhotoItem) => {
    setLoadingId(photo.id);
    try {
      const response = await fetchWithAuth(API_ROUTES.photosToggleStatus(photo.id), {
        method: "PATCH",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Nao foi possivel alterar a visibilidade");
      }

      toast({
        title: "Status atualizado",
        description: photo.isActive ? "Foto ocultada da Home." : "Foto exibida na Home.",
      });

      await loadPhotos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao alterar visibilidade",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeletePhoto = async (photo: PhotoItem) => {
    const confirmed = window.confirm(`Excluir a foto \"${photo.title}\"?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(photo.id);
    try {
      const response = await fetchWithAuth(API_ROUTES.photosDelete(photo.id), {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Nao foi possivel excluir a foto");
      }

      toast({
        title: "Foto removida",
        description: "A imagem foi excluída do gerenciador.",
        variant: "destructive",
      });

      await loadPhotos();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error?.message || "Erro ao excluir a foto",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={`flex min-h-screen bg-background transition-[padding] duration-300 ${sidebarOpen ? "lg:pl-64" : "lg:pl-0"}`}>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Cross className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold">Catequese</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <SidebarUser />

          <SidebarNav items={ADMIN_NAV_ITEMS} pathname={location.pathname} />

          <div className="border-t p-4">
            <Button
              variant="nav"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                try {
                  localStorage.removeItem("role");
                } catch {}
                window.location.href = "/login";
              }}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1">
        <header className="sticky top-0 z-40 border-b bg-card">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className={sidebarOpen ? "lg:hidden" : ""} onClick={toggleSidebar}>
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="flex items-center gap-2 text-xl font-semibold">
                  <ImageIcon className="h-6 w-6 text-primary" /> Galeria da Tela Inicial
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Gerencie as fotos exibidas na seção pública da Home.
                </p>
              </div>
            </div>

            <Button onClick={handleOpenCreateModal} className="hidden h-11 shadow-sm sm:inline-flex">
              <Plus className="mr-2 h-5 w-5" /> Adicionar Foto
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex justify-end sm:hidden">
              <Button onClick={handleOpenCreateModal} className="h-11 w-full shadow-sm">
                <Plus className="mr-2 h-5 w-5" /> Adicionar Foto
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total</CardDescription>
                  <CardTitle className="text-2xl">{stats.total}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Ativas</CardDescription>
                  <CardTitle className="text-2xl text-emerald-600">{stats.active}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Ocultas</CardDescription>
                  <CardTitle className="text-2xl text-muted-foreground">{stats.hidden}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Fotos da Home</CardTitle>
                  <CardDescription>
                    Adicione, edite, oculte e remova os momentos especiais exibidos para os visitantes.
                  </CardDescription>
                </div>
                <Button variant="outline" className="gap-2" onClick={handleOpenCreateModal}>
                  <Plus className="h-4 w-4" /> Nova foto
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : photos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-background p-16 text-center">
                    <ImageIcon className="mb-3 h-12 w-12 text-muted-foreground/60" />
                    <h3 className="text-lg font-semibold">Nenhuma foto cadastrada</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Crie a primeira foto para mostrar na home.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {photos.map((photo) => (
                      <Card key={photo.id} className="group flex flex-col overflow-hidden border shadow-sm transition-all hover:shadow-md">
                        <div className="relative aspect-video overflow-hidden bg-muted">
                          <img
                            src={photo.imageUrl}
                            alt={photo.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute right-3 top-3">
                            <Badge variant={photo.isActive ? "default" : "secondary"} className="shadow-sm">
                              {photo.isActive ? "Exibindo na Home" : "Oculto"}
                            </Badge>
                          </div>
                        </div>

                        <CardContent className="flex flex-1 flex-col gap-4 p-5">
                          <div className="space-y-1">
                            <h3 className="line-clamp-1 text-lg font-semibold leading-tight">{photo.title}</h3>
                            <p className="line-clamp-2 h-10 text-sm text-muted-foreground">
                              {photo.description || "Sem descrição informada."}
                            </p>
                            <p className="text-xs text-muted-foreground">Atualizado em {formatDate(photo.updatedAt)}</p>
                          </div>

                          <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void togglePhotoStatus(photo)}
                              disabled={loadingId === photo.id}
                              className="gap-2 text-xs"
                            >
                              {loadingId === photo.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : photo.isActive ? (
                                <XCircle className="h-4 w-4 text-amber-500" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              )}
                              {photo.isActive ? "Ocultar" : "Ativar"}
                            </Button>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEditModal(photo)}
                                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                                title="Editar detalhes"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => void handleDeletePhoto(photo)}
                                disabled={deletingId === photo.id}
                                className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                title="Excluir imagem"
                              >
                                {deletingId === photo.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-lg">
                <div className="p-6 pb-0">
                  <DialogHeader>
                    <DialogTitle>{editingPhoto ? "Editar foto" : "Nova foto"}</DialogTitle>
                  </DialogHeader>
                </div>

                <form onSubmit={handleSavePhoto} className="flex-1 space-y-4 overflow-y-auto p-6 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="photo-title">Título</Label>
                    <Input
                      id="photo-title"
                      placeholder="Ex: Primeira Comunhão 2026"
                      value={form.title}
                      onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="photo-description">Descrição / legenda</Label>
                    <Textarea
                      id="photo-description"
                      placeholder="Breve texto explicativo sobre a foto..."
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <Checkbox
                      id="photo-active"
                      checked={form.isActive}
                      onCheckedChange={(checked) => setForm((current) => ({ ...current, isActive: Boolean(checked) }))}
                    />
                    <Label htmlFor="photo-active" className="text-sm font-medium">
                      Exibir na Home
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="photo-image">{editingPhoto ? "Substituir imagem" : "Upload da imagem"}</Label>
                    <div className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/30 p-4 transition-colors hover:bg-muted/50">
                      <Input
                        id="photo-image"
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      />
                      <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                      <span className="text-center text-xs text-muted-foreground">
                        {selectedFile ? (
                          <strong className="block max-w-[250px] truncate text-primary">{selectedFile.name}</strong>
                        ) : editingPhoto ? (
                          "Se quiser, envie uma nova imagem para substituir a atual"
                        ) : (
                          "Clique ou arraste um arquivo de imagem aqui"
                        )}
                      </span>
                    </div>
                  </div>

                  {(selectedFilePreview || editingPhoto?.imageUrl) && (
                    <div className="space-y-2">
                      <Label>Pré-visualização</Label>
                      <div className="overflow-hidden rounded-lg border bg-muted">
                        <img
                          src={selectedFilePreview || editingPhoto?.imageUrl || ""}
                          alt={form.title || editingPhoto?.title || "Pré-visualização"}
                          className="aspect-video w-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={saving}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {editingPhoto ? "Salvar alterações" : "Publicar na Home"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}
