import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchWithAuth } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { getDashboardNavItems } from "@/lib/sidebarNavItems";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  Clock,
  Cross,
  Edit,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type ViewMode = "day" | "month" | "year";

interface EventItem {
  id: string;
  titulo: string;
  descricao: string;
  data: string;
  dataFim: string | null;
  horaInicio: string | null;
  horaFim: string | null;
  local: string | null;
  categoria: string;
  cor: string | null;
  recorrencia: string | null;
  tipo: "TURMA" | "GERAL";
  turma: { id: string; nome: string } | null;
}

const CATEGORIA_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ENCONTRO: { label: "Encontro", color: "text-blue-700", bg: "bg-blue-100 border-blue-300" },
  FERIADO: { label: "Feriado", color: "text-red-700", bg: "bg-red-100 border-red-300" },
  EVENTO: { label: "Evento", color: "text-purple-700", bg: "bg-purple-100 border-purple-300" },
  REUNIAO: { label: "Reunião", color: "text-orange-700", bg: "bg-orange-100 border-orange-300" },
  RETIRO: { label: "Retiro", color: "text-green-700", bg: "bg-green-100 border-green-300" },
  CELEBRACAO: { label: "Celebração", color: "text-yellow-700", bg: "bg-yellow-100 border-yellow-300" },
  OUTRO: { label: "Outro", color: "text-gray-700", bg: "bg-gray-100 border-gray-300" },
};

const CATEGORIAS = Object.keys(CATEGORIA_CONFIG);

interface EventFormData {
  titulo: string;
  descricao: string;
  data: string;
  dataFim: string;
  horaInicio: string;
  horaFim: string;
  local: string;
  categoria: string;
  cor: string;
  recorrencia: string;
  tipo: string;
}

const emptyForm: EventFormData = {
  titulo: "",
  descricao: "",
  data: "",
  dataFim: "",
  horaInicio: "",
  horaFim: "",
  local: "",
  categoria: "ENCONTRO",
  cor: "",
  recorrencia: "",
  tipo: "GERAL",
};

function normalizeRole(value: string | null): "admin" | "catequista" | "responsavel" | "guest" {
  const role = String(value || "").toLowerCase().trim();

  if (role === "admin" || role === "administrador" || role === "adminstrador") {
    return "admin";
  }

  if (role === "catequista" || role === "catechist") {
    return "catequista";
  }

  if (role === "responsavel" || role === "responsável" || role === "parent") {
    return "responsavel";
  }

  return "guest";
}

function toDateKey(dateIso: string): string {
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return format(parsed, "yyyy-MM-dd");
}

function mapEvent(item: any): EventItem {
  return {
    id: String(item?.id || ""),
    titulo: String(item?.titulo || "Sem título"),
    descricao: String(item?.descricao || ""),
    data: String(item?.data || ""),
    dataFim: item?.dataFim ? String(item.dataFim) : null,
    horaInicio: item?.horaInicio ? String(item.horaInicio) : null,
    horaFim: item?.horaFim ? String(item.horaFim) : null,
    local: item?.local ? String(item.local) : null,
    categoria: String(item?.categoria || "ENCONTRO"),
    cor: item?.cor ? String(item.cor) : null,
    recorrencia: item?.recorrencia ? String(item.recorrencia) : null,
    tipo: item?.tipo === "TURMA" ? "TURMA" : "GERAL",
    turma: item?.turma ?? null,
  };
}

function getCategoriaBadge(categoria: string) {
  const config = CATEGORIA_CONFIG[categoria] ?? CATEGORIA_CONFIG.OUTRO;
  return `${config.bg} ${config.color}`;
}

function getCategoriaLabel(categoria: string) {
  return CATEGORIA_CONFIG[categoria]?.label ?? categoria;
}

const RECORRENCIA_LABELS: Record<string, string> = {
  DIARIO: "Diário",
  SEMANAL: "Semanal",
  MENSAL: "Mensal",
  ANUAL: "Anual",
};

export default function Cronograma() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const location = useLocation();

  const baseRoute = location.pathname.startsWith("/admin") ? "/admin" : "/catequista";
  const isAdminRoute = baseRoute === "/admin";

  const [date, setDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit / Delete state
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventItem | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Filters
  const [filterCategoria, setFilterCategoria] = useState<string>("all");

  const [form, setForm] = useState<EventFormData>(emptyForm);
  const canManageEvents = isAdminRoute && isAdmin;

  useEffect(() => {
    const role = normalizeRole(localStorage.getItem("userRole"));
    setIsAdmin(role === "admin");
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "1000", offset: "0" });
      if (filterCategoria && filterCategoria !== "all") {
        params.set("categoria", filterCategoria);
      }
      const response = await fetchWithAuth(`${API_ROUTES.cronogramaEventos}?${params}`);

      if (!response.ok) {
        throw new Error("Não foi possível carregar os eventos.");
      }

      const data = await response.json();
      const list = Array.isArray(data?.eventos) ? data.eventos : [];
      setEvents(list.map(mapEvent));
    } catch (loadError) {
      console.error("Erro ao carregar cronograma:", loadError);
      setError("Não foi possível carregar os eventos do cronograma.");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filterCategoria]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const eventKeys = useMemo(() => {
    return new Set(events.map((event) => toDateKey(event.data)).filter(Boolean));
  }, [events]);

  const selectedKey = useMemo(() => format(date, "yyyy-MM-dd"), [date]);

  const eventsForDay = useMemo(() => {
    return events
      .filter((event) => toDateKey(event.data) === selectedKey)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [events, selectedKey]);

  const monthEvents = useMemo(() => {
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();

    return events
      .filter((event) => {
        const parsed = new Date(event.data);
        return parsed.getMonth() === targetMonth && parsed.getFullYear() === targetYear;
      })
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [date, events]);

  const yearEvents = useMemo(() => {
    const targetYear = date.getFullYear();

    return events
      .filter((event) => new Date(event.data).getFullYear() === targetYear)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [date, events]);

  const groupedYearEvents = useMemo(() => {
    const grouped: Record<string, EventItem[]> = {};

    for (const event of yearEvents) {
      const parsed = new Date(event.data);
      const monthLabel = format(parsed, "MMMM", { locale: ptBR });
      if (!grouped[monthLabel]) {
        grouped[monthLabel] = [];
      }
      grouped[monthLabel].push(event);
    }

    return grouped;
  }, [yearEvents]);

  const coverage = useMemo(() => {
    if (viewMode === "year") {
      const coveredDays = new Set(yearEvents.map((event) => toDateKey(event.data))).size;
      return {
        covered: coveredDays,
        total: 365,
        percent: Math.min(100, Math.round((coveredDays / 365) * 100)),
      };
    }

    if (viewMode === "month") {
      const totalDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const coveredDays = new Set(monthEvents.map((event) => toDateKey(event.data))).size;
      return {
        covered: coveredDays,
        total: totalDays,
        percent: Math.min(100, Math.round((coveredDays / totalDays) * 100)),
      };
    }

    const covered = eventsForDay.length > 0 ? 1 : 0;
    return {
      covered,
      total: 1,
      percent: covered * 100,
    };
  }, [date, eventsForDay.length, monthEvents, viewMode, yearEvents]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingEvent(null);
    setShowCreateForm(false);
  };

  const openEditForm = (event: EventItem) => {
    setEditingEvent(event);
    setForm({
      titulo: event.titulo,
      descricao: event.descricao,
      data: format(new Date(event.data), "yyyy-MM-dd'T'HH:mm"),
      dataFim: event.dataFim ? format(new Date(event.dataFim), "yyyy-MM-dd'T'HH:mm") : "",
      horaInicio: event.horaInicio ?? "",
      horaFim: event.horaFim ?? "",
      local: event.local ?? "",
      categoria: event.categoria,
      cor: event.cor ?? "",
      recorrencia: event.recorrencia ?? "",
      tipo: event.tipo,
    });
    setShowCreateForm(true);
  };

  const submitEvent = async () => {
    if (!form.titulo.trim()) return;

    setSubmitting(true);
    setError(null);

    // Ensure data is valid before using it
    const eventDate = form.data && form.data.trim()
      ? new Date(form.data)
      : date;

    if (Number.isNaN(eventDate.getTime())) {
      setError("Data inválida.");
      setSubmitting(false);
      return;
    }

    const eventDataFim = form.dataFim && form.dataFim.trim()
      ? new Date(form.dataFim)
      : undefined;

    const body: any = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim() || undefined,
      data: eventDate.toISOString(),
      dataFim: eventDataFim && !Number.isNaN(eventDataFim.getTime()) ? eventDataFim.toISOString() : undefined,
      horaInicio: form.horaInicio || undefined,
      horaFim: form.horaFim || undefined,
      local: form.local || undefined,
      categoria: form.categoria,
      cor: form.cor || undefined,
      recorrencia: form.recorrencia || undefined,
      tipo: form.tipo,
    };

    try {
      if (editingEvent) {
        const response = await fetchWithAuth(`${API_ROUTES.cronogramaEventos}/${editingEvent.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("Falha ao atualizar evento.");
      } else {
        const response = await fetchWithAuth(API_ROUTES.cronogramaEventos, {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error("Falha ao criar evento.");
      }

      resetForm();
      await loadEvents();
    } catch (submitError) {
      console.error("Erro ao salvar evento:", submitError);
      setError("Não foi possível salvar o evento.");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingEvent) return;

    setSubmitting(true);
    try {
      const response = await fetchWithAuth(`${API_ROUTES.cronogramaEventos}/${deletingEvent.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Falha ao deletar evento.");

      setShowDeleteDialog(false);
      setDeletingEvent(null);
      await loadEvents();
    } catch (err) {
      console.error("Erro ao deletar evento:", err);
      setError("Não foi possível deletar o evento.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderEventCard = (event: EventItem, showDate = false) => (
    <div key={event.id} className="rounded-lg border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {showDate && (
            <Badge variant="outline">
              {format(new Date(event.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </Badge>
          )}
          <Badge className={getCategoriaBadge(event.categoria)} variant="outline">
            {getCategoriaLabel(event.categoria)}
          </Badge>
          <Badge variant="secondary">
            {event.tipo === "GERAL" ? "Comunidade" : "Turma"}
          </Badge>
          {event.turma && <Badge>{event.turma.nome}</Badge>}
          {event.recorrencia && (
            <Badge variant="outline" className="text-xs">
              {RECORRENCIA_LABELS[event.recorrencia] ?? event.recorrencia}
            </Badge>
          )}
        </div>
        {canManageEvents && (
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => openEditForm(event)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-600 hover:text-red-700"
              onClick={() => {
                setDeletingEvent(event);
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
      <p className="mt-1 font-medium text-slate-900">{event.titulo}</p>
      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        {event.horaInicio && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {event.horaInicio}{event.horaFim ? ` - ${event.horaFim}` : ""}
          </span>
        )}
        {event.local && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {event.local}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
          {format(new Date(event.data), "dd/MM/yyyy")}
        </span>
      </div>
      {event.descricao && (
        <p className="mt-2 text-sm text-slate-700">{event.descricao}</p>
      )}
    </div>
  );

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

          <SidebarNav items={getDashboardNavItems(isAdminRoute)} pathname={location.pathname} />

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
          <span className="font-display text-lg font-semibold">Cronograma</span>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-slate-900">Cronograma</h1>
              <p className="text-slate-600">
                Gerencie encontros, feriados, eventos, reuniões e celebrações do ano
              </p>
            </div>

            {error && (
              <Card className="mb-6 border-red-200">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { key: "day", label: "Dia" },
                    { key: "month", label: "Mês" },
                    { key: "year", label: "Ano" },
                  ] as const
                ).map((opt) => (
                  <Button
                    key={opt.key}
                    variant={viewMode === opt.key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode(opt.key)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={filterCategoria}
                  onValueChange={(v) => setFilterCategoria(v)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {CATEGORIAS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {getCategoriaLabel(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="w-full max-w-xs">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>
                      {viewMode === "year"
                        ? "Cobertura do ano"
                        : viewMode === "month"
                        ? "Cobertura do mês"
                        : "Eventos do dia"}
                    </span>
                    <span>
                      {coverage.covered}/{coverage.total} ({coverage.percent}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${coverage.percent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" /> Calendário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Calendar
                    mode="single"
                    locale={ptBR}
                    selected={date}
                    onSelect={(selected) => selected && setDate(selected)}
                    className="rounded-md border"
                    modifiers={{
                      withEvents: (d) => eventKeys.has(format(d, "yyyy-MM-dd")),
                    }}
                    modifiersClassNames={{
                      withEvents: "bg-primary/15 font-semibold text-primary",
                    }}
                  />
                  <CardDescription className="mt-3">
                    Selecionado: {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className={`lg:col-span-2 ${viewMode === "day" ? "" : "opacity-90"}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Eventos do dia</CardTitle>
                      <CardDescription>
                        {eventsForDay.length} item(s) para {format(date, "dd/MM/yyyy")}
                      </CardDescription>
                    </div>
                    {canManageEvents && (
                      <Button
                        onClick={() => {
                          resetForm();
                          setForm((prev) => ({
                            ...prev,
                            data: format(date, "yyyy-MM-dd'T'HH:mm"),
                          }));
                          setShowCreateForm(true);
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" /> Adicionar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
                      Carregando eventos...
                    </div>
                  ) : eventsForDay.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
                      Nenhum evento cadastrado para este dia.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {eventsForDay.map((event) => renderEventCard(event))}
                    </div>
                  )}

                  {canManageEvents && showCreateForm && (
                    <div className="mt-6 rounded-lg border p-4">
                      <p className="mb-3 font-medium">
                        {editingEvent ? "Editar evento" : `Novo evento para ${format(date, "dd/MM/yyyy")}`}
                      </p>
                      <div className="grid gap-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Título</Label>
                            <Input
                              placeholder="Título do evento"
                              value={form.titulo}
                              onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label>Categoria</Label>
                            <Select
                              value={form.categoria}
                              onValueChange={(v) => setForm((prev) => ({ ...prev, categoria: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Categoria" />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORIAS.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {getCategoriaLabel(cat)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Descrição</Label>
                          <Textarea
                            placeholder="Descrição (opcional)"
                            value={form.descricao}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, descricao: e.target.value }))
                            }
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Label>Data e Hora início</Label>
                            <Input
                              type="datetime-local"
                              value={form.data}
                              onChange={(e) =>
                                setForm((prev) => ({ ...prev, data: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Data e Hora fim</Label>
                            <Input
                              type="datetime-local"
                              value={form.dataFim}
                              onChange={(e) =>
                                setForm((prev) => ({ ...prev, dataFim: e.target.value }))
                              }
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <Label>Local</Label>
                            <Input
                              placeholder="Local"
                              value={form.local}
                              onChange={(e) =>
                                setForm((prev) => ({ ...prev, local: e.target.value }))
                              }
                            />
                          </div>
                          <div>
                            <Label>Recorrência</Label>
                            <Select
                              value={form.recorrencia || "none"}
                              onValueChange={(v) => setForm((prev) => ({ ...prev, recorrencia: v === "none" ? "" : v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Sem recorrência" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sem recorrência</SelectItem>
                                {Object.entries(RECORRENCIA_LABELS).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>
                                    {label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Visibilidade</Label>
                            <Select
                              value={form.tipo}
                              onValueChange={(v) => setForm((prev) => ({ ...prev, tipo: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Visibilidade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="GERAL">Comunidade (público)</SelectItem>
                                <SelectItem value="TURMA">Apenas turma</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={submitEvent} disabled={submitting}>
                            {submitting
                              ? "Salvando..."
                              : editingEvent
                              ? "Atualizar evento"
                              : "Salvar evento"}
                          </Button>
                          <Button variant="outline" onClick={resetForm}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Month View */}
              <Card className={`lg:col-span-3 ${viewMode === "month" ? "" : "opacity-90"}`}>
                <CardHeader>
                  <CardTitle>Eventos do mês</CardTitle>
                  <CardDescription>
                    {format(date, "MMMM 'de' yyyy", { locale: ptBR })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
                      Carregando eventos...
                    </div>
                  ) : monthEvents.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
                      Nenhum evento cadastrado neste mês.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {monthEvents.map((event) => renderEventCard(event, true))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Year View */}
              <Card className={`lg:col-span-3 ${viewMode === "year" ? "" : "opacity-90"}`}>
                <CardHeader>
                  <CardTitle>Eventos do ano</CardTitle>
                  <CardDescription>{format(date, "yyyy")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
                      Carregando eventos...
                    </div>
                  ) : yearEvents.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-500">
                      Nenhum evento cadastrado neste ano.
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedYearEvents).map(([month, monthItems]) => (
                        <div key={month} className="rounded-lg border p-4">
                          <div className="mb-3 flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {month}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {monthItems.length} evento(s)
                            </span>
                          </div>
                          <div className="space-y-3">
                            {monthItems.map((event) => (
                              <div key={event.id} className="rounded-md border p-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge variant="secondary">
                                    {format(new Date(event.data), "dd/MM/yyyy")}
                                  </Badge>
                                  <Badge className={getCategoriaBadge(event.categoria)} variant="outline">
                                    {getCategoriaLabel(event.categoria)}
                                  </Badge>
                                  <Badge variant="outline">
                                    {event.tipo === "GERAL" ? "Comunidade" : "Turma"}
                                  </Badge>
                                  <p className="font-medium text-slate-900">{event.titulo}</p>
                                </div>
                                {event.descricao && (
                                  <p className="mt-1 text-sm text-slate-700">{event.descricao}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar evento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o evento "{deletingEvent?.titulo}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={submitting}>
              {submitting ? "Deletando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}