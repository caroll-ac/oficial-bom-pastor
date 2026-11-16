import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { PARENT_NAV_ITEMS } from "@/lib/sidebarNavItems";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Cross,
  Download,
  Eye,
  FileText,
  Heart,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Share2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Mock data de álbuns
let albums = [
  {
    id: 1,
    title: "Aulas de Catequese",
    description: "Momentos das aulas regulares",
    coverImage:
      "https://images.unsplash.com/photo-1427504494785-cdec9f50c8c9?w=400&h=300&fit=crop",
    photosCount: 3,
    photos: [
      {
        id: 1,
        title: "Aula de Catequese - Nível I",
        description: "Crianças aprendendo sobre os Sacramentos",
        image:
          "https://images.unsplash.com/photo-1427504494785-cdec9f50c8c9?w=400&h=300&fit=crop",
        date: "20/01/2025",
        event: "Aula Regular",
        children: ["Maria Silva", "João Silva", "Pedro Santos"],
        likes: 12,
        views: 145,
      },
      {
        id: 3,
        title: "Atividade Recreativa",
        description: "Brincadeiras e convivência entre crianças",
        image:
          "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=300&fit=crop",
        date: "10/01/2025",
        event: "Dinâmica de Grupo",
        children: ["João Silva", "Maria Silva", "Ana Costa"],
        likes: 35,
        views: 287,
      },
      {
        id: 6,
        title: "Aula Prática",
        description: "Atividade prática sobre aplicação do Evangelho",
        image:
          "https://images.unsplash.com/photo-1516321318423-f06f70e504b3?w=400&h=300&fit=crop",
        date: "02/01/2025",
        event: "Aula Regular",
        children: ["João Silva"],
        likes: 18,
        views: 201,
      },
    ],
  },
  {
    id: 2,
    title: "Eventos Especiais",
    description: "Celebrações e confraternizações",
    coverImage:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop",
    photosCount: 2,
    photos: [
      {
        id: 2,
        title: "Celebração Especial",
        description: "Celebração com todos os catecúmenos",
        image:
          "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop",
        date: "15/01/2025",
        event: "Celebração Eucarística",
        children: ["Maria Silva"],
        likes: 28,
        views: 312,
      },
      {
        id: 5,
        title: "Confraternização",
        description: "Festas e momentos de alegria em comunidade",
        image:
          "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&h=300&fit=crop",
        date: "05/01/2025",
        event: "Confraternização",
        children: ["Maria Silva", "João Silva", "Pedro Santos", "Ana Costa"],
        likes: 56,
        views: 512,
      },
    ],
  },
  {
    id: 3,
    title: "Retiros e Encontros",
    description: "Momentos de reflexão espiritual",
    coverImage:
      "https://images.unsplash.com/photo-1511338175373-3281d6cf6365?w=400&h=300&fit=crop",
    photosCount: 2,
    photos: [
      {
        id: 4,
        title: "Retiro Espiritual",
        description: "Momento de reflexão e aprofundamento da fé",
        image:
          "https://images.unsplash.com/photo-1511338175373-3281d6cf6365?w=400&h=300&fit=crop",
        date: "08/01/2025",
        event: "Retiro de Nível II",
        children: ["Maria Silva", "Lucas Silva"],
        likes: 42,
        views: 425,
      },
      {
        id: 7,
        title: "Workshop Familiar",
        description: "Pais e crianças aprendendo juntos",
        image:
          "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
        date: "31/12/2024",
        event: "Encontro Familiar",
        children: ["Maria Silva", "João Silva"],
        likes: 33,
        views: 298,
      },
    ],
  },
];

export default function ParentGaleria() {
  const [albumsList, setAlbumsList] = useState(albums);
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const location = useLocation();
  const [selectedAlbum, setSelectedAlbum] = useState<(typeof albumsList)[0] | null>(
    null
  );
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  
  // Dialogs
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  
  // Form states
  const [newPhotoTitle, setNewPhotoTitle] = useState("");
  const [newPhotoDescription, setNewPhotoDescription] = useState("");
  const [newPhotoDate, setNewPhotoDate] = useState("");

  const handleAddPhoto = () => {
    if (!selectedAlbum || !newPhotoTitle.trim()) return;
    
    const updatedAlbums = albumsList.map((album) => {
      if (album.id === selectedAlbum.id) {
        const newPhoto = {
          id: Math.max(...album.photos.map((p) => p.id), 0) + 1,
          title: newPhotoTitle,
          description: newPhotoDescription,
          image:
            "https://images.unsplash.com/photo-1427504494785-cdec9f50c8c9?w=400&h=300&fit=crop",
          date: newPhotoDate,
          event: album.title,
          children: [],
          likes: 0,
          views: 0,
        };
        
        return {
          ...album,
          photos: [...album.photos, newPhoto],
          photosCount: album.photos.length + 1,
        };
      }
      return album;
    });
    
    setAlbumsList(updatedAlbums);
    setSelectedAlbum(updatedAlbums.find((a) => a.id === selectedAlbum.id) || null);
    setNewPhotoTitle("");
    setNewPhotoDescription("");
    setNewPhotoDate("");
    setShowAddPhoto(false);
  };

  const handleLike = (photoId: number) => {
    const newLiked = new Set(liked);
    if (newLiked.has(photoId)) {
      newLiked.delete(photoId);
    } else {
      newLiked.add(photoId);
    }
    setLiked(newLiked);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "aula":
        return "bg-blue-100 text-blue-800";
      case "evento":
        return "bg-purple-100 text-purple-800";
      case "retiro":
        return "bg-green-100 text-green-800";
      case "reuniao":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-300 lg:static lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
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

          <SidebarNav items={PARENT_NAV_ITEMS} pathname={location.pathname} />

          {/* Logout */}
          <div className="border-t p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive"
              asChild
            >
              <Link to="/">
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </Link>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4">
          <div className="w-10" />
          <span className="font-display text-lg font-semibold">Galeria</span>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">
                    Galeria de Fotos
                  </h1>
                  <p className="text-slate-600 mt-1">
                    Acompanhe os momentos especiais das aulas e eventos
                  </p>
                </div>
              </div>

              {/* Conteúdo Principal */}
              {!selectedAlbum ? (
                <>
                  {/* Grid de Álbuns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {albumsList.map((album) => (
                      <Card
                        key={album.id}
                        className="border-0 shadow-sm overflow-hidden hover:shadow-lg transition cursor-pointer group"
                        onClick={() => setSelectedAlbum(album)}
                      >
                        <div className="relative overflow-hidden bg-slate-200 h-48">
                          <img
                            src={album.coverImage}
                            alt={album.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition" />
                          </div>
                          <div className="absolute top-2 right-2 bg-primary/90 text-white px-3 py-1 rounded-full text-xs font-medium">
                            {album.photosCount} fotos
                          </div>
                        </div>
                        <CardContent className="pt-4">
                          <h3 className="font-semibold text-slate-900 mb-1">
                            {album.title}
                          </h3>
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {album.description}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  {/* Voltar para álbuns */}
                  <div className="mb-6 flex items-center justify-between">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setSelectedAlbum(null);
                        setSelectedPhoto(null);
                      }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Voltar aos Álbuns
                    </Button>
                    <Button
                      onClick={() => setShowAddPhoto(true)}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar Foto
                    </Button>
                  </div>

                  {/* Título do Álbum */}
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {selectedAlbum.title}
                    </h2>
                    <p className="text-slate-600 mt-1">
                      {selectedAlbum.description}
                    </p>
                  </div>

                  {/* Grid de Fotos do Álbum */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {selectedAlbum.photos.map((photo) => (
                      <Card
                        key={photo.id}
                        className="border-0 shadow-sm overflow-hidden hover:shadow-lg transition cursor-pointer group"
                        onClick={() => setSelectedPhoto(photo)}
                      >
                        <div className="relative overflow-hidden bg-slate-200 h-48">
                          <img
                            src={photo.image}
                            alt={photo.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                            <Eye className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        </div>
                        <CardContent className="pt-4">
                          <h3 className="font-semibold text-slate-900 mb-1">
                            {photo.title}
                          </h3>
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                            {photo.description}
                          </p>
                          <div className="space-y-2 text-xs text-slate-600 mb-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {photo.date}
                            </div>
                            <div className="flex items-center gap-2">
                              <Users className="h-3 w-3" />
                              {photo.children.length} criança
                              {photo.children.length > 1 ? "s" : ""}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLike(photo.id);
                              }}
                              className="flex items-center gap-1 text-sm text-slate-600 hover:text-red-600 transition"
                            >
                              <Heart
                                className={`h-4 w-4 ${
                                  liked.has(photo.id)
                                    ? "fill-red-600 text-red-600"
                                    : ""
                                }`}
                              />
                              {photo.likes + (liked.has(photo.id) ? 1 : 0)}
                            </button>
                            <span className="text-xs text-slate-500">
                              {photo.views} visualizações
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}

              {/* Modal de Visualização */}
          {selectedPhoto && (
            <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
              <DialogContent className="max-w-4xl w-full">
                <DialogHeader>
                  <DialogTitle>{selectedPhoto.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Imagem em tamanho maior */}
                  <div className="relative w-full overflow-hidden rounded-lg bg-slate-900 max-h-96 flex items-center justify-center">
                    <img
                      src={selectedPhoto.image}
                      alt={selectedPhoto.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Detalhes da Foto */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-2">
                        Descrição
                      </h3>
                      <p className="text-slate-600">{selectedPhoto.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-700 mb-1">
                          Data
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-4 w-4" />
                          {selectedPhoto.date}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-700 mb-1">
                          Evento
                        </h4>
                        <p className="text-sm text-slate-600">
                          {selectedPhoto.event}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-700 mb-2">
                        Crianças Presentes
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedPhoto.children.map((child, idx) => (
                          <Badge key={idx} variant="outline">
                            {child}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 pt-4 border-t border-slate-200">
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => handleLike(selectedPhoto.id)}
                      >
                        <Heart
                          className={`h-4 w-4 ${
                            liked.has(selectedPhoto.id)
                              ? "fill-red-600 text-red-600"
                              : ""
                          }`}
                        />
                        {selectedPhoto.likes +
                          (liked.has(selectedPhoto.id) ? 1 : 0)}{" "}
                        Gostei
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2">
                        <Download className="h-4 w-4" />
                        Baixar
                      </Button>
                      <Button variant="outline" className="flex-1 gap-2">
                        <Share2 className="h-4 w-4" />
                        Compartilhar
                      </Button>
                    </div>

                    {/* Info */}
                    <div className="text-xs text-slate-500 text-center pt-2">
                      {selectedPhoto.views} visualizações
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Dialog Adicionar Foto */}
          <Dialog open={showAddPhoto} onOpenChange={setShowAddPhoto}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Foto ao Álbum</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="photo-title">Título da Foto</Label>
                  <Input
                    id="photo-title"
                    placeholder="Ex: Aula sobre Sacramentos"
                    value={newPhotoTitle}
                    onChange={(e) => setNewPhotoTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="photo-description">Descrição</Label>
                  <Textarea
                    id="photo-description"
                    placeholder="Descreva a foto..."
                    value={newPhotoDescription}
                    onChange={(e) => setNewPhotoDescription(e.target.value)}
                    className="h-20"
                  />
                </div>
                <div>
                  <Label htmlFor="photo-date">Data</Label>
                  <Input
                    id="photo-date"
                    placeholder="DD/MM/YYYY"
                    value={newPhotoDate}
                    onChange={(e) => setNewPhotoDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="photo-file">Arquivo</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary transition cursor-pointer">
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">
                      Clique ou arraste uma imagem
                    </p>
                    <Input
                      id="photo-file"
                      type="file"
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                </div>
                <Button onClick={handleAddPhoto} className="w-full gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Foto
                </Button>
              </div>
            </DialogContent>
          </Dialog>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}