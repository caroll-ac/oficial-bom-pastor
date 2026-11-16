import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { ADMIN_NAV_ITEMS } from "@/lib/sidebarNavItems";
import { fetchWithAuth } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  ChevronLeft,
  ClipboardList,
  Cross,
  DollarSign,
  Loader2,
  LogOut,
  Menu,
  Music,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users,
  Trash2,
  X,
  XCircle,
  Plus,
  Mail,
  Eye,
  ExternalLink,
} from "lucide-react";

type InscricaoStatus = "PENDING" | "APPROVED" | "REJECTED";

interface Turma {
  id: string;
  nome: string;
  ano: number;
  catequistasTurma: Array<{
    id: string;
    categoria: "CATEQUISTA" | "AUXILIAR";
    catequista: {
      id: string;
      nome: string;
    };
  }>;
}

interface InscricaoCatequista {
  id: string;
  nome: string;
  dataNascimento: string;
  dataBatismo?: string | null;
  email: string;
  telefone: string;
  casado: string;
  casadaIgrejaCatolica?: string | null;
  sacramentos?: string | null;
  alergias?: string | null;
  sobreVoce?: string | null;
  termoMissaoVersao?: string | null;
  termoMissaoAceitoEm?: string | null;
  ComprovanteResidencia?: string | null;
  DocumentoCpf?: string | null;
  comprovantesSacramentos?: Record<string, string> | null;
  status: InscricaoStatus;
  needsPasswordSetup?: boolean;
  criadoEm: string;
  decisaoEm?: string | null;
  observacoesAdmin?: string | null;
  decisaoPor?: {
    nome: string;
    email: string;
  } | null;
}

// Novas interfaces para o controle de Reuniões e Presença
interface PresencaReuniao {
  catequistaId: string;
  nome: string;
  confirmado: "PENDENTE" | "CONFIRMADO" | "RECUSADO";
}

interface Reuniao {
  id: string;
  titulo: string;
  dataHora: string;
  pauta: string;
  presencas: PresencaReuniao[];
}

interface TurmaResumo {
  id: string;
  nome: string;
  ano: number;
}

interface CatequistaVinculo {
  id: string;
  categoria: "CATEQUISTA" | "AUXILIAR";
  turma: TurmaResumo;
}

interface Catequista {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  endereco?: string | null;
  bio?: string | null;
  primeiroAcesso?: boolean;
  criadoEm?: string;
  updatedAt?: string;
  turmas: CatequistaVinculo[];
}

interface CatequistaFormState {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  endereco: string;
  bio: string;
}

const NO_TURMA_VALUE = "__NO_TURMA__";
const CATEGORIA_CATEQUISTA_VALUE = "catequista";
const CATEGORIA_AUXILIAR_VALUE = "auxiliar";
const SACRAMENT_LABELS: Record<string, string> = {
  BATISMO: "Batismo",
  EUCARISTIA: "Eucaristia",
  CRISMA: "Crisma",
  MATRIMONIO: "Matrimônio",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function AdminInscricoesCatequistas() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();

  const [loading, setLoading] = useState(false);
  const [catequistasLoading, setCatequistasLoading] = useState(false);
  const [turmasLoading, setTurmasLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const loadingInscricoesRef = useRef(false);
  const [inscricoes, setInscricoes] = useState<InscricaoCatequista[]>([]);
  const [inscricaoSelecionada, setInscricaoSelecionada] = useState<InscricaoCatequista | null>(null);
  const [catequistas, setCatequistas] = useState<Catequista[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<InscricaoStatus | "ALL" | "REUNIOES">("PENDING");
  const [catequistaDialogOpen, setCatequistaDialogOpen] = useState(false);
  const [editingCatequistaId, setEditingCatequistaId] = useState<string | null>(null);
  const [catequistaSaving, setCatequistaSaving] = useState(false);
  const [catequistaDeletingId, setCatequistaDeletingId] = useState<string | null>(null);
  const [catequistaForm, setCatequistaForm] = useState<CatequistaFormState>({
    nome: "",
    email: "",
    senha: "",
    telefone: "",
    endereco: "",
    bio: "",
  });
  
  // Estados para Modal de Aprovação
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [inscricaoToApprove, setInscricaoToApprove] = useState<InscricaoCatequista | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(NO_TURMA_VALUE);
  const [selectedCategoriaTurma, setSelectedCategoriaTurma] = useState<string>(CATEGORIA_CATEQUISTA_VALUE);

  // Novos Estados para o fluxo de Reuniões
  const [reunioes, setReunioes] = useState<Reuniao[]>([]);
  const [reuniaoDialogOpen, setReuniaoDialogOpen] = useState(false);
  const [novaReuniao, setNovaReuniao] = useState({ titulo: "", dataHora: "", pauta: "" });

  const isAdminRoute = location.pathname.startsWith("/admin");
  useEffect(() => {
    if (!isAdminRoute) {
      toast({
        variant: "destructive",
        title: "Acesso negado",
        description: "Apenas administradores podem acessar esta página",
      });
      navigate("/");
      return;
    }

    void carregarTurmas();
    carregarDados();
    carregarCatequistas();
    // Simulação ou chamada real para buscar reuniões agendadas
    carregarReunioes();
  }, [isAdminRoute]);

  const carregarDados = async (silencioso = false) => {
    if (loadingInscricoesRef.current) return;
    loadingInscricoesRef.current = true;
    if (!silencioso) setLoading(true);
    try {
      const response = await fetchWithAuth(`${API_ROUTES.catequistasInscricoes}?limit=1000&offset=0`);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.message || "Falha ao carregar inscricoes de catequista");
      }

      const data = await response.json();
      const list = Array.isArray(data?.inscricoes)
        ? data.inscricoes
        : Array.isArray(data)
          ? data
          : [];

      setInscricoes(
        list.map((item: any) => ({
          id: String(item.id),
          nome: String(item.nome || ""),
          dataNascimento: String(item.dataNascimento || ""),
          dataBatismo: item.dataBatismo || null,
          email: String(item.email || ""),
          telefone: String(item.telefone || ""),
          casado: item.casado === true || item.casado === "true" ? "Sim" : "Não",
          casadaIgrejaCatolica: item.casadaIgrejaCatolica == null
            ? null
            : item.casadaIgrejaCatolica === true || item.casadaIgrejaCatolica === "true"
              ? "Sim"
              : "Não",
          sacramentos: item.sacramentos || null,
          alergias: item.alergias || null,
          sobreVoce: item.sobreVoce || null,
          termoMissaoVersao: item.termoMissaoVersao || null,
          termoMissaoAceitoEm: item.termoMissaoAceitoEm || null,
          ComprovanteResidencia: item.ComprovanteResidencia || null,
          DocumentoCpf: item.DocumentoCpf || null,
          comprovantesSacramentos: item.comprovantesSacramentos && typeof item.comprovantesSacramentos === "object"
            ? item.comprovantesSacramentos
            : {},
          status: item.status,
          needsPasswordSetup: Boolean(item.needsPasswordSetup),
          criadoEm: item.criadoEm,
          decisaoEm: item.decisaoEm || null,
          observacoesAdmin: item.observacoesAdmin || null,
          decisaoPor: item.decisaoPor
            ? {
                nome: String(item.decisaoPor.nome || ""),
                email: String(item.decisaoPor.email || ""),
              }
            : null,
        }))
      );
    } catch (error: any) {
      console.error("Erro ao carregar inscricoes de catequista:", error);
      if (!silencioso) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: error?.message || "Nao foi possivel carregar as inscricoes de catequista",
        });
      }
    } finally {
      loadingInscricoesRef.current = false;
      if (!silencioso) setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdminRoute) return;

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void carregarDados(true);
    };
    const intervalId = window.setInterval(refreshWhenVisible, 30_000);
    window.addEventListener("focus", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshWhenVisible);
    };
  }, [isAdminRoute]);

  const carregarTurmas = async () => {
    setTurmasLoading(true);
    try {
      const response = await fetchWithAuth(`${API_ROUTES.turmas}?limit=1000&offset=0`);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.message || "Falha ao carregar turmas");
      }

      const data = await response.json();
      const list = Array.isArray(data?.turmas)
        ? data.turmas
        : Array.isArray(data)
          ? data
          : [];

      setTurmas(
        list.map((item: any) => ({
          id: String(item.id),
          nome: String(item.nome || ""),
          ano: Number(item.ano || 0),
          catequistasTurma: Array.isArray(item.catequistasTurma)
            ? item.catequistasTurma
                .map((vinculo: any) => {
                  if (!vinculo?.catequista?.id) {
                    return null;
                  }

                  return {
                    id: String(vinculo.id || ""),
                    categoria: vinculo.categoria === "AUXILIAR" ? "AUXILIAR" : "CATEQUISTA",
                    catequista: {
                      id: String(vinculo.catequista.id),
                      nome: String(vinculo.catequista.nome || ""),
                    },
                  };
                })
                .filter(Boolean)
            : [],
        }))
      );
    } catch (error: any) {
      console.error("Erro ao carregar turmas:", error);
      setTurmas([]);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Nao foi possivel carregar as turmas",
      });
    } finally {
      setTurmasLoading(false);
    }
  };

  const carregarCatequistas = async () => {
    setCatequistasLoading(true);
    try {
      const response = await fetchWithAuth(API_ROUTES.catequistas);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.message || "Falha ao carregar catequistas");
      }

      const data = await response.json();
      const list = Array.isArray(data?.catequistas)
        ? data.catequistas
        : Array.isArray(data)
          ? data
          : [];

      setCatequistas(
        list.map((item: any) => ({
          id: String(item.id),
          nome: String(item.nome || ""),
          email: String(item.email || ""),
          telefone: item.telefone || null,
          endereco: item.endereco || null,
          bio: item.bio || null,
          primeiroAcesso: Boolean(item.primeiroAcesso),
          criadoEm: item.criadoEm || null,
          updatedAt: item.updatedAt || null,
          turmas: Array.isArray(item.turmas)
            ? item.turmas
                .map((vinculo: any) => {
                  if (!vinculo?.turma?.id) {
                    return null;
                  }

                  return {
                    id: String(vinculo.id || ""),
                    categoria: vinculo.categoria === "AUXILIAR" ? "AUXILIAR" : "CATEQUISTA",
                    turma: {
                      id: String(vinculo.turma.id),
                      nome: String(vinculo.turma.nome || ""),
                      ano: Number(vinculo.turma.ano || 0),
                    },
                  };
                })
                .filter(Boolean)
            : [],
        }))
      );
    } catch (error: any) {
      console.error("Erro ao carregar catequistas:", error);
      setCatequistas([]);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Nao foi possivel carregar os catequistas",
      });
    } finally {
      setCatequistasLoading(false);
    }
  };

  // Mock ou chamada API para preencher as reuniões organizadas
  const carregarReunioes = () => {
    // Exemplo estrutural mockado inicial
    setReunioes([
      {
        id: "1",
        titulo: "Planejamento Semestral da Catequese",
        dataHora: "2026-08-10T19:30",
        pauta: "Definição do calendário litúrgico e distribuição dos materiais didáticos.",
        presencas: [
          { catequistaId: "101", nome: "Maria Silva", confirmado: "CONFIRMADO" },
          { catequistaId: "102", nome: "João Santos", confirmado: "PENDENTE" },
        ],
      },
    ]);
  };

  const filteredInscricoes = useMemo(() => {
    if (selectedStatus === "ALL" || selectedStatus === "REUNIOES") {
      return inscricoes;
    }
    return inscricoes.filter((inscricao) => inscricao.status === selectedStatus);
  }, [inscricoes, selectedStatus]);

  const counts = useMemo(() => {
    return {
      pending: inscricoes.filter((item) => item.status === "PENDING").length,
      approved: inscricoes.filter((item) => item.status === "APPROVED").length,
      rejected: inscricoes.filter((item) => item.status === "REJECTED").length,
      total: inscricoes.length,
    };
  }, [inscricoes]);

  const catequistasAprovados = useMemo(() => {
    return inscricoes.filter((item) => item.status === "APPROVED");
  }, [inscricoes]);

  const selectedTurma = useMemo(() => {
    if (selectedTurmaId === NO_TURMA_VALUE) {
      return null;
    }
    return turmas.find((turma) => turma.id === selectedTurmaId) ?? null;
  }, [selectedTurmaId, turmas]);

  const openApproveDialog = (inscricao: InscricaoCatequista) => {
    setInscricaoToApprove(inscricao);
    setSelectedTurmaId(NO_TURMA_VALUE);
    setSelectedCategoriaTurma(CATEGORIA_CATEQUISTA_VALUE);
    setApproveDialogOpen(true);
  };

  const closeApproveDialog = (open: boolean) => {
    setApproveDialogOpen(open);
    if (!open) {
      setInscricaoToApprove(null);
      setSelectedTurmaId(NO_TURMA_VALUE);
      setSelectedCategoriaTurma(CATEGORIA_CATEQUISTA_VALUE);
    }
  };

  const handleApprove = async () => {
    const currentInscricao = inscricaoToApprove;
    if (!currentInscricao) return;

    setActionLoadingId(currentInscricao.id);
    try {
      const turmaId = selectedTurmaId === NO_TURMA_VALUE ? undefined : selectedTurmaId;
      const response = await fetchWithAuth(API_ROUTES.catequistasInscricoesApprove(currentInscricao.id), {
        method: "PUT",
        body: JSON.stringify({
          ...(turmaId
            ? {
                turmaId,
                categoriaTurma: selectedCategoriaTurma,
              }
            : {}),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Nao foi possivel aprovar a inscricao");
      }

      const approvalResult = await response.json().catch(() => ({}));

      const turmaSelecionada = turmaId ? turmas.find((turma) => turma.id === turmaId) : null;

      toast({
        title: "Inscricao aprovada",
        description: !approvalResult.emailSent
          ? "A aprovação foi registrada, mas o convite não foi enviado. Verifique o SMTP; você poderá reenviá-lo na lista de aprovadas."
          : turmaSelecionada
          ? `${currentInscricao.nome} foi aprovada e alocada em ${turmaSelecionada.nome} como ${
              selectedCategoriaTurma === CATEGORIA_AUXILIAR_VALUE ? "auxiliar" : "catequista"
            }.`
          : `${currentInscricao.nome} foi aprovada sem alocacao em turma.`,
        variant: approvalResult.emailSent ? "default" : "destructive",
      });

      closeApproveDialog(false);
      await carregarDados();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Erro ao aprovar inscricao",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResendPasswordSetupInvite = async (inscricao: InscricaoCatequista) => {
    setActionLoadingId(inscricao.id);
    try {
      const response = await fetchWithAuth(API_ROUTES.catequistasInscricoesPasswordSetupInvite(inscricao.id), {
        method: "POST",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.message || "Não foi possível reenviar o convite.");
      toast({ title: "Convite reenviado", description: `Novo link enviado para ${inscricao.email}.` });
      await carregarDados();
    } catch (error) {
      toast({
        title: "Falha ao enviar convite",
        description: error instanceof Error ? error.message : "Verifique o SMTP e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (inscricao: InscricaoCatequista) => {
    setActionLoadingId(inscricao.id);
    try {
      const response = await fetchWithAuth(API_ROUTES.catequistasInscricoesReject(inscricao.id), {
        method: "PUT",
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Nao foi possivel reprovar a inscricao");
      }

      toast({
        title: "Inscricao reprovada",
        description: `${inscricao.nome} foi marcada como nao aprovada.`,
      });

      await carregarDados();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Erro ao reprovar inscricao",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const openNewCatequistaDialog = () => {
    setEditingCatequistaId(null);
    setCatequistaForm({
      nome: "",
      email: "",
      senha: "",
      telefone: "",
      endereco: "",
      bio: "",
    });
    setCatequistaDialogOpen(true);
  };

  const openEditCatequistaDialog = (catequista: Catequista) => {
    setEditingCatequistaId(catequista.id);
    setCatequistaForm({
      nome: catequista.nome,
      email: catequista.email,
      senha: "",
      telefone: catequista.telefone || "",
      endereco: catequista.endereco || "",
      bio: catequista.bio || "",
    });
    setCatequistaDialogOpen(true);
  };

  const closeCatequistaDialog = (open: boolean) => {
    setCatequistaDialogOpen(open);
    if (!open) {
      setEditingCatequistaId(null);
      setCatequistaForm({
        nome: "",
        email: "",
        senha: "",
        telefone: "",
        endereco: "",
        bio: "",
      });
    }
  };

  const handleSaveCatequista = async () => {
    if (!catequistaForm.nome.trim() || !catequistaForm.email.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Informe nome e e-mail do catequista.",
      });
      return;
    }

    if (!editingCatequistaId && !catequistaForm.senha.trim()) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Informe uma senha para o novo catequista.",
      });
      return;
    }

    setCatequistaSaving(true);
    try {
      const isEditing = Boolean(editingCatequistaId);
      const response = await fetchWithAuth(
        isEditing ? `${API_ROUTES.catequistas}/${editingCatequistaId}` : API_ROUTES.catequistas,
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify({
            nome: catequistaForm.nome.trim(),
            email: catequistaForm.email.trim(),
            telefone: catequistaForm.telefone.trim() || undefined,
            endereco: catequistaForm.endereco.trim() || undefined,
            bio: catequistaForm.bio.trim() || undefined,
            ...(isEditing ? {} : { senha: catequistaForm.senha }),
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Nao foi possivel salvar o catequista");
      }

      toast({
        title: isEditing ? "Catequista atualizado" : "Catequista cadastrado",
        description: `${catequistaForm.nome} foi salvo com sucesso.`,
      });

      closeCatequistaDialog(false);
      await carregarCatequistas();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Erro ao salvar catequista",
      });
    } finally {
      setCatequistaSaving(false);
    }
  };

  const handleDeleteCatequista = async (catequista: Catequista) => {
    const confirmed = window.confirm(`Excluir o catequista ${catequista.nome}?`);
    if (!confirmed) {
      return;
    }

    setCatequistaDeletingId(catequista.id);
    try {
      const response = await fetchWithAuth(`${API_ROUTES.catequistas}/${catequista.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.message || "Nao foi possivel excluir o catequista");
      }

      toast({
        title: "Catequista excluído",
        description: `${catequista.nome} foi removido do cadastro.`,
      });

      await carregarCatequistas();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error?.message || "Erro ao excluir catequista",
      });
    } finally {
      setCatequistaDeletingId(null);
    }
  };

  // Cadastra nova reunião e injeta automaticamente todos os catequistas ativos
  const handleAgendarReuniao = () => {
    if (!novaReuniao.titulo || !novaReuniao.dataHora) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha o título e a data/hora da reunião.",
      });
      return;
    }

    const novasPresencas: PresencaReuniao[] = catequistasAprovados.map((cat) => ({
      catequistaId: cat.id,
      nome: cat.nome,
      confirmado: "PENDENTE",
    }));

    const agendamento: Reuniao = {
      id: String(Date.now()),
      titulo: novaReuniao.titulo,
      dataHora: novaReuniao.dataHora,
      pauta: novaReuniao.pauta,
      presencas: novasPresencas,
    };

    setReunioes([agendamento, ...reunioes]);
    setReuniaoDialogOpen(false);
    setNovaReuniao({ titulo: "", dataHora: "", pauta: "" });

    toast({
      title: "Reunião Agendada",
      description: "A reunião foi criada e a lista de chamada gerada com sucesso.",
    });
  };

  // Altera dinamicamente o status de presença de um catequista na reunião
  const handleAlterarPresenca = (reuniaoId: string, catequistaId: string, novoStatus: "PENDENTE" | "CONFIRMADO" | "RECUSADO") => {
    setReunioes(
      reunioes.map((reuniao) => {
        if (reuniao.id !== reuniaoId) return reuniao;
        return {
          ...reuniao,
          presencas: reuniao.presencas.map((p) =>
            p.catequistaId === catequistaId ? { ...p, confirmado: novoStatus } : p
          ),
        };
      })
    );

    toast({
      title: "Presença atualizada",
      description: "O status da confirmação foi alterado.",
    });
  };

  const statusBadge = (status: InscricaoStatus) => {
    if (status === "APPROVED") return <Badge className="bg-green-600">Aprovada</Badge>;
    if (status === "REJECTED") return <Badge variant="destructive">Reprovada</Badge>;
    return <Badge className="bg-orange-600">Pendente</Badge>;
  };

  const statusPresencaBadge = (status: "PENDENTE" | "CONFIRMADO" | "RECUSADO") => {
    if (status === "CONFIRMADO") return <Badge className="bg-green-600">Confirmado</Badge>;
    if (status === "RECUSADO") return <Badge variant="destructive">Recusou</Badge>;
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const renderTable = (items: InscricaoCatequista[]) => (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Dados</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Decisão</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Nenhuma inscricao encontrada.
              </TableCell>
            </TableRow>
          ) : (
            items.map((inscricao) => (
              <TableRow key={inscricao.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{inscricao.nome}</div>
                    <div className="text-xs text-muted-foreground">Enviada em {formatDate(inscricao.criadoEm)}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm">
                    <div>{inscricao.email}</div>
                    <div className="text-muted-foreground">{inscricao.telefone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>Nascimento: {formatDate(inscricao.dataNascimento)}</div>
                    <div>Batismo: {formatDate(inscricao.dataBatismo)}</div>
                    <div>Casado: {inscricao.casado}</div>
                    <div>Igreja Católica: {inscricao.casadaIgrejaCatolica || "-"}</div>
                  </div>
                </TableCell>
                <TableCell>{statusBadge(inscricao.status)}</TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>{inscricao.decisaoPor ? `Por ${inscricao.decisaoPor.nome}` : "-"}</div>
                    <div>{formatDate(inscricao.decisaoEm)}</div>
                    <div className="max-w-xs truncate">{inscricao.observacoesAdmin || "-"}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setInscricaoSelecionada(inscricao)}
                    >
                      <Eye className="h-4 w-4" />
                      Ver respostas
                    </Button>
                    {inscricao.status === "PENDING" ? (
                      <>
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => openApproveDialog(inscricao)}
                          disabled={actionLoadingId === inscricao.id}
                        >
                          {actionLoadingId === inscricao.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-2"
                          onClick={() => handleReject(inscricao)}
                          disabled={actionLoadingId === inscricao.id}
                        >
                          <XCircle className="h-4 w-4" />
                          Reprovar
                        </Button>
                      </>
                    ) : (
                      inscricao.needsPasswordSetup ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => handleResendPasswordSetupInvite(inscricao)}
                          disabled={actionLoadingId === inscricao.id}
                        >
                          {actionLoadingId === inscricao.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                          Reenviar convite
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Acesso ativado</span>
                      )
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderCatequistasTable = () => (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Dados</TableHead>
            <TableHead>Turmas</TableHead>
            <TableHead>Cadastro</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {catequistas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                Nenhum catequista encontrado.
              </TableCell>
            </TableRow>
          ) : (
            catequistas.map((catequista) => (
              <TableRow key={catequista.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{catequista.nome}</div>
                    <div className="text-xs text-muted-foreground">ID {catequista.id}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm">
                    <div>{catequista.email}</div>
                    <div className="text-muted-foreground">{catequista.telefone || "-"}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>Endereço: {catequista.endereco || "-"}</div>
                    <div className="max-w-xs truncate">Bio: {catequista.bio || "-"}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {catequista.turmas.length > 0 ? (
                      catequista.turmas.map((vinculo) => (
                        <Badge key={vinculo.id} variant={vinculo.categoria === "AUXILIAR" ? "secondary" : "default"}>
                          {vinculo.turma.nome}{" "}
                          {vinculo.turma.ano ? `- ${vinculo.turma.ano}` : ""}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Sem turma vinculada</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>Criado em: {formatDate(catequista.criadoEm)}</div>
                    <div>Atualizado em: {formatDate(catequista.updatedAt)}</div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" className="gap-2" onClick={() => openEditCatequistaDialog(catequista)}>
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-2"
                      onClick={() => handleDeleteCatequista(catequista)}
                      disabled={catequistaDeletingId === catequista.id}
                    >
                      {catequistaDeletingId === catequista.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Excluir
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const handleLogout = () => {
    try {
      localStorage.removeItem("role");
    } catch {}
    window.location.href = "/login";
  };

  return (
    <div className={`flex min-h-screen bg-background transition-[padding] duration-300 ${sidebarOpen ? "lg:pl-64" : "lg:pl-0"}`}>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
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
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sair
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

      <div className="flex-1">
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
                <h1 className="text-xl font-semibold">Catequistas</h1>
                <p className="text-sm text-muted-foreground">
                  Revisão separada com aprovação e reprovação administrativas
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  Área administrativa
                </div>
                <h1 className="text-3xl font-bold text-foreground">Catequistas</h1>
                <p className="mt-2 text-muted-foreground">
                  Revisão separada das inscrições públicas de catequista e controle de reuniões internas.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => void carregarDados()}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Atualizar inscrições
                </Button>
                <Button variant="outline" className="gap-2" onClick={openNewCatequistaDialog}>
                  <UserPlus className="h-4 w-4" />
                  Novo catequista
                </Button>
                <Button className="gap-2" onClick={() => setReuniaoDialogOpen(true)}>
                  <Calendar className="h-4 w-4" />
                  Marcar reunião
                </Button>
              </div>
            </div>

            {counts.pending > 0 && (
              <div
                role="status"
                className="mb-6 flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 text-amber-700" />
                  <p className="text-sm font-medium">
                    {counts.pending === 1
                      ? "Há 1 inscrição de catequista aguardando sua análise."
                      : `Há ${counts.pending} inscrições de catequistas aguardando sua análise.`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-400 bg-white text-amber-950 hover:bg-amber-100"
                  onClick={() => setSelectedStatus("PENDING")}
                >
                  Ver pendentes
                </Button>
              </div>
            )}

            <div className="mb-6 grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total</CardDescription>
                  <CardTitle className="text-2xl">{counts.total}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pendentes</CardDescription>
                  <CardTitle className="text-2xl text-orange-600">{counts.pending}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Aprovadas</CardDescription>
                  <CardTitle className="text-2xl text-green-600">{counts.approved}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Reprovadas</CardDescription>
                  <CardTitle className="text-2xl text-red-600">{counts.rejected}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>Cadastro de catequistas</CardTitle>
                  <CardDescription>
                    Veja os dados dos catequistas ativos, suas turmas vinculadas e edite ou cadastre novos perfis.
                  </CardDescription>
                </div>
                <Button variant="outline" className="gap-2" onClick={openNewCatequistaDialog}>
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </CardHeader>
              <CardContent>
                {catequistasLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  renderCatequistasTable()
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Painel de Controle</CardTitle>
                  <CardDescription>
                    Gerenciamento de solicitações e chamadas para reuniões com a equipe.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as any)} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="PENDING">Pendentes</TabsTrigger>
                    <TabsTrigger value="APPROVED">Aprovadas</TabsTrigger>
                    <TabsTrigger value="REJECTED">Reprovadas</TabsTrigger>
                    <TabsTrigger value="ALL">Todas</TabsTrigger>
                    <TabsTrigger value="REUNIOES" className="bg-primary/10 text-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Calendar className="mr-2 h-4 w-4" /> Reuniões
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="REUNIOES" className="space-y-6 m-0 pt-2">
                    {reunioes.length === 0 ? (
                      <div className="py-10 text-center text-muted-foreground border rounded-lg">
                        Nenhuma reunião agendada no momento.
                      </div>
                    ) : (
                      reunioes.map((reuniao) => (
                        <Card key={reuniao.id} className="border-l-4 border-l-primary">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{reuniao.titulo}</CardTitle>
                                <CardDescription className="flex items-center gap-1 mt-1 font-medium text-foreground">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  {formatDateTime(reuniao.dataHora)}
                                </CardDescription>
                              </div>
                            </div>
                            {reuniao.pauta && <p className="mt-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">{reuniao.pauta}</p>}
                          </CardHeader>
                          <CardContent>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                              Confirmação de Presença ({reuniao.presencas.length})
                            </h4>
                            <div className="overflow-hidden rounded-md border bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Catequista</TableHead>
                                    <TableHead>Status Atual</TableHead>
                                    <TableHead className="text-right">Mudar Presença</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {reuniao.presencas.map((p) => (
                                    <TableRow key={p.catequistaId}>
                                      <TableCell className="font-medium">{p.nome}</TableCell>
                                      <TableCell>{statusPresencaBadge(p.confirmado)}</TableCell>
                                      <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                          <Button
                                            size="sm"
                                            variant={p.confirmado === "CONFIRMADO" ? "default" : "outline"}
                                            className="h-7 px-2 text-xs"
                                            onClick={() => handleAlterarPresenca(reuniao.id, p.catequistaId, "CONFIRMADO")}
                                          >
                                            Confirmar
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant={p.confirmado === "RECUSADO" ? "destructive" : "outline"}
                                            className="h-7 px-2 text-xs"
                                            onClick={() => handleAlterarPresenca(reuniao.id, p.catequistaId, "RECUSADO")}
                                          >
                                            Recusar
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  {/* Abas normais das inscrições */}
                  {selectedStatus !== "REUNIOES" && (
                    <TabsContent value={selectedStatus} className="m-0">
                      {loading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                      ) : (
                        renderTable(filteredInscricoes)
                      )}
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>

            {/* Modal para agendar Reunião */}
            <Dialog open={reuniaoDialogOpen} onOpenChange={setReuniaoDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Agendar Reunião de Catequistas</DialogTitle>
                  <DialogDescription>
                    Crie um novo evento. Todos os catequistas com cadastro ativo serão incluídos na chamada.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1">
                    <Label htmlFor="reuniao-titulo">Título / Assunto</Label>
                    <input
                      id="reuniao-titulo"
                      type="text"
                      className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Ex: Alinhamento da Primeira Eucaristia"
                      value={novaReuniao.titulo}
                      onChange={(e) => setNovaReuniao({ ...novaReuniao, titulo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reuniao-data">Data e Horário</Label>
                    <input
                      id="reuniao-data"
                      type="datetime-local"
                      className="w-full flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={novaReuniao.dataHora}
                      onChange={(e) => setNovaReuniao({ ...novaReuniao, dataHora: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="reuniao-pauta">Pauta / Observações (Opcional)</Label>
                    <textarea
                      id="reuniao-pauta"
                      className="w-full flex min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Pontos a serem discutidos..."
                      value={novaReuniao.pauta}
                      onChange={(e) => setNovaReuniao({ ...novaReuniao, pauta: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setReuniaoDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAgendarReuniao}>Salvar Agendamento</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={catequistaDialogOpen} onOpenChange={closeCatequistaDialog}>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingCatequistaId ? "Editar catequista" : "Novo catequista"}</DialogTitle>
                  <DialogDescription>
                    Preencha os dados básicos do catequista. No cadastro inicial, a senha é obrigatória.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="catequista-nome">Nome</Label>
                    <Input
                      id="catequista-nome"
                      value={catequistaForm.nome}
                      onChange={(e) => setCatequistaForm({ ...catequistaForm, nome: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="catequista-email">E-mail</Label>
                    <Input
                      id="catequista-email"
                      type="email"
                      value={catequistaForm.email}
                      onChange={(e) => setCatequistaForm({ ...catequistaForm, email: e.target.value })}
                      placeholder="nome@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="catequista-telefone">Telefone</Label>
                    <Input
                      id="catequista-telefone"
                      value={catequistaForm.telefone}
                      onChange={(e) => setCatequistaForm({ ...catequistaForm, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="catequista-senha">Senha {editingCatequistaId ? "(opcional)" : ""}</Label>
                    <Input
                      id="catequista-senha"
                      type="password"
                      value={catequistaForm.senha}
                      onChange={(e) => setCatequistaForm({ ...catequistaForm, senha: e.target.value })}
                      placeholder={editingCatequistaId ? "Deixe em branco para manter" : "Senha inicial"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="catequista-endereco">Endereço</Label>
                    <Input
                      id="catequista-endereco"
                      value={catequistaForm.endereco}
                      onChange={(e) => setCatequistaForm({ ...catequistaForm, endereco: e.target.value })}
                      placeholder="Rua, número, bairro"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="catequista-bio">Bio</Label>
                    <Textarea
                      id="catequista-bio"
                      value={catequistaForm.bio}
                      onChange={(e) => setCatequistaForm({ ...catequistaForm, bio: e.target.value })}
                      placeholder="Resumo breve da experiência ou observações administrativas"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => closeCatequistaDialog(false)} disabled={catequistaSaving}>
                    Cancelar
                  </Button>
                  <Button onClick={() => void handleSaveCatequista()} disabled={catequistaSaving}>
                    {catequistaSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog
              open={Boolean(inscricaoSelecionada)}
              onOpenChange={(open) => {
                if (!open) setInscricaoSelecionada(null);
              }}
            >
              {inscricaoSelecionada && (
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Respostas da inscrição</DialogTitle>
                    <DialogDescription>
                      {inscricaoSelecionada.nome} · enviada em {formatDateTime(inscricaoSelecionada.criadoEm)}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-5">
                    <section className="space-y-3 rounded-md border p-4">
                      <h3 className="font-semibold">Dados pessoais</h3>
                      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                        <div><dt className="text-muted-foreground">Nome</dt><dd>{inscricaoSelecionada.nome}</dd></div>
                        <div><dt className="text-muted-foreground">E-mail</dt><dd>{inscricaoSelecionada.email}</dd></div>
                        <div><dt className="text-muted-foreground">Telefone</dt><dd>{inscricaoSelecionada.telefone || "Não informado"}</dd></div>
                        <div><dt className="text-muted-foreground">Nascimento</dt><dd>{formatDate(inscricaoSelecionada.dataNascimento)}</dd></div>
                        <div><dt className="text-muted-foreground">Batismo</dt><dd>{formatDate(inscricaoSelecionada.dataBatismo)}</dd></div>
                      </dl>
                    </section>

                    <section className="space-y-3 rounded-md border p-4">
                      <h3 className="font-semibold">Respostas</h3>
                      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                        <div><dt className="text-muted-foreground">Casado(a)</dt><dd>{inscricaoSelecionada.casado || "Não informado"}</dd></div>
                        <div><dt className="text-muted-foreground">Casado(a) na Igreja Católica</dt><dd>{inscricaoSelecionada.casadaIgrejaCatolica || "Não se aplica / não informado"}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-muted-foreground">Sacramentos</dt><dd>{inscricaoSelecionada.sacramentos || "Nenhum informado"}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-muted-foreground">Alergias ou observações de saúde</dt><dd className="whitespace-pre-wrap">{inscricaoSelecionada.alergias || "Não informado"}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-muted-foreground">Sobre você</dt><dd className="whitespace-pre-wrap">{inscricaoSelecionada.sobreVoce || "Não informado"}</dd></div>
                      </dl>
                    </section>

                    <section className="space-y-3 rounded-md border p-4">
                      <h3 className="font-semibold">Compromisso da missão</h3>
                      <p className="text-sm">
                        Aceito em: {formatDateTime(inscricaoSelecionada.termoMissaoAceitoEm)}
                        {inscricaoSelecionada.termoMissaoVersao ? ` · Termo ${inscricaoSelecionada.termoMissaoVersao}` : ""}
                      </p>
                    </section>

                    <section className="space-y-3 rounded-md border p-4">
                      <h3 className="font-semibold">Documentos enviados</h3>
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        {[
                          { label: "Comprovante de residência", url: inscricaoSelecionada.ComprovanteResidencia },
                          { label: "Documento de CPF", url: inscricaoSelecionada.DocumentoCpf },
                          ...Object.entries(inscricaoSelecionada.comprovantesSacramentos ?? {}).map(([key, url]) => ({
                            label: `Comprovante de ${SACRAMENT_LABELS[key] ?? key}`,
                            url,
                          })),
                        ].map((documento) => (
                          <div key={documento.label} className="flex items-center justify-between gap-3 rounded border px-3 py-2">
                            <span>{documento.label}</span>
                            {documento.url ? (
                              <a
                                href={documento.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex shrink-0 items-center gap-1 text-primary hover:underline"
                              >
                                Abrir <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground">Não enviado</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </DialogContent>
              )}
            </Dialog>

            {/* Modal de Aprovação */}
            <Dialog open={approveDialogOpen} onOpenChange={closeApproveDialog}>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Aprovar inscrição de catequista</DialogTitle>
                  <DialogDescription>
                    Selecione uma turma para alocar o novo catequista agora ou conclua a aprovação sem vínculo.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                    <div className="font-medium text-foreground">{inscricaoToApprove?.nome || "-"}</div>
                    <div className="mt-1 text-muted-foreground">{inscricaoToApprove?.email || "-"}</div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="turma-approve">Turma</Label>
                    <Select value={selectedTurmaId} onValueChange={setSelectedTurmaId} disabled={turmasLoading}>
                      <SelectTrigger id="turma-approve">
                        <SelectValue placeholder="Selecione uma turma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TURMA_VALUE}>Sem alocacao</SelectItem>
                        {turmas.map((turma) => (
                          <SelectItem key={turma.id} value={turma.id}>
                            {turma.nome} {turma.ano ? `- ${turma.ano}` : ""}
                            {turma.catequistasTurma.length > 0 ? ` (${turma.catequistasTurma.length} catequista(s) na turma)` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTurmaId !== NO_TURMA_VALUE && (
                    <div className="space-y-2">
                      <Label htmlFor="categoria-turma-approve">Categoria na turma</Label>
                      <Select value={selectedCategoriaTurma} onValueChange={setSelectedCategoriaTurma}>
                        <SelectTrigger id="categoria-turma-approve">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={CATEGORIA_CATEQUISTA_VALUE}>Catequista</SelectItem>
                          <SelectItem value={CATEGORIA_AUXILIAR_VALUE}>Auxiliar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedTurma && (
                    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                      <div>
                        <div className="text-sm font-medium text-foreground">Catequistas da turma</div>
                        <div className="text-xs text-muted-foreground">
                          {selectedTurma.nome} {selectedTurma.ano ? `- ${selectedTurma.ano}` : ""}
                        </div>
                      </div>

                      {selectedTurma.catequistasTurma.length > 0 ? (
                        <div className="space-y-2">
                          {selectedTurma.catequistasTurma.map((vinculo) => (
                            <div key={vinculo.id} className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm">
                              <span className="font-medium text-foreground">{vinculo.catequista.nome}</span>
                              <Badge variant={vinculo.categoria === "AUXILIAR" ? "secondary" : "default"}>
                                {vinculo.categoria === "AUXILIAR" ? "Auxiliar" : "Catequista"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Esta turma ainda não possui catequistas vinculados.</p>
                      )}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    É permitido ter mais de um catequista na mesma turma, com categorias diferentes.
                  </p>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => closeApproveDialog(false)} disabled={actionLoadingId !== null}>
                    Cancelar
                  </Button>
                  <Button onClick={() => void handleApprove()} disabled={actionLoadingId !== null || !inscricaoToApprove}>
                    {actionLoadingId === inscricaoToApprove?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar aprovação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </div>
    </div>
  );
}