import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { fetchWithAuth } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import { getDashboardNavItems } from "@/lib/sidebarNavItems";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import {
  AlertCircle,
  Calendar,
  Clock,
  Cross,
  Download,
  Eye,
  FileText,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Phone,
  Search,
  Users,
  X,
} from "lucide-react";

type DocumentoTipo = "CERTIDAO_NASCIMENTO" | "CPF" | "CARTEIRA_VACINA";

interface BackendDocumento {
  tipo: DocumentoTipo;
  status: boolean;
  uploadDate: string | null;
  fileUrl: string | null;
}

interface DocumentInfo {
  status: boolean;
  uploadDate: string | null;
  fileName?: string;
  fileUrl?: string | null;
}

interface Student {
  id: string;
  name: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  cpf: string;
  documents: {
    birthCertificate: DocumentInfo;
    cpf: DocumentInfo;
    vaccineCard: DocumentInfo;
  };
  attendanceDates: {
    percentage: number;
    absenceDates: string[];
  };
  avatar: string;
}

interface Turma {
  id: string;
  name: string;
  level: number;
  schedule: string;
  room: string;
  students: Student[];
}

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "--";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function safeDate(date: string | null | undefined): string {
  if (!date) {
    return "";
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString("pt-BR");
}

function getFileNameFromUrl(url: string | null | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  try {
    const clean = url.split("?")[0];
    const parts = clean.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "");
  } catch {
    return undefined;
  }
}

function createDefaultDocument(): DocumentInfo {
  return {
    status: false,
    uploadDate: null,
    fileName: undefined,
    fileUrl: null,
  };
}

function mapBackendDocuments(documents: BackendDocumento[] | undefined) {
  const mapped = {
    birthCertificate: createDefaultDocument(),
    cpf: createDefaultDocument(),
    vaccineCard: createDefaultDocument(),
  };

  for (const doc of documents || []) {
    const item: DocumentInfo = {
      status: Boolean(doc.status),
      uploadDate: doc.uploadDate || null,
      fileUrl: doc.fileUrl || null,
      fileName: getFileNameFromUrl(doc.fileUrl || undefined),
    };

    if (doc.tipo === "CERTIDAO_NASCIMENTO") {
      mapped.birthCertificate = item;
    }

    if (doc.tipo === "CPF") {
      mapped.cpf = item;
    }

    if (doc.tipo === "CARTEIRA_VACINA") {
      mapped.vaccineCard = item;
    }
  }

  return mapped;
}

function mapTurma(turma: any): Turma {
  const students: Student[] = Array.isArray(turma?.catequizandos)
    ? turma.catequizandos.map((student: any) => ({
        id: String(student.id || ""),
        name: String(student.nome || "Sem nome"),
        birthDate: String(student.dataNascimento || ""),
        phone: String(student.telefone || student.responsavel?.telefone || "Não informado"),
        email: String(student.email || student.responsavel?.email || "Não informado"),
        address: String(student.endereco || "Não informado"),
        cpf: String(student.cpf || "Não informado"),
        documents: mapBackendDocuments(student.documentos),
        attendanceDates: {
          percentage: 0,
          absenceDates: [],
        },
        avatar: getInitials(String(student.nome || "")),
      }))
    : [];

  return {
    id: String(turma?.id || ""),
    name: String(turma?.nome || "Turma"),
    level: Number(turma?.ano || 0),
    schedule: String(turma?.horario || "Não informado"),
    room: String(turma?.sala || "Não informado"),
    students,
  };
}

function getLoggedUserId(): string | null {
  const raw = localStorage.getItem("user");

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { id?: string };
    return parsed?.id || null;
  } catch {
    return null;
  }
}

export default function MinhasTurmas() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const location = useLocation();

  const baseRoute = location.pathname.startsWith("/admin") ? "/admin" : "/catequista";
  const isAdminRoute = baseRoute === "/admin";

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [documentPreview, setDocumentPreview] = useState<{
    type: string;
    doc: DocumentInfo;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTurmas = async () => {
      setLoadingTurmas(true);
      setLoadError(null);

      try {
        const response = await fetchWithAuth(`${API_ROUTES.turmas}?limit=1000&offset=0`);

        if (!response.ok) {
          throw new Error("Não foi possível carregar as turmas.");
        }

        const data = await response.json();
        const list = Array.isArray(data?.turmas) ? data.turmas : [];

        const loggedUserId = getLoggedUserId();
        const visibleTurmas = isAdminRoute
          ? list
          : list.filter((turma: any) => {
              if (!loggedUserId || !Array.isArray(turma?.catequistasTurma)) {
                return false;
              }

              return turma.catequistasTurma.some((rel: any) => {
                const catequistaId = String(rel?.catequistaId || rel?.catequista?.id || "");
                return catequistaId === loggedUserId;
              });
            });

        const mappedTurmas = visibleTurmas.map(mapTurma);

        if (!cancelled) {
          setTurmas(mappedTurmas);
          setSelectedTurmaId((prev) => {
            const stillExists = mappedTurmas.some((turma) => turma.id === prev);
            return stillExists ? prev : mappedTurmas[0]?.id || "";
          });
        }
      } catch (error) {
        console.error("Erro ao carregar turmas:", error);
        if (!cancelled) {
          setTurmas([]);
          setSelectedTurmaId("");
          setLoadError("Não foi possível carregar as turmas no momento.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTurmas(false);
        }
      }
    };

    loadTurmas();

    return () => {
      cancelled = true;
    };
  }, [isAdminRoute]);

  const filteredTurmas = useMemo(() => {
    if (filterLevel === "all") {
      return turmas;
    }

    return turmas.filter((turma) => turma.level === Number(filterLevel));
  }, [filterLevel, turmas]);

  useEffect(() => {
    if (filteredTurmas.length === 0) {
      setSelectedTurmaId("");
      return;
    }

    const exists = filteredTurmas.some((turma) => turma.id === selectedTurmaId);
    if (!exists) {
      setSelectedTurmaId(filteredTurmas[0].id);
    }
  }, [filteredTurmas, selectedTurmaId]);

  const selectedTurma = useMemo(
    () => filteredTurmas.find((turma) => turma.id === selectedTurmaId) || null,
    [filteredTurmas, selectedTurmaId]
  );

  const filteredStudents = useMemo(() => {
    if (!selectedTurma) {
      return [];
    }

    return selectedTurma.students.filter((student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, selectedTurma]);

  const calculateAge = (birthDate: string) => {
    const parsedBirthDate = new Date(birthDate);

    if (Number.isNaN(parsedBirthDate.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - parsedBirthDate.getFullYear();
    const monthDiff = today.getMonth() - parsedBirthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < parsedBirthDate.getDate())
    ) {
      age--;
    }

    return age;
  };

  return (
    <div
      className={`flex min-h-screen bg-background transition-[padding] duration-300 ${
        sidebarOpen ? "lg:pl-64" : "lg:pl-0"
      }`}
    >
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
              <span className="font-display text-lg font-semibold">Catequese</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <SidebarUser />

          <SidebarNav
            items={getDashboardNavItems(isAdminRoute)}
            pathname={location.pathname}
          />

          <div className="border-t p-4">
            <Button variant="ghost" className="w-full justify-start text-destructive" asChild>
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
          <span className="font-display text-lg font-semibold">Minhas Turmas</span>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="mb-2 text-4xl font-bold text-slate-900">Minhas Turmas</h1>
                <p className="text-slate-600">
                  Gerencie suas turmas e as informações dos catequizandos
                </p>
              </div>

              <div className="w-full md:w-56">
                <Select value={filterLevel} onValueChange={setFilterLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrar por nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os níveis</SelectItem>
                    {[...new Set(turmas.map((turma) => turma.level))]
                      .filter((value) => Number.isFinite(value) && value > 0)
                      .sort((a, b) => a - b)
                      .map((level) => (
                        <SelectItem key={level} value={String(level)}>
                          Nível {level}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {loadingTurmas && (
              <Card>
                <CardContent className="py-10 text-center text-slate-600">
                  Carregando turmas...
                </CardContent>
              </Card>
            )}

            {!loadingTurmas && loadError && (
              <Card>
                <CardContent className="py-10 text-center">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-500" />
                  <p className="text-slate-700">{loadError}</p>
                </CardContent>
              </Card>
            )}

            {!loadingTurmas && !loadError && filteredTurmas.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                  <p className="text-slate-700">
                    {isAdminRoute
                      ? "Nenhuma turma encontrada."
                      : "Você ainda não foi vinculado a nenhuma turma."}
                  </p>
                </CardContent>
              </Card>
            )}

            {!loadingTurmas && !loadError && filteredTurmas.length > 0 && selectedTurma && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Turmas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-col gap-2">
                        {filteredTurmas.map((turma) => (
                          <Button
                            key={turma.id}
                            variant={selectedTurma.id === turma.id ? "default" : "outline"}
                            className="h-auto justify-start px-3 py-3 text-left"
                            onClick={() => {
                              setSelectedTurmaId(turma.id);
                              setSearchQuery("");
                            }}
                          >
                            <div className="flex flex-col items-start">
                              <span className="text-sm font-medium">{turma.name}</span>
                              <span className="text-xs opacity-75">
                                {turma.students.length} catequizando(s)
                              </span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-3">
                  <Card>
                    <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-2xl">{selectedTurma.name}</CardTitle>
                          <CardDescription className="mt-2">
                            <div className="flex flex-wrap gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {selectedTurma.schedule}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {selectedTurma.room}
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {selectedTurma.students.length} catequizando(s)
                              </div>
                            </div>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-6">
                      <div className="relative mb-6">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Buscar catequizando..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {filteredStudents.map((student) => {
                          const age = calculateAge(student.birthDate);

                          return (
                            <button
                              key={student.id}
                              onClick={() => setSelectedStudent(student)}
                              className="group cursor-pointer rounded-lg border border-slate-200 p-4 text-left transition-all hover:border-blue-500 hover:bg-blue-50"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex flex-1 items-start gap-3">
                                  <Avatar className="mt-0.5 h-10 w-10">
                                    <AvatarImage
                                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.id}`}
                                    />
                                    <AvatarFallback>{student.avatar}</AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium text-slate-900 group-hover:text-blue-600">
                                      {student.name}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {age !== null ? `${age} anos` : "Idade não informada"} • {student.phone}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant="secondary" className="ml-2 whitespace-nowrap">
                                  {student.attendanceDates.percentage}%
                                </Badge>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {filteredStudents.length === 0 && (
                        <div className="py-12 text-center">
                          <Users className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                          <p className="text-slate-500">Nenhum catequizando encontrado</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>

          <Dialog
            open={!!selectedStudent}
            onOpenChange={() => {
              setSelectedStudent(null);
              setDocumentPreview(null);
            }}
          >
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              {selectedStudent && !documentPreview && (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStudent.id}`}
                        />
                        <AvatarFallback>{selectedStudent.avatar}</AvatarFallback>
                      </Avatar>
                      <div>
                        <DialogTitle className="text-2xl">{selectedStudent.name}</DialogTitle>
                        <DialogDescription className="mt-1 text-base">
                          {calculateAge(selectedStudent.birthDate) ?? "Idade não informada"} anos • Nível{" "}
                          {selectedTurma?.level || "-"}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  <Tabs defaultValue="info" className="mt-6 w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="info">Informações</TabsTrigger>
                      <TabsTrigger value="documents">Documentos</TabsTrigger>
                      <TabsTrigger value="attendance">Frequência</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-600">Data de Nascimento</label>
                          <p className="mt-1 flex items-center gap-2 text-slate-900">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            {safeDate(selectedStudent.birthDate) || "Não informado"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600">CPF</label>
                          <p className="mt-1 flex items-center gap-2 text-slate-900">
                            <FileText className="h-4 w-4 text-blue-500" />
                            {selectedStudent.cpf}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-slate-600">Telefone</label>
                          <p className="mt-1 flex items-center gap-2 text-slate-900">
                            <Phone className="h-4 w-4 text-blue-500" />
                            {selectedStudent.phone}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-slate-600">E-mail</label>
                          <p className="mt-1 flex items-center gap-2 text-slate-900">
                            <Mail className="h-4 w-4 text-blue-500" />
                            {selectedStudent.email}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-600">Endereço</label>
                        <p className="mt-1 flex items-start gap-2 text-slate-900">
                          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                          {selectedStudent.address}
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="documents" className="mt-4 space-y-3">
                      <div className="space-y-3">
                        {[
                          {
                            label: "Certidão de Nascimento",
                            type: "Certidão de Nascimento",
                            document: selectedStudent.documents.birthCertificate,
                          },
                          {
                            label: "CPF",
                            type: "CPF",
                            document: selectedStudent.documents.cpf,
                          },
                          {
                            label: "Carteira de Vacina",
                            type: "Carteira de Vacina",
                            document: selectedStudent.documents.vaccineCard,
                          },
                        ].map((item) => (
                          <div
                            key={item.type}
                            className="flex items-center justify-between rounded-lg border p-3 hover:bg-slate-50"
                          >
                            <div className="flex-1">
                              <span className="font-medium text-slate-900">{item.label}</span>
                              {item.document.status && item.document.uploadDate && (
                                <p className="mt-1 text-xs text-slate-500">
                                  Enviado em {safeDate(item.document.uploadDate)}
                                </p>
                              )}
                            </div>
                            <div className="ml-3 flex items-center gap-2">
                              {item.document.status ? (
                                <>
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                    Enviado
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0"
                                    onClick={() =>
                                      setDocumentPreview({
                                        type: item.type,
                                        doc: item.document,
                                      })
                                    }
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : (
                                <Badge variant="outline" className="text-red-600">
                                  Pendente
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="attendance" className="mt-4 space-y-4">
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">Taxa de Frequência</span>
                          <span className="text-2xl font-bold text-blue-600">
                            {selectedStudent.attendanceDates.percentage}%
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        Registros de frequência ainda não foram disponibilizados nesta tela.
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="mt-6 flex gap-3 border-t pt-6">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedStudent(null)}
                    >
                      Fechar
                    </Button>
                  </div>
                </>
              )}

              {documentPreview && (
                <>
                  <DialogHeader>
                    <div className="flex w-full items-center justify-between">
                      <DialogTitle>{documentPreview.type}</DialogTitle>
                      <button
                        onClick={() => setDocumentPreview(null)}
                        className="rounded-md opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Fechar</span>
                      </button>
                    </div>
                  </DialogHeader>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {documentPreview.doc.fileName || `${documentPreview.type}.pdf`}
                        </p>
                        {documentPreview.doc.uploadDate && (
                          <p className="mt-1 text-xs text-slate-500">
                            Enviado em {safeDate(documentPreview.doc.uploadDate)}
                          </p>
                        )}
                      </div>
                      {documentPreview.doc.fileUrl ? (
                        <Button size="sm" variant="outline" className="gap-2" asChild>
                          <a
                            href={documentPreview.doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="h-4 w-4" />
                            Abrir
                          </a>
                        </Button>
                      ) : (
                        <Badge variant="outline">Arquivo indisponível</Badge>
                      )}
                    </div>

                    <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 p-8">
                      <div className="text-center">
                        <FileText className="mx-auto mb-3 h-12 w-12 text-slate-400" />
                        <p className="text-sm text-slate-600">Prévia não disponível</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Use o botão acima para abrir o documento real.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 border-t pt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setDocumentPreview(null)}
                      >
                        Voltar
                      </Button>
                      {documentPreview.doc.fileUrl ? (
                        <Button className="flex-1 gap-2" asChild>
                          <a
                            href={documentPreview.doc.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Download className="h-4 w-4" />
                            Abrir Documento
                          </a>
                        </Button>
                      ) : (
                        <Button className="flex-1 gap-2" disabled>
                          <Download className="h-4 w-4" />
                          Documento indisponível
                        </Button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
