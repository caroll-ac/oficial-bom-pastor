import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarCheck, ClipboardCheck, GraduationCap, RefreshCw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { CATECHIST_NAV_ITEMS } from "@/lib/sidebarNavItems";
import { API_ROUTES } from "@/lib/routes";
import { fetchWithAuth } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ATTENDANCE_STORAGE_KEY = "catequese.attendance.byMeeting";
const CHART_COLORS = ["#176b5b", "#d19a26", "#3a78a1", "#c45b45", "#7d8b48"];

type CatechistClass = { id: string; nome: string; ano: number; alunos: number };
type SavedAttendance = { date: string; classId: string; attendance: Record<string, boolean> };

function getLevelName(year: number) {
  if (year === 1) return "Nível I";
  if (year === 2) return "Nível II";
  if (year === 3) return "Nível III";
  return `Nível ${year || "sem nível"}`;
}

export default function CatechistOverview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<CatechistClass[]>([]);
  const [savedAttendances, setSavedAttendances] = useState<SavedAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (silent = false) => {
    if (!user?.id) return;
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetchWithAuth(`${API_ROUTES.turmas}?limit=1000&offset=0`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || "Não foi possível carregar suas turmas.");

      const list = Array.isArray(payload?.turmas) ? payload.turmas : [];
      const assignedClasses = list
        .filter((turma: any) => Array.isArray(turma.catequistasTurma)
          && turma.catequistasTurma.some((link: any) => String(link.catequista?.id) === user.id))
        .map((turma: any) => ({
          id: String(turma.id),
          nome: String(turma.nome || "Turma"),
          ano: Number(turma.ano || 0),
          alunos: Number(turma._count?.catequizandos ?? turma.catequizandos?.length ?? 0),
        }));
      setClasses(assignedClasses);

      try {
        const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setSavedAttendances(Array.isArray(parsed) ? parsed : []);
      } catch {
        setSavedAttendances([]);
      }
    } catch (error) {
      toast({
        title: "Não foi possível atualizar o painel",
        description: error instanceof Error ? error.message : "Verifique a conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const classIds = useMemo(() => new Set(classes.map((item) => item.id)), [classes]);
  const myAttendances = useMemo(
    () => savedAttendances.filter((record) => classIds.has(record.classId)),
    [savedAttendances, classIds],
  );
  const attendanceTotals = useMemo(() => myAttendances.reduce(
    (totals, record) => {
      const values = Object.values(record.attendance ?? {});
      return {
        present: totals.present + values.filter(Boolean).length,
        absent: totals.absent + values.filter((value) => !value).length,
      };
    },
    { present: 0, absent: 0 },
  ), [myAttendances]);
  const attendanceRate = attendanceTotals.present + attendanceTotals.absent
    ? Math.round((attendanceTotals.present / (attendanceTotals.present + attendanceTotals.absent)) * 100)
    : null;
  const totalStudents = classes.reduce((total, turma) => total + turma.alunos, 0);
  const attendanceChart = [
    { name: "Presentes", value: attendanceTotals.present },
    { name: "Ausentes", value: attendanceTotals.absent },
  ].filter((item) => item.value > 0);
  const levelChart = useMemo(() => {
    const byLevel = new Map<string, number>();
    classes.forEach((turma) => {
      const level = getLevelName(turma.ano);
      byLevel.set(level, (byLevel.get(level) ?? 0) + turma.alunos);
    });
    return Array.from(byLevel, ([name, alunos]) => ({ name, alunos }));
  }, [classes]);
  const recentAttendances = [...myAttendances].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <DashboardShell
      items={CATECHIST_NAV_ITEMS}
      title="Área do Catequista"
      description="Acompanhe turmas, cronograma, frequência e materiais."
    >
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => void loadDashboard(true)} disabled={loading || refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-md border bg-card" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card><CardHeader className="pb-2"><CardDescription>Minhas turmas</CardDescription><CardTitle className="flex items-center gap-2 text-3xl"><Users className="h-5 w-5 text-primary" />{classes.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Catequizandos acompanhados</CardDescription><CardTitle className="flex items-center gap-2 text-3xl"><GraduationCap className="h-5 w-5 text-primary" />{totalStudents}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Chamadas registradas</CardDescription><CardTitle className="flex items-center gap-2 text-3xl"><CalendarCheck className="h-5 w-5 text-primary" />{myAttendances.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Presença registrada</CardDescription><CardTitle className="flex items-center gap-2 text-3xl"><ClipboardCheck className="h-5 w-5 text-primary" />{attendanceRate === null ? "—" : `${attendanceRate}%`}</CardTitle><p className="text-xs text-muted-foreground">Calculada a partir das chamadas salvas neste navegador</p></CardHeader></Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Alunos por nível</CardTitle><CardDescription>Distribuição das crianças nas suas turmas</CardDescription></CardHeader>
              <CardContent>
                {levelChart.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={levelChart} dataKey="alunos" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={3}>
                        {levelChart.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="py-16 text-center text-sm text-muted-foreground">Nenhuma turma está vinculada ao seu perfil.</p>}
                <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
                  {levelChart.map((entry, index) => <span key={entry.name} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />{entry.name}: {entry.alunos}</span>)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Presenças registradas</CardTitle><CardDescription>Resumo das chamadas feitas neste navegador</CardDescription></CardHeader>
              <CardContent>
                {attendanceChart.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={attendanceChart} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={3}>
                        {attendanceChart.map((entry, index) => <Cell key={entry.name} fill={index === 0 ? "#176b5b" : "#d9dfe5"} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="py-16 text-center text-sm text-muted-foreground">As presenças aparecerão aqui depois que uma chamada for salva.</p>}
                {!!attendanceChart.length && <div className="flex justify-center gap-5 text-xs text-muted-foreground">{attendanceChart.map((item, index) => <span key={item.name} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: index === 0 ? "#176b5b" : "#d9dfe5" }} />{item.name}: {item.value}</span>)}</div>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader><CardTitle>Catequizandos por turma</CardTitle><CardDescription>Quantidade de alunos nas suas turmas</CardDescription></CardHeader>
              <CardContent>
                {classes.length ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={classes} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={54} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="alunos" name="Catequizandos" fill="#3a78a1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="py-16 text-center text-sm text-muted-foreground">Sem dados de turmas para exibir.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Chamadas recentes</CardTitle><CardDescription>Últimas listas salvas</CardDescription></CardHeader>
              <CardContent>
                {recentAttendances.length ? (
                  <div className="divide-y">
                    {recentAttendances.map((record) => {
                      const turma = classes.find((item) => item.id === record.classId);
                      const present = Object.values(record.attendance ?? {}).filter(Boolean).length;
                      const total = Object.keys(record.attendance ?? {}).length;
                      return <div key={`${record.classId}-${record.date}`} className="flex items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{turma?.nome ?? "Turma"}</p><p className="text-xs text-muted-foreground">{new Date(`${record.date}T12:00:00`).toLocaleDateString("pt-BR")}</p></div><span className="text-muted-foreground">{present}/{total} presentes</span></div>;
                    })}
                  </div>
                ) : <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma chamada salva ainda.</p>}
                <Button variant="outline" className="mt-3 w-full" asChild><Link to="/catequista/chamada">Abrir chamada</Link></Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </DashboardShell>
  );
}