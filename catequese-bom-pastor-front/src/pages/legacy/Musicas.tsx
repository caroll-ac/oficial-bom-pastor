import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Calendar,
  Calendar as CalendarNav,
  ClipboardList,
  Cross,
  DollarSign,
  Download,
  ListMusic,
  LogOut,
  Menu,
  Music,
  Play,
  Search,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { getDashboardNavItems } from "@/lib/sidebarNavItems";
import { Link, useLocation } from "react-router-dom";

interface Song {
  id: string;
  titulo: string;
  artista?: string;
  categoria:
    | "Louvor"
    | "Entrada"
    | "Ofertório"
    | "Comunhão"
    | "Final"
    | "Infantil";
  nivel?: 1 | 2 | 3;
  duracao?: string;
  letra?: string;
  videoUrl?: string;
}

const musicasCatalogo: Song[] = [
  {
    id: "m1",
    titulo: "Eu Vim Para Adorar-Te",
    artista: "Ministério Amor e Adoração",
    categoria: "Louvor",
    duracao: "4:12",
    letra:
      "Eu vim para adorar-Te\nEu vim para Te dar louvor\nTu és tudo para mim\nMeu Jesus, meu Salvador",
  },
  {
    id: "m2",
    titulo: "Bom é Louvar o Senhor",
    artista: "Ministério Amor e Adoração",
    categoria: "Entrada",
    duracao: "3:45",
    letra:
      "Bom é louvar o Senhor\nE cantar salmos ao Vosso nome\nAnunciar de manhã vossa graça\nE a noite a vossa fidelidade",
  },
  {
    id: "m3",
    titulo: "Deus Nos Convida",
    artista: "Anjos de Resgate",
    categoria: "Ofertório",
    nivel: 1,
    duracao: "3:20",
    letra:
      "Deus nos convida pra ceia\nDeus nos convida pra mesa\nVinde, pois tudo está pronto",
  },
  {
    id: "m4",
    titulo: "Pão e Vinho",
    artista: "Padre Zezinho",
    categoria: "Ofertório",
    nivel: 2,
    duracao: "4:05",
    letra:
      "Pão e vinho, fruto da terra\nPão e vinho, obra de amor\nPão e vinho sobre a mesa\nTransformados em corpo e sangue do Senhor",
  },
  {
    id: "m5",
    titulo: "Corpo e Sangue de Cristo",
    artista: "Vida Reluz",
    categoria: "Comunhão",
    nivel: 3,
    duracao: "3:55",
    letra: "Corpo e Sangue de Cristo\nPão da vida eterna\nCalice da salvação",
  },
  {
    id: "m6",
    titulo: "Ide e Anunciai",
    artista: "Ministério Amor e Adoração",
    categoria: "Final",
    duracao: "3:30",
    letra:
      "Ide e anunciai\nIde e anunciai\nO reino de Deus já chegou\nIde e proclamai",
  },
  {
    id: "m7",
    titulo: "Meu Barquinho",
    artista: "Padre Marcelo Rossi",
    categoria: "Infantil",
    nivel: 1,
    duracao: "2:45",
    letra:
      "Meu barquinho pequenino\nNo mar tão grande navega\nCom Jesus eu não naufrago\nEle é meu farol que me conduz",
  },
  {
    id: "m8",
    titulo: "Eu Sou Feliz",
    artista: "Padre Joãozinho",
    categoria: "Infantil",
    nivel: 1,
    duracao: "2:30",
    letra:
      "Eu sou feliz, sou muito feliz\nPois Jesus Cristo é meu bom amigo\nEu sou feliz, sou muito feliz\nPois tenho a Jesus comigo",
  },
  {
    id: "m9",
    titulo: "Jesus Cristo Eu Estou Aqui",
    artista: "Padre Marcelo Rossi",
    categoria: "Louvor",
    nivel: 2,
    duracao: "4:20",
    letra:
      "Jesus Cristo eu estou aqui\nPra louvar o vosso nome\nJesus Cristo eu estou aqui",
  },
  {
    id: "m10",
    titulo: "Deus é Fiel",
    artista: "Toca de Assis",
    categoria: "Louvor",
    nivel: 3,
    duracao: "4:00",
    letra:
      "Deus é fiel em todo o tempo\nEle é meu refúgio e minha força\nNele confiarei",
  },
  {
    id: "m11",
    titulo: "Vem Espírito Santo",
    artista: "Ministério Amor e Adoração",
    categoria: "Entrada",
    nivel: 3,
    duracao: "3:40",
    letra:
      "Vem Espírito Santo\nVem nos envolver\nVem como um fogo\nVem nos acender",
  },
  {
    id: "m12",
    titulo: "Creio em Ti",
    artista: "Anjos de Resgate",
    categoria: "Comunhão",
    nivel: 2,
    duracao: "4:15",
    letra:
      "Creio em Ti, Senhor\nCreio em Ti, Jesus\nSei que sempre estarás\nA guiar-me com Tua luz",
  },
];

export default function Musicas() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const location = useLocation();
  
  useEffect(() => {
    setIsAdmin((localStorage.getItem("role") || "guest") === "admin");
  }, []);
  
  // Detecta se está em rota de admin ou catequista
  const baseRoute = location.pathname.startsWith('/admin') ? '/admin' : '/catequista';
  const isAdminRoute = baseRoute === '/admin';
  
  const categorias = [
    "Louvor",
    "Entrada",
    "Ofertório",
    "Comunhão",
    "Final",
    "Infantil",
  ];

  const filteredSongs = useMemo(() => {
    return musicasCatalogo.filter((song) => {
      const matchesSearch =
        song.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        song.artista?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || song.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const songsByCategory = useMemo(() => {
    const grouped: Record<string, Song[]> = {};
    categorias.forEach((cat) => {
      grouped[cat] = musicasCatalogo.filter((s) => s.categoria === cat);
    });
    return grouped;
  }, []);

  return (
    <div className={`flex min-h-screen bg-background transition-[padding] duration-300 ${sidebarOpen ? "lg:pl-64" : "lg:pl-0"}`}>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } `}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Cross className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold">
                Catequese
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <SidebarUser />

          <SidebarNav items={getDashboardNavItems(isAdminRoute)} pathname={location.pathname} />

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

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4">
          <Button
            variant="ghost"
            size="icon"
            className={sidebarOpen ? "lg:hidden" : ""}
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-display text-lg font-semibold">Músicas</span>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-4xl font-bold text-slate-900">
                  Músicas para Catequese
                </h1>
                <p className="text-slate-600">
                  Repertório de músicas litúrgicas e infantis para suas aulas
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <ListMusic className="h-3 w-3" />
                  {musicasCatalogo.length} músicas
                </Badge>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar por título ou artista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
              <TabsList className="mb-6">
                <TabsTrigger value="all">Todas</TabsTrigger>
                {categorias.map((cat) => (
                  <TabsTrigger key={cat} value={cat}>
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="all" className="space-y-6">
                {categorias.map((categoria) => {
                  const songs = songsByCategory[categoria].filter(
                    (song) =>
                      song.titulo
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                      song.artista
                        ?.toLowerCase()
                        .includes(searchTerm.toLowerCase())
                  );
                  if (songs.length === 0) return null;

                  return (
                    <div key={categoria}>
                      <h2 className="mb-3 text-xl font-semibold text-slate-800">
                        {categoria}
                      </h2>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {songs.map((song) => (
                          <Card
                            key={song.id}
                            variant="interactive"
                            onClick={() => setSelectedSong(song)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base">
                                    {song.titulo}
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    {song.artista}
                                  </CardDescription>
                                </div>
                                {song.nivel && (
                                  <Badge
                                    variant="secondary"
                                    className="ml-2 shrink-0"
                                  >
                                    Nível {song.nivel}
                                  </Badge>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>{song.duracao || "—"}</span>
                                <Badge variant="outline" className="text-xs">
                                  {song.categoria}
                                </Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                >
                                  <Play className="mr-2 h-3 w-3" />
                                  Ouvir
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              {categorias.map((categoria) => (
                <TabsContent
                  key={categoria}
                  value={categoria}
                  className="space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredSongs
                      .filter((s) => s.categoria === categoria)
                      .map((song) => (
                        <Card
                          key={song.id}
                          variant="interactive"
                          onClick={() => setSelectedSong(song)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base">
                                  {song.titulo}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  {song.artista}
                                </CardDescription>
                              </div>
                              {song.nivel && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 shrink-0"
                                >
                                  Nível {song.nivel}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>{song.duracao || "—"}</span>
                              <Badge variant="outline" className="text-xs">
                                {song.categoria}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                              >
                                <Play className="mr-2 h-3 w-3" />
                                Ouvir
                              </Button>
                              <Button size="sm" variant="ghost">
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </main>
      </div>

      {/* Modal de Letra (Simples) */}
      {selectedSong && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
          onClick={() => setSelectedSong(null)}
        >
          <Card
            variant="elevated"
            className="max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedSong.titulo}</CardTitle>
                  <CardDescription>{selectedSong.artista}</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedSong(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedSong.categoria}</Badge>
                {selectedSong.nivel && (
                  <Badge>Nível {selectedSong.nivel}</Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  {selectedSong.duracao}
                </span>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <h3 className="mb-2 font-semibold">Letra:</h3>
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {selectedSong.letra}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button variant="default" className="flex-1">
                  <Play className="mr-2 h-4 w-4" />
                  Ouvir Música
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}