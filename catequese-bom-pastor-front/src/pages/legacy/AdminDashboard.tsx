import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { ADMIN_NAV_ITEMS } from "@/lib/sidebarNavItems";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Archive,
  Bell,
  BookOpen,
  Calendar,
  ChevronRight,
  ClipboardList,
  Clock,
  Cross,
  DollarSign,
  GraduationCap,
  LogOut,
  Menu,
  Music,
  MessageCircle,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Send,
  Shield,
  Users,
  X,
  Check,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchWithAuth } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";

interface DocumentInfo {
  status: boolean;
  uploadDate: string | null;
  fileName?: string;
}

interface Student {
  id: string;
  name: string;
  birthDate: string;
  baptismDate?: string;
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
  sacraments: {
    baptism: boolean;
    firstCommunion: boolean;
    confirmation: boolean;
    reconciliation: boolean;
  };
  parentContact: {
    parentName: string;
    parentPhone: string;
    parentEmail: string;
  };
}

interface Catequista {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
  attendance: {
    percentage: number;
    totalClasses: number;
    attendedClasses: number;
  };
}

interface Turma {
  id: string;
  name: string;
  level: number;
  levelName: string;
  schedule: string;
  room: string;
  catequistasTurma: Array<{
    id: string;
    categoria: "CATEQUISTA" | "AUXILIAR";
    catequista: Catequista;
  }>;
  students: Student[];
}

export default function AdminDashboard() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [catequistas, setCatequistas] = useState<Catequista[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedCatequista, setSelectedCatequista] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);
  const [savingTurma, setSavingTurma] = useState(false);
  const [deletingTurmaId, setDeletingTurmaId] = useState<string | null>(null);
  const [communicationOpen, setCommunicationOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedTurmaDetail, setSelectedTurmaDetail] = useState<Turma | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);
  const [messageRecipient, setMessageRecipient] = useState<string>("catequistas");
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState(
    [
      {
        id: 1,
        from: "Coordenação",
        to: "Catequistas",
        role: "catequista",
        body: "Lembrem de registrar presenças até 12h.",
        date: "Hoje",
      },
      {
        id: 2,
        from: "Coordenação",
        to: "Pais",
        role: "pai",
        body: "Reunião geral neste sábado às 10h no salão paroquial.",
        date: "Ontem",
      },
    ] satisfies Array<{
      id: number;
      from: string;
      to: string;
      role: "catequista" | "pai";
      body: string;
      date: string;
    }>
  );

  const notifications = [
    { id: 1, type: "alert", title: "Documentos pendentes", message: "5 famílias com documentação incompleta", date: "Hoje" },
    { id: 2, type: "event", title: "Evento da Paróquia", message: "Preparação para o Natal - 18/12 às 19h", date: "16/12" },
    { id: 3, type: "reminder", title: "Pagamentos atrasados", message: "3 responsáveis com mensalidades em atraso", date: "14/12" },
  ];

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    level: "",
    schedule: "",
    room: "",
  });

  const navVariant = (path: string) =>
    location.pathname === path ? "navActive" : "nav";

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-sage-light text-sage-dark";
      case 2:
        return "bg-gold-light text-gold-dark";
      case 3:
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getLevelName = (level: number) => {
    switch (level) {
      case 1:
        return "Nível I";
      case 2:
        return "Nível II";
      case 3:
        return "Nível III";
      default:
        return `Nível ${level}`;
    }
  };

  const getInitials = (nome: string) =>
    nome
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const formatCategoriaTurma = (categoria: "CATEQUISTA" | "AUXILIAR") =>
    categoria === "AUXILIAR" ? "Auxiliar" : "Catequista";

  const carregarDados = async () => {
    try {
      const [turmasResponse, catequistasResponse] = await Promise.all([
        fetchWithAuth(API_ROUTES.turmas),
        fetchWithAuth(API_ROUTES.catequistas),
      ]);

      const turmasData = turmasResponse.ok ? await turmasResponse.json() : null;
      const catequistasData = catequistasResponse.ok ? await catequistasResponse.json() : null;

      const catequistasList = Array.isArray(catequistasData?.catequistas)
        ? catequistasData.catequistas
        : [];

      const turmasList = Array.isArray(turmasData?.turmas) ? turmasData.turmas : [];

      const mappedCatequistas: Catequista[] = catequistasList.map((cat: any) => ({
        id: String(cat.id),
        name: cat.nome,
        email: cat.email,
        phone: cat.telefone || "",
        address: cat.endereco || "",
        bio: cat.bio || "",
        attendance: { percentage: 0, totalClasses: 0, attendedClasses: 0 },
      }));

      const mappedTurmas: Turma[] = turmasList.map((turma: any) => {
        const catequistasTurma = Array.isArray(turma.catequistasTurma)
          ? turma.catequistasTurma
              .map((vinculo: any) => {
                const catequistaInfo = mappedCatequistas.find((cat) => cat.id === String(vinculo.catequista?.id));

                if (!catequistaInfo) {
                  return null;
                }

                return {
                  id: String(vinculo.id || `${vinculo.turmaId || turma.id}-${catequistaInfo.id}`),
                  categoria: vinculo.categoria === "AUXILIAR" ? "AUXILIAR" : "CATEQUISTA",
                  catequista: catequistaInfo,
                };
              })
              .filter(Boolean)
          : [];
        const students: Student[] = Array.isArray(turma.catequizandos)
          ? turma.catequizandos.map((catequizando: any) => {
              const docs = Array.isArray(catequizando.documentos)
                ? catequizando.documentos
                : [];

              const getDoc = (tipo: string) =>
                docs.find((doc: any) => doc.tipo === tipo);

              const birthDoc = getDoc("CERTIDAO_NASCIMENTO");
              const cpfDoc = getDoc("CPF");
              const vaccineDoc = getDoc("CARTEIRA_VACINA");

              return {
                id: catequizando.id,
                name: catequizando.nome,
                birthDate: catequizando.dataNascimento,
                baptismDate: catequizando.dataBatismo || undefined,
                phone: catequizando.telefone || catequizando.responsavel?.telefone || "",
                email: catequizando.email || catequizando.responsavel?.email || "",
                address: catequizando.endereco || "",
                cpf: catequizando.cpf || "",
                documents: {
                  birthCertificate: {
                    status: birthDoc?.status ?? false,
                    uploadDate: birthDoc?.uploadDate ? new Date(birthDoc.uploadDate).toISOString().split("T")[0] : null,
                    fileName: undefined,
                  },
                  cpf: {
                    status: cpfDoc?.status ?? false,
                    uploadDate: cpfDoc?.uploadDate ? new Date(cpfDoc.uploadDate).toISOString().split("T")[0] : null,
                    fileName: undefined,
                  },
                  vaccineCard: {
                    status: vaccineDoc?.status ?? false,
                    uploadDate: vaccineDoc?.uploadDate ? new Date(vaccineDoc.uploadDate).toISOString().split("T")[0] : null,
                    fileName: undefined,
                  },
                },
                attendanceDates: { percentage: 0, absenceDates: [] },
                avatar: getInitials(catequizando.nome),
                sacraments: {
                  baptism: false,
                  firstCommunion: false,
                  confirmation: false,
                  reconciliation: false,
                },
                parentContact: {
                  parentName: catequizando.responsavel?.nome || "",
                  parentPhone: catequizando.responsavel?.telefone || "",
                  parentEmail: catequizando.responsavel?.email || "",
                },
              };
            })
          : [];

        return {
          id: turma.id,
          name: turma.nome,
          level: turma.ano,
          levelName: getLevelName(turma.ano),
          schedule: turma.horario || "",
          room: turma.sala || "",
          catequistasTurma,
          students,
        };
      });

      setTurmas(mappedTurmas);
      setCatequistas(mappedCatequistas);
    } catch (error) {
      console.error("Erro ao carregar turmas:", error);
      setTurmas([]);
    }
  };

  useEffect(() => {
    if (isAdminRoute) {
      carregarDados();
    }
  }, [isAdminRoute]);

  const filteredTurmas = turmas.filter((turma) => {
    const levelMatch = selectedLevel === "all" || turma.level === parseInt(selectedLevel);
    const catequistatMatch =
      selectedCatequista === "all" || turma.catequistasTurma.some((vinculo) => vinculo.catequista.id === selectedCatequista);
    return levelMatch && catequistatMatch;
  });

  const recipientOptions = [
    { id: "catequistas", label: "Todos os catequistas" },
    { id: "pais", label: "Todos os pais" },
  ];

  const handleSendMessage = () => {
    if (!messageText.trim()) return;
    const selected = recipientOptions.find((r) => r.id === messageRecipient);
    if (!selected) return;

    setMessages((prev) => [
      {
        id: prev.length + 1,
        from: "Coordenação",
        to: selected.label,
        role: selected.id === "pais" ? "pai" : "catequista",
        body: messageText.trim(),
        date: "Agora",
      },
      ...prev,
    ]);
    setMessageText("");
  };

  const handleAddTurma = async () => {
    if (!formData.name || !formData.level || !formData.schedule) {
      alert("Por favor, preencha nome, nível e horário");
      return;
    }

    const levelNumber = Number(formData.level);
    if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > 3) {
      alert("A etapa deve ser Nível I, II ou III");
      return;
    }

    setSavingTurma(true);
    try {
      const isEditing = Boolean(editingTurmaId);
      const response = await fetchWithAuth(
        isEditing ? `${API_ROUTES.turmas}/${editingTurmaId}` : API_ROUTES.turmas,
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify({
            nome: formData.name,
            ano: levelNumber,
            horario: formData.schedule,
            sala: formData.room || undefined,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        alert(
          error?.message ||
            (isEditing
              ? "Não foi possível atualizar a turma"
              : "Não foi possível criar a turma")
        );
        return;
      }

      await carregarDados();
      setDialogOpen(false);
      setEditingTurmaId(null);
      setFormData({
        name: "",
        level: "",
        schedule: "",
        room: "",
      });
    } catch (error) {
      console.error("Erro ao salvar turma:", error);
      alert(editingTurmaId ? "Erro ao atualizar turma" : "Erro ao criar turma");
    } finally {
      setSavingTurma(false);
    }
  };

  const handleEditTurma = (turma: Turma) => {
    const turmaLevel = String(turma.level);
    const isValidLevel = ["1", "2", "3"].includes(turmaLevel);

    setEditingTurmaId(turma.id);
    setFormData({
      name: turma.name,
      level: isValidLevel ? turmaLevel : "",
      schedule: turma.schedule,
      room: turma.room,
    });
    setDialogOpen(true);
  };

  const handleDeleteTurma = async (turma: Turma) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a turma \"${turma.name}\"?`
    );
    if (!confirmed) {
      return;
    }

    setDeletingTurmaId(turma.id);
    try {
      const response = await fetchWithAuth(`${API_ROUTES.turmas}/${turma.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        alert(error?.message || "Não foi possível excluir a turma");
        return;
      }

      await carregarDados();
    } catch (error) {
      console.error("Erro ao excluir turma:", error);
      alert("Erro ao excluir turma");
    } finally {
      setDeletingTurmaId(null);
    }
  };

  const handleOpenAddTurmaDialog = () => {
    setEditingTurmaId(null);
    setFormData({
      name: "",
      level: "",
      schedule: "",
      room: "",
    });
    setDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingTurmaId(null);
      setFormData({
        name: "",
        level: "",
        schedule: "",
        room: "",
      });
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("role");
    } catch {}
    window.location.href = "/login";
  };

  return (
    <div className={`flex min-h-screen bg-background transition-[padding] duration-300 ${sidebarOpen ? "lg:pl-64" : "lg:pl-0"}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } `}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
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

          <SidebarNav items={ADMIN_NAV_ITEMS} pathname={location.pathname} />

          {/* Logout */}
          <div className="border-t p-4">
            <Button
              variant="nav"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 border-b bg-card">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className={sidebarOpen ? "lg:hidden" : ""}
                onClick={toggleSidebar}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Gerenciamento de Turmas</h1>
                <p className="text-sm text-muted-foreground">
                  Administre todas as turmas da catequese
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Turmas
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{turmas.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Nível I
                  </CardTitle>
                  <Badge className={getLevelColor(1)}>I</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {turmas.filter((t) => t.level === 1).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Nível II
                  </CardTitle>
                  <Badge className={getLevelColor(2)}>II</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {turmas.filter((t) => t.level === 2).length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Nível III
                  </CardTitle>
                  <Badge className={getLevelColor(3)}>III</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {turmas.filter((t) => t.level === 3).length}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Add Button */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Todas as Turmas</CardTitle>
                    <CardDescription>
                      Visualize e gerencie todas as turmas da catequese
                    </CardDescription>
                  </div>
                  <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
                    <DialogTrigger asChild>
                      <Button size="lg" className="gap-2" onClick={handleOpenAddTurmaDialog}>
                        <Plus className="h-5 w-5" />
                        Adicionar Nova Turma
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>
                          {editingTurmaId ? "Editar Turma" : "Adicionar Nova Turma"}
                        </DialogTitle>
                        <DialogDescription>
                          {editingTurmaId
                            ? "Atualize os dados da turma"
                            : "Preencha os dados da nova turma"}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Nome da Turma</Label>
                          <Input
                            id="name"
                            placeholder="Ex: Turma A"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="level">Etapa</Label>
                          <Select
                            value={formData.level}
                            onValueChange={(value) =>
                              setFormData({ ...formData, level: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a etapa" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Nível I</SelectItem>
                              <SelectItem value="2">Nível II</SelectItem>
                              <SelectItem value="3">Nível III</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="rounded-md border border-dashed bg-muted/20 p-3 text-sm text-muted-foreground">
                          Os vínculos com catequistas e auxiliares são feitos na aprovação das inscrições e aparecem na lista da turma abaixo.
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="schedule">Horário</Label>
                          <Input
                            id="schedule"
                            placeholder="Ex: Sábados, 9h às 11h"
                            value={formData.schedule}
                            onChange={(e) =>
                              setFormData({ ...formData, schedule: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="room">Sala</Label>
                          <Input
                            id="room"
                            placeholder="Ex: Sala 1"
                            value={formData.room}
                            onChange={(e) =>
                              setFormData({ ...formData, room: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setDialogOpen(false)}
                          disabled={savingTurma}
                        >
                          Cancelar
                        </Button>
                        <Button onClick={handleAddTurma} disabled={savingTurma}>
                          {savingTurma ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Salvando...
                            </>
                          ) : editingTurmaId ? (
                            "Salvar alterações"
                          ) : (
                            "Adicionar"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filtrar por etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as etapas</SelectItem>
                      <SelectItem value="1">Nível I</SelectItem>
                      <SelectItem value="2">Nível II</SelectItem>
                      <SelectItem value="3">Nível III</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedCatequista}
                    onValueChange={setSelectedCatequista}
                  >
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filtrar por catequista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os catequistas</SelectItem>
                      {catequistas.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Só catequistas aprovados aparecem nesta lista. Inscrições pendentes continuam na tela de Catequistas até o admin aprovar e liberar a alocação em turma.
                </p>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Etapa</TableHead>
                        <TableHead>Catequistas e auxiliares</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Sala</TableHead>
                        <TableHead className="text-right">Alunos</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTurmas.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="h-24 text-center text-muted-foreground"
                          >
                            Nenhuma turma encontrada com os filtros selecionados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredTurmas.map((turma) => (
                          <TableRow 
                            key={turma.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setSelectedTurmaDetail(turma)}
                          >
                            <TableCell className="font-medium">
                              {turma.name}
                            </TableCell>
                            <TableCell>
                              <Badge className={getLevelColor(turma.level)}>
                                {turma.levelName}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-2">
                                {turma.catequistasTurma.length > 0 ? (
                                  turma.catequistasTurma.map((vinculo) => (
                                    <div key={vinculo.id} className="flex flex-wrap items-center gap-2">
                                      <span className="font-medium">{vinculo.catequista.name}</span>
                                      <Badge variant={vinculo.categoria === "AUXILIAR" ? "secondary" : "default"}>
                                        {formatCategoriaTurma(vinculo.categoria)}
                                      </Badge>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground">Nenhum vínculo ainda</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {turma.schedule}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {turma.room}
                            </TableCell>
                            <TableCell className="text-right">
                              {turma.students.length}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                                  title="Editar turma"
                                  aria-label="Editar turma"
                                  onClick={() => handleEditTurma(turma)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 rounded-md border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  title="Excluir turma"
                                  aria-label="Excluir turma"
                                  disabled={deletingTurmaId === turma.id}
                                  onClick={() => handleDeleteTurma(turma)}
                                >
                                  {deletingTurmaId === turma.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Modal - Turma Details (Lista de Catequizandos) */}
      <Dialog open={!!selectedTurmaDetail} onOpenChange={() => {
        setSelectedTurmaDetail(null);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTurmaDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedTurmaDetail.name}</DialogTitle>
                <DialogDescription>
                  <div className="flex flex-wrap gap-4 text-sm mt-2">
                    <div className="flex items-center gap-1">
                      <Badge className={getLevelColor(selectedTurmaDetail.level)}>
                        {selectedTurmaDetail.levelName}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {selectedTurmaDetail.schedule}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {selectedTurmaDetail.students.length} catequizandos
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Catequistas e auxiliares</h3>
                </div>
                {selectedTurmaDetail.catequistasTurma.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedTurmaDetail.catequistasTurma.map((vinculo) => (
                      <Card key={vinculo.id} className="border-border/60">
                        <CardContent className="space-y-3 pt-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {vinculo.catequista.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-foreground">{vinculo.catequista.name}</p>
                              <Badge variant={vinculo.categoria === "AUXILIAR" ? "secondary" : "default"}>
                                {formatCategoriaTurma(vinculo.categoria)}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-2 border-t pt-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4" />
                              <span>{vinculo.catequista.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>{vinculo.catequista.phone || "-"}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{vinculo.catequista.address || "-"}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum catequista ou auxiliar vinculado a esta turma.</p>
                )}
              </div>

              <div className="space-y-3 mt-6">
                <h3 className="font-semibold text-lg">Catequizandos</h3>
                {selectedTurmaDetail.students.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum catequizando nesta turma</p>
                ) : (
                  <div className="space-y-2">
                    {selectedTurmaDetail.students.map((student) => (
                      <Card 
                        key={student.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setSelectedStudentDetail(student)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.id}`}
                              />
                              <AvatarFallback>{student.avatar}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">{student.name}</p>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal - Student Details (Informações, Sacramentos, Contato dos Pais) */}
      <Dialog open={!!selectedStudentDetail} onOpenChange={() => setSelectedStudentDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedStudentDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedStudentDetail.id}`}
                    />
                    <AvatarFallback>{selectedStudentDetail.avatar}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle className="text-2xl">{selectedStudentDetail.name}</DialogTitle>
                    <DialogDescription className="text-base mt-1">
                      {selectedStudentDetail.email}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="info" className="w-full mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="sacraments">Sacramentos</TabsTrigger>
                  <TabsTrigger value="parents">Pais</TabsTrigger>
                </TabsList>

                {/* Informações Tab */}
                <TabsContent value="info" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Data de Nascimento</label>
                      <p className="text-slate-900 mt-1">{new Date(selectedStudentDetail.birthDate).toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">CPF</label>
                      <p className="text-slate-900 mt-1">{selectedStudentDetail.cpf}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-slate-600">Telefone</label>
                      <p className="text-slate-900 mt-1 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {selectedStudentDetail.phone}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-600">E-mail</label>
                      <p className="text-slate-900 mt-1 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {selectedStudentDetail.email}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Endereço</label>
                    <p className="text-slate-900 mt-1">{selectedStudentDetail.address}</p>
                  </div>
                </TabsContent>

                {/* Sacramentos Tab */}
                <TabsContent value="sacraments" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <span className="font-medium">Batismo</span>
                    <Badge className={selectedStudentDetail.sacraments.baptism ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {selectedStudentDetail.sacraments.baptism ? "✓ Recebido" : "✗ Não recebido"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <span className="font-medium">Primeira Comunhão</span>
                    <Badge className={selectedStudentDetail.sacraments.firstCommunion ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {selectedStudentDetail.sacraments.firstCommunion ? "✓ Recebida" : "✗ Não recebida"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <span className="font-medium">Confirmação</span>
                    <Badge className={selectedStudentDetail.sacraments.confirmation ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {selectedStudentDetail.sacraments.confirmation ? "✓ Recebida" : "✗ Não recebida"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <span className="font-medium">Reconciliação</span>
                    <Badge className={selectedStudentDetail.sacraments.reconciliation ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {selectedStudentDetail.sacraments.reconciliation ? "✓ Recebida" : "✗ Não recebida"}
                    </Badge>
                  </div>
                </TabsContent>

                {/* Pais Tab */}
                <TabsContent value="parents" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Contato do Responsável</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-slate-600">Nome</label>
                        <p className="text-slate-900 mt-1 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {selectedStudentDetail.parentContact.parentName}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">Telefone</label>
                        <p className="text-slate-900 mt-1 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {selectedStudentDetail.parentContact.parentPhone}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-600">E-mail</label>
                        <p className="text-slate-900 mt-1 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {selectedStudentDetail.parentContact.parentEmail}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex gap-3 mt-6 pt-6 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedStudentDetail(null)}
                >
                  Fechar
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10">
                <Bell className="h-5 w-5 text-gold-dark" />
              </div>
              Notificações
            </DialogTitle>
            <DialogDescription className="text-base">
              Acompanhe todas as notificações e avisos importantes
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[calc(90vh-180px)] pr-4">
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <Card key={notif.id} className="border-2 hover:border-primary/40 transition-colors">
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base mb-1">{notif.title}</p>
                        <p className="text-sm text-muted-foreground">{notif.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{notif.date}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-muted-foreground">Nenhuma notificação</p>
                <p className="text-sm text-muted-foreground mt-1">Você está em dia!</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Communication Dialog */}
      <Dialog open={communicationOpen} onOpenChange={setCommunicationOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              Comunicação
            </DialogTitle>
            <DialogDescription className="text-base">
              Envie mensagens para catequistas ou pais e acompanhe o histórico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Destinatário</label>
              <Select value={messageRecipient} onValueChange={setMessageRecipient}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Destinatário" />
                </SelectTrigger>
                <SelectContent>
                  {recipientOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Mensagem</label>
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Escreva sua mensagem aqui..."
                className="min-h-[140px] resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setHistoryOpen(true)}
                className="flex-1 mr-3"
              >
                <Clock className="mr-2 h-4 w-4" />
                Ver Histórico
                {messages.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{messages.length}</Badge>
                )}
              </Button>
              <Button onClick={handleSendMessage} disabled={!messageText.trim()} size="lg" className="min-w-[120px]">
                <Send className="mr-2 h-4 w-4" />
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10">
                <Bell className="h-5 w-5 text-gold-dark" />
              </div>
              Notificações
            </DialogTitle>
            <DialogDescription className="text-base">
              Acompanhe todas as notificações e avisos importantes
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[calc(90vh-180px)] pr-4">
            {notifications.length > 0 ? (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <Card key={notif.id} className="border-2 hover:border-primary/40 transition-colors">
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base mb-1">{notif.title}</p>
                        <p className="text-sm text-muted-foreground">{notif.message}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{notif.date}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Bell className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-muted-foreground">Nenhuma notificação</p>
                <p className="text-sm text-muted-foreground mt-1">Você está em dia!</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Message History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              Histórico de Mensagens
            </DialogTitle>
            <DialogDescription className="text-base">
              Acompanhe todas as mensagens enviadas para catequistas e pais
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-180px)] pr-4">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <MessageCircle className="mb-3 h-12 w-12 opacity-20" />
                  <p className="text-base font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-sm">Suas mensagens aparecerão aqui</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span>{msg.from}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span>{msg.to}</span>
                      </div>
                      <Badge variant={msg.role === "pai" ? "secondary" : "outline"} className="text-xs">
                        {msg.role === "pai" ? "Pais" : "Catequistas"}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{msg.body}</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{msg.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(true)}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gold shadow-lg transition-all hover:scale-110 hover:shadow-xl hover:bg-gold-dark focus:outline-none focus:ring-4 focus:ring-gold/50"
            aria-label="Abrir notificações"
          >
            <Bell className="h-7 w-7 text-white" />
          </button>
          {notifications.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center bg-red-500 border-2 border-background text-xs font-bold">
              {notifications.length}
            </Badge>
          )}
        </div>
        {/* Communication Button */}
        <button
          onClick={() => setCommunicationOpen(true)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-primary/50"
          aria-label="Abrir mensagens"
        >
          <MessageCircle className="h-7 w-7 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}