import { useState } from "react";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
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
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cross,
  FileText,
  LogOut,
  MapPin,
  Menu,
  Users,
  X,
} from "lucide-react";

// Mock data
const events = [
  {
    id: 1,
    title: "Aula de Catequese - Nível I",
    date: "21/01/2025",
    time: "09:00 - 11:00",
    location: "Paróquia São João",
    category: "aula",
    children: ["Maria Silva", "João Silva"],
    description:
      "Aula regular de catequese com tema: Os Sacramentos",
    attendanceRequired: true,
  },
  {
    id: 2,
    title: "Aula de Catequese - Nível II",
    date: "21/01/2025",
    time: "14:00 - 16:00",
    location: "Paróquia São João",
    category: "aula",
    children: ["Maria Silva"],
    description: "Aula regular de catequese",
    attendanceRequired: true,
  },
  {
    id: 3,
    title: "Celebração da Eucaristia",
    date: "25/01/2025",
    time: "19:00",
    location: "Catedral Metropolitana",
    category: "evento",
    children: ["Maria Silva"],
    description: "Celebração especial com todos os catecúmenos",
    attendanceRequired: false,
  },
  {
    id: 4,
    title: "Confissão (Aula)",
    date: "28/01/2025",
    time: "10:00 - 12:00",
    location: "Paróquia São João",
    category: "aula",
    children: ["João Silva"],
    description: "Preparação para primeira confissão",
    attendanceRequired: true,
  },
  {
    id: 5,
    title: "Retiro Espiritual",
    date: "04/02/2025",
    time: "08:00 - 17:00",
    location: "Centro de Retiros",
    category: "retiro",
    children: ["Maria Silva", "João Silva"],
    description:
      "Retiro para aprofundamento da fé e confraternização",
    attendanceRequired: true,
  },
  {
    id: 6,
    title: "Reunião de Pais",
    date: "08/02/2025",
    time: "19:30",
    location: "Paróquia São João",
    category: "reuniao",
    children: [],
    description:
      "Reunião informativa com os pais sobre o andamento das turmas",
    attendanceRequired: true,
  },
];

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function ParentCronograma() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const location = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date(2025, 0, 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "aula":
        return "Aula";
      case "evento":
        return "Evento";
      case "retiro":
        return "Retiro";
      case "reuniao":
        return "Reunião";
      default:
        return category;
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getEventsForDate = (day: number) => {
    const dateStr = `${String(day).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")}/${currentDate.getFullYear()}`;
    return events.filter((event) =>
      event.date.endsWith(`${String(day).padStart(2, "0")}/${String(currentDate.getMonth() + 1).padStart(2, "0")}/${currentDate.getFullYear()}`),
    );
  };

  const selectedDateEvents =
    selectedDate && selectedDate.getFullYear() === currentDate.getFullYear() && selectedDate.getMonth() === currentDate.getMonth()
      ? getEventsForDate(selectedDate.getDate())
      : [];

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
          <span className="font-display text-lg font-semibold">Cronograma</span>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">
                  Cronograma e Eventos
                </h1>
                <p className="text-slate-600 mt-1">
                  Acompanhe todas as datas e eventos importantes
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cronograma */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {monthNames[currentDate.getMonth()]}{" "}
                        {currentDate.getFullYear()}
                      </CardTitle>
                      <CardDescription>
                        Clique em um dia para ver os eventos
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousMonth}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextMonth}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Dias da semana */}
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center text-sm font-semibold text-slate-600 py-2"
                        >
                          {day}
                        </div>
                      ),
                    )}
                  </div>

                  {/* Dias vazios no início */}
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: firstDay }).map((_, i) => (
                      <div key={`empty-${i}`} className="p-2" />
                    ))}

                    {/* Dias do mês */}
                    {days.map((day) => {
                      const dayEvents = getEventsForDate(day);
                      const isSelected =
                        selectedDate &&
                        selectedDate.getDate() === day &&
                        selectedDate.getMonth() === currentDate.getMonth() &&
                        selectedDate.getFullYear() ===
                          currentDate.getFullYear();

                      return (
                        <button
                          key={day}
                          onClick={() =>
                            setSelectedDate(
                              new Date(
                                currentDate.getFullYear(),
                                currentDate.getMonth(),
                                day,
                              ),
                            )
                          }
                          className={`p-3 rounded-lg text-center text-sm font-medium transition ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-white hover:bg-slate-50 border border-slate-200"
                          }`}
                        >
                          <div>{day}</div>
                          {dayEvents.length > 0 && (
                            <div className="flex gap-1 mt-1 justify-center">
                              {dayEvents.slice(0, 2).map((event, idx) => (
                                <div
                                  key={idx}
                                  className="h-1.5 w-1.5 rounded-full bg-primary"
                                />
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Eventos do Mês */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle>Eventos do Mês</CardTitle>
                  <CardDescription>
                    Todos os eventos agendados para{" "}
                    {monthNames[currentDate.getMonth()]}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {events.filter(
                    (event) =>
                      event.date.endsWith(
                        `/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`,
                      ),
                  ).length > 0 ? (
                    <div className="space-y-3">
                      {events
                        .filter(
                          (event) =>
                            event.date.endsWith(
                              `/${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`,
                            ),
                        )
                        .sort(
                          (a, b) =>
                            new Date(a.date).getTime() -
                            new Date(b.date).getTime(),
                        )
                        .map((event) => (
                          <div
                            key={event.id}
                            className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-slate-900">
                                  {event.title}
                                </h4>
                                <Badge className={getCategoryColor(event.category)}>
                                  {getCategoryLabel(event.category)}
                                </Badge>
                              </div>
                              {event.attendanceRequired && (
                                <Badge
                                  variant="outline"
                                  className="text-xs gap-1"
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  Presença obrigatória
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {event.date}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {event.time}
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {event.location}
                              </div>
                              {event.children.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  {event.children.join(", ")}
                                </div>
                              )}
                            </div>

                            {event.description && (
                              <p className="mt-3 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                {event.description}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600">
                        Nenhum evento agendado para este mês
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Próximos Eventos */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Próximos Eventos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {events
                      .sort(
                        (a, b) =>
                          new Date(a.date).getTime() -
                          new Date(b.date).getTime(),
                      )
                      .slice(0, 5)
                      .map((event) => (
                        <div
                          key={event.id}
                          className="p-3 bg-slate-50 rounded-lg"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm text-slate-900">
                                {event.title}
                              </h4>
                              <p className="text-xs text-slate-600 mt-1">
                                {event.date}
                              </p>
                            </div>
                            <Badge
                              className={
                                getCategoryColor(event.category) + " text-xs"
                              }
                            >
                              {getCategoryLabel(event.category)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* Eventos Selecionados */}
              {selectedDate && selectedDateEvents.length > 0 && (
                <Card className="border-0 shadow-sm border-l-4 border-l-primary">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedDate.getDate()} de{" "}
                      {monthNames[selectedDate.getMonth()]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedDateEvents.map((event) => (
                        <div
                          key={event.id}
                          className="p-3 bg-primary/5 rounded-lg border border-primary/20"
                        >
                          <h4 className="font-medium text-slate-900">
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-600">
                            <Clock className="h-3 w-3" />
                            {event.time}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                          {event.attendanceRequired && (
                            <Badge
                              variant="outline"
                              className="mt-2 text-xs gap-1"
                            >
                              <AlertCircle className="h-3 w-3" />
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Legenda de Categorias */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm">Categorias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
                      <span className="text-sm text-slate-600">Aulas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300" />
                      <span className="text-sm text-slate-600">Eventos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
                      <span className="text-sm text-slate-600">Retiros</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300" />
                      <span className="text-sm text-slate-600">Reuniões</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}