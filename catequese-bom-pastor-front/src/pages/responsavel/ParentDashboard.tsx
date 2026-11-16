import { useState } from "react";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { Link, useLocation } from "react-router-dom";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { useAuth } from "@/contexts/AuthContext";
import { PARENT_NAV_ITEMS } from "@/lib/sidebarNavItems";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bell,
  BookOpen,
  Calendar,
  Camera,
  ChevronRight,
  Clock,
  FileText,
  LogOut,
  Menu,
  Upload,
  User,
  Users,
  X,
  AlertCircle,
  CheckCircle,
  Cross,
  Send,
  MessageCircle,
} from "lucide-react";

// Mock data
const children = [
  {
    id: 1,
    name: "Maria Silva",
    level: 2,
    levelName: "Nível II",
    catechist: "Catequista Ana",
    schedule: "Sábados, 9h às 11h",
    nextClass: "21/12",
    attendance: 85,
    absences: [
      { date: "07/12", reason: "Viagem em família", justified: true },
      { date: "14/12", reason: "Febre", justified: false },
    ],
    observations: [
      {
        date: "10/12",
        note: "Participa bem, mas precisa trazer o material completo nas próximas aulas.",
        author: "Catequista Ana",
      },
    ],
    pendingDocuments: [
      { name: "Certidão de batismo", status: "pendente" },
      { name: "Autorização de uso de imagem", status: "entregue" },
    ],
    communications: [
      {
        date: "15/12",
        title: "Reunião de pais",
        message: "Sábado, 10h, sala 2. Conversaremos sobre a preparação de 2025.",
      },
    ],
    upcomingEvents: [
      { date: "21/12", title: "Missa de Natal", location: "Capela principal" },
      { date: "11/01", title: "Ensaio de cânticos", location: "Sala de música" },
    ],
  },
  {
    id: 2,
    name: "João Silva",
    level: 1,
    levelName: "Nível I",
    catechist: "Catequista Pedro",
    schedule: "Sábados, 9h às 11h",
    nextClass: "21/12",
    attendance: 92,
    absences: [
      { date: "30/11", reason: "Consulta médica", justified: true },
    ],
    observations: [
      {
        date: "16/12",
        note: "Mostra interesse em cantar, sugerir participação no coral infantil.",
        author: "Catequista Pedro",
      },
    ],
    pendingDocuments: [
      { name: "Cópia do RG", status: "pendente" },
    ],
    communications: [
      {
        date: "12/12",
        title: "Entrega de brinquedos",
        message: "Traga um brinquedo em bom estado para doação até 19/12.",
      },
    ],
    upcomingEvents: [
      { date: "28/12", title: "Confraternização", location: "Salão paroquial" },
    ],
  },
];

const notifications = [
  {
    id: 1,
    type: "warning",
    title: "Documentação Pendente",
    message: "Falta certidão de batismo de João Silva",
    date: "Hoje",
  },
  {
    id: 2,
    type: "info",
    title: "Missa de Natal",
    message: "Não se esqueça da missa especial dia 21/12 às 10h",
    date: "Ontem",
  },
  {
    id: 3,
    type: "success",
    title: "Matrícula Confirmada",
    message: "Matrícula de Maria Silva para 2025 confirmada",
    date: "2 dias",
  },
];

const quickActions = [
  { icon: Upload, label: "Enviar Documentos", href: "/pais/documentos" },
  { icon: FileText, label: "Justificar Falta", href: "/pais/justificativa" },
  { icon: Calendar, label: "Ver Cronograma", href: "/pais/cronograma" },
  { icon: Camera, label: "Galeria de Fotos", href: "/pais/galeria" },
];

export default function ParentDashboard() {
  const { user } = useAuth();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const location = useLocation();
  const [selectedChild, setSelectedChild] = useState<(typeof children)[number] | null>(null);
  const [communicationOpen, setCommunicationOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<string>("catequista-ana");
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState(
    [
      {
        id: 1,
        from: "Você",
        to: "Catequista Ana",
        role: "catequista",
        body: "Olá, poderia compartilhar o material da última aula para revisarmos em casa?",
        date: "Hoje",
      },
      {
        id: 2,
        from: "Coordenação",
        to: "Você",
        role: "admin",
        body: "Lembramos da reunião geral de pais neste sábado às 10h.",
        date: "Ontem",
      },
    ] satisfies Array<{
      id: number;
      from: string;
      to: string;
      role: "catequista" | "admin" | "pai";
      body: string;
      date: string;
    }>
  );

  const totalChildren = children.length;
  const totalPendingDocs = children.reduce(
    (acc, child) => acc + child.pendingDocuments.filter((doc) => doc.status === "pendente").length,
    0
  );
  const avgAttendance = Math.round(
    children.reduce((acc, child) => acc + child.attendance, 0) / Math.max(totalChildren, 1)
  );
  const totalUpcomingEvents = children.reduce((acc, child) => acc + child.upcomingEvents.length, 0);

  const recipientOptions = [
    { id: "catequista-ana", label: "Catequista Ana" },
    { id: "catequista-pedro", label: "Catequista Pedro" },
    { id: "admin", label: "Coordenação" },
  ];

  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const selected = recipientOptions.find((r) => r.id === messageRecipient);
    if (!selected) return;

    setMessages((prev) => [
      {
        id: prev.length + 1,
        from: "Você",
        to: selected.label,
        role: selected.id === "admin" ? "admin" : "catequista",
        body: messageText.trim(),
        date: "Agora",
      },
      ...prev,
    ]);
    setMessageText("");
  };

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
        return <AlertCircle className="h-5 w-5 text-gold-dark" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-sage-dark" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
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
            <Button variant="ghost" className="w-full justify-start text-destructive" asChild>
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
          <span className="font-display text-lg font-semibold">Área dos Pais</span>
          <div className="relative">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold" />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          {/* Welcome */}
          <div className="mb-6 overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-sage-light/40 to-background p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="font-display text-3xl font-bold text-foreground">{user?.nome ? `Olá, ${user.nome}!` : "Olá!"}</h1>
                <p className="text-muted-foreground">Acompanhe o progresso dos seus filhos na catequese</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Card className="bg-card/70 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Filhos</p>
                    <p className="text-2xl font-bold text-foreground">{totalChildren}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/70 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Média de presença</p>
                    <p className="text-2xl font-bold text-primary">{avgAttendance}%</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/70 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Docs pendentes</p>
                    <p className="text-2xl font-bold text-gold-dark">{totalPendingDocs}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/70 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Próx. eventos</p>
                    <p className="text-2xl font-bold text-foreground">{totalUpcomingEvents}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Children Cards */}
          <div className="mb-8">
            <h2 className="mb-4 font-display text-xl font-semibold">Meus Filhos</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {children.map((child) => (
                <Card key={child.id} variant="interactive" className="border-2 border-transparent transition hover:border-primary/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">{child.name}</CardTitle>
                        <CardDescription className="mt-1">
                          <Badge className={getLevelColor(child.level)}>
                            Nível {child.level} - {child.levelName}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">{child.attendance}%</p>
                        <p className="text-xs text-muted-foreground">Presença</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      {child.catechist}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {child.schedule}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gold" />
                      <span className="font-medium">Próxima aula: {child.nextClass}</span>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Presença</span>
                        <span>{child.attendance}%</span>
                      </div>
                      <Progress value={child.attendance} className="h-2" />
                    </div>
                    <Button
                      variant="outline"
                      className="mt-2 w-full"
                      size="sm"
                      onClick={() => setSelectedChild(child)}
                    >
                      Ver Detalhes
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>

      <Dialog
        open={!!selectedChild}
        onOpenChange={(open) => setSelectedChild(open ? selectedChild : null)}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedChild?.name}</DialogTitle>
            <DialogDescription>
              Faltas, observações, documentos pendentes, comunicados e próximos eventos.
            </DialogDescription>
          </DialogHeader>

          {selectedChild && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <p className="font-semibold">Faltas</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      {selectedChild.absences.map((absence, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-md border border-muted/60 bg-muted/50 p-3"
                        >
                          <div>
                            <p className="font-medium">{absence.date}</p>
                            <p className="text-muted-foreground">{absence.reason}</p>
                          </div>
                          <Badge variant={absence.justified ? "outline" : "destructive"}>
                            {absence.justified ? "Justificada" : "Pendente"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <p className="font-semibold">Observações dos catequistas</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      {selectedChild.observations.map((obs, index) => (
                        <div key={index} className="rounded-md border border-muted/60 bg-muted/50 p-3">
                          <p className="font-medium">{obs.note}</p>
                          <p className="text-xs text-muted-foreground">{obs.author} • {obs.date}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <p className="font-semibold">Documentos</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      {selectedChild.pendingDocuments.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-md border border-muted/60 bg-muted/50 p-3"
                        >
                          <p className="font-medium">{doc.name}</p>
                          <Badge variant={doc.status === "pendente" ? "destructive" : "outline"}>
                            {doc.status === "pendente" ? "Pendente" : "Entregue"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <p className="font-semibold">Comunicados</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      {selectedChild.communications.map((comm, index) => (
                        <div key={index} className="rounded-md border border-muted/60 bg-muted/50 p-3">
                          <p className="font-medium">{comm.title}</p>
                          <p className="text-muted-foreground">{comm.message}</p>
                          <p className="text-xs text-muted-foreground">{comm.date}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-4 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <p className="font-semibold">Próximos eventos</p>
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    {selectedChild.upcomingEvents.map((event, index) => (
                      <div key={index} className="rounded-md border border-muted/60 bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">{event.date}</p>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-muted-foreground">{event.location}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
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
              Envie mensagens para os catequistas ou coordenação e acompanhe o histórico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Destinatário</label>
              <Select value={messageRecipient} onValueChange={setMessageRecipient}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Selecione o destinatário" />
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
                placeholder="Digite sua mensagem aqui..."
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
                        {getNotificationIcon(notif.type)}
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
              Acompanhe todas as conversas com catequistas e coordenação
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-180px)] pr-4">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <MessageCircle className="mb-3 h-12 w-12 opacity-20" />
                  <p className="text-base font-medium">Nenhuma mensagem ainda</p>
                  <p className="text-sm">Suas conversas aparecerão aqui</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{msg.from}</span>
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span>{msg.to}</span>
                      </div>
                      <Badge variant={msg.role === "admin" ? "outline" : "secondary"} className="text-xs">
                        {msg.role === "admin" ? "Coordenação" : msg.role === "catequista" ? "Catequista" : "Pai"}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{msg.body}</p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
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