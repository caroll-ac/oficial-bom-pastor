import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award,
  BookOpen,
  Calendar,
  Calendar as CalendarNav,
  ClipboardList,
  Cross,
  DollarSign,
  Download,
  FileText,
  Info,
  LogOut,
  Menu,
  Music,
  PlayCircle,
  Users,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { getDashboardNavItems } from "@/lib/sidebarNavItems";
import { Link, useLocation } from "react-router-dom";

interface Aula {
  id: string;
  titulo: string;
  descricao?: string;
  duracao?: string;
}

interface Arquivo {
  id: string;
  nome: string;
  tipo: string;
  tamanho?: string;
}

interface NivelData {
  id: number;
  nome: string;
  descricao: string;
  progresso: number; // 0-100
  aulas: Aula[];
  arquivos: Arquivo[];
}

const niveis: NivelData[] = [
  {
    id: 1,
    nome: "Nível I",
    descricao:
      "Introdução à vida cristã: oração, sinais da fé e primeiros passos na amizade com Jesus.",
    progresso: 35,
    aulas: [
      {
        id: "n1a1",
        titulo: "Deus nos ama",
        descricao: "Quem é Deus e como Ele cuida de nós.",
        duracao: "12 min",
      },
      {
        id: "n1a2",
        titulo: "Sinais da fé",
        descricao: "Sinal da cruz, orações iniciais e gestos.",
        duracao: "15 min",
      },
      {
        id: "n1a3",
        titulo: "A Bíblia",
        descricao: "Conhecendo a Palavra de Deus.",
        duracao: "10 min",
      },
    ],
    arquivos: [
      {
        id: "n1f1",
        nome: "Apostila Nível I.pdf",
        tipo: "PDF",
        tamanho: "1.2 MB",
      },
      {
        id: "n1f2",
        nome: "Plano de Aulas - Nível I.docx",
        tipo: "DOCX",
        tamanho: "320 KB",
      },
    ],
  },
  {
    id: 2,
    nome: "Nível II",
    descricao:
      "Crescimento na fé: vida de Jesus, sacramentos e vivência comunitária.",
    progresso: 60,
    aulas: [
      {
        id: "n2a1",
        titulo: "Quem é Jesus?",
        descricao: "Vida, missão e ensinamentos de Jesus.",
        duracao: "18 min",
      },
      {
        id: "n2a2",
        titulo: "Sacramentos",
        descricao: "Sinais visíveis da graça de Deus.",
        duracao: "20 min",
      },
      {
        id: "n2a3",
        titulo: "A vida na Igreja",
        descricao: "Comunidade, serviço e caridade.",
        duracao: "14 min",
      },
    ],
    arquivos: [
      {
        id: "n2f1",
        nome: "Apostila Nível II.pdf",
        tipo: "PDF",
        tamanho: "1.5 MB",
      },
      {
        id: "n2f2",
        nome: "Roteiro de Encontros II.xlsx",
        tipo: "XLSX",
        tamanho: "210 KB",
      },
    ],
  },
  {
    id: 3,
    nome: "Nível III",
    descricao:
      "Preparação para os sacramentos: Reconciliação e Primeira Comunhão, vida de oração e missão.",
    progresso: 80,
    aulas: [
      {
        id: "n3a1",
        titulo: "Eucaristia",
        descricao: "Presença real de Cristo e participação na Missa.",
        duracao: "22 min",
      },
      {
        id: "n3a2",
        titulo: "Reconciliação",
        descricao: "Perdão, misericórdia e confissão.",
        duracao: "16 min",
      },
      {
        id: "n3a3",
        titulo: "Ser discípulo",
        descricao: "Viver e anunciar o Evangelho.",
        duracao: "12 min",
      },
    ],
    arquivos: [
      {
        id: "n3f1",
        nome: "Apostila Nível III.pdf",
        tipo: "PDF",
        tamanho: "1.8 MB",
      },
      {
        id: "n3f2",
        nome: "Checklist de Preparação.docx",
        tipo: "DOCX",
        tamanho: "260 KB",
      },
    ],
  },
];

export default function Materiais() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    setIsAdmin((localStorage.getItem("role") || "guest") === "admin");
  }, []);
  
  // Detecta se está em rota de admin ou catequista
  const baseRoute = location.pathname.startsWith('/admin') ? '/admin' : '/catequista';
  const isAdminRoute = baseRoute === '/admin';
  
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
          <span className="font-display text-lg font-semibold">
            Material de Aulas
          </span>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 text-left">
              <h1 className="text-4xl font-bold text-slate-900">
                Material de Aulas
              </h1>
              <p className="text-slate-600">
                Conteúdos e arquivos organizados por níveis, com seu progresso e
                certificado.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {niveis.map((nivel, idx) => {
                const prevCompleted =
                  idx === 0 ? true : niveis[idx - 1].progresso >= 100;
                const isLocked = !prevCompleted;
                return (
                  <Card
                    key={nivel.id}
                    variant="elevated"
                    className="flex flex-col"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            {nivel.nome}
                          </CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-2">
                            <Info className="h-4 w-4" />
                            {nivel.descricao}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {isLocked && (
                            <Badge variant="destructive" className="shrink-0">
                              Bloqueado
                            </Badge>
                          )}
                          <Badge variant="secondary" className="shrink-0">
                            {nivel.progresso}%
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Progresso do curso
                          </span>
                          <span className="text-sm font-medium">
                            {nivel.progresso}%
                          </span>
                        </div>
                        <Progress value={nivel.progresso} />
                      </div>

                      <Tabs defaultValue="aulas">
                        <TabsList>
                          <TabsTrigger value="aulas" disabled={isLocked}>
                            Aulas
                          </TabsTrigger>
                          <TabsTrigger value="arquivos" disabled={isLocked}>
                            Arquivos
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="aulas">
                          {isLocked ? (
                            <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
                              Conclua o nível anterior para desbloquear estas
                              aulas.
                            </div>
                          ) : (
                            <Accordion type="single" collapsible>
                              {nivel.aulas.map((a) => (
                                <AccordionItem key={a.id} value={a.id}>
                                  <AccordionTrigger>
                                    <div className="flex items-center gap-2">
                                      <PlayCircle className="h-4 w-4" />
                                      <span className="font-medium">
                                        {a.titulo}
                                      </span>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <p className="text-sm text-muted-foreground">
                                      {a.descricao}
                                    </p>
                                    <div className="mt-3 flex items-center justify-between">
                                      <span className="text-xs text-muted-foreground">
                                        Duração: {a.duracao ?? "—"}
                                      </span>
                                      <Button size="sm" variant="outline">
                                        Assistir
                                      </Button>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          )}
                        </TabsContent>

                        <TabsContent value="arquivos">
                          {isLocked ? (
                            <div className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
                              Conclua o nível anterior para liberar os arquivos.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {nivel.arquivos.map((f) => (
                                <div
                                  key={f.id}
                                  className="flex items-center justify-between rounded-lg border p-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-4 w-4" />
                                    <div>
                                      <p className="text-sm font-medium">
                                        {f.nome}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {f.tipo}
                                        {f.tamanho ? ` • ${f.tamanho}` : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="gap-2"
                                  >
                                    <Download className="h-4 w-4" />
                                    Baixar
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>

                    <CardFooter className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-gold-dark" />
                        <span className="text-sm">
                          Certificado do {nivel.nome}
                        </span>
                      </div>
                      <Button
                        disabled={nivel.progresso < 100}
                        variant={nivel.progresso < 100 ? "outline" : "gold"}
                      >
                        {nivel.progresso < 100
                          ? "Disponível ao concluir"
                          : "Emitir Certificado"}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}