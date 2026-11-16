import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, ClipboardList, GraduationCap, RefreshCw, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ADMIN_NAV_ITEMS } from "@/lib/sidebarNavItems";
import { API_ROUTES } from "@/lib/routes";
import { fetchWithAuth } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type DashboardData = {
  turmas: Array<{ id: string; nome: string; ano: number; alunos: number }>;
  catequistas: number;
  pendenciasCatequistas: number;
  pendenciasPreMatriculas: number;
  recentes: Array<{ id: string; nome: string; tipo: string; criadoEm: string }>;
};

const CHART_COLORS = ["#176b5b", "#d19a26", "#3a78a1", "#c45b45", "#7d8b48"];

function getLevelName(year: number) {
  if (year === 1) return "Nível I";
  if (year === 2) return "Nível II";
  if (year === 3) return "Nível III";
  return `Nível ${year || "sem nível"}`;
}

export default function AdminOverview() {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData>({
    turmas: [],
    catequistas: 0,
    pendenciasCatequistas: 0,
    pendenciasPreMatriculas: 0,
    recentes: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const endpoints = [
        API_ROUTES.turmas,
        API_ROUTES.catequistas,
        `${API_ROUTES.catequistasInscricoes}?status=PENDING&limit=1000&offset=0`,
        `${API_ROUTES.preMatriculas}?status=PENDING&limit=1000&offset=0`,
      ];
      const responses = await Promise.all(endpoints.map((endpoint) => fetchWithAuth(endpoint)));
      const failed = responses.find((response) => !response.ok);
      if (failed) throw new Error(`Não foi possível carregar os indicadores (${failed.status}).`);

      const [turmasData, catequistasData, inscricoesData, preMatriculasData] = await Promise.all(
        responses.map((response) => response.json()),
      );
      const turmasList = Array.isArray(turmasData?.turmas) ? turmasData.turmas : [];
      const catequistaApplications = Array.isArray(inscricoesData?.inscricoes) ? inscricoesData.inscricoes : [];
      const preApplications = Array.isArray(preMatriculasData?.preMatriculas) ? preMatriculasData.preMatriculas : [];
      const mappedTurmas = turmasList.map((turma: any) => ({
        id: String(turma.id),
        nome: String(turma.nome || "Turma"),
        ano: Number(turma.ano || 0),
        alunos: Number(turma._count?.catequizandos ?? turma.catequizandos?.length ?? 0),
      }));
      const recentes = [
        ...catequistaApplications.map((item: any) => ({
          id: String(item.id),
          nome: String(item.nome || "Inscrição"),
          tipo: "Catequista",
          criadoEm: String(item.criadoEm || ""),
        })),
        ...preApplications.map((item: any) => ({
          id: String(item.id),
          nome: String(item.nomeCatequizando || "Pré-matrícula"),
          tipo: "Pré-matrícula",
          criadoEm: String(item.criadoEm || ""),
        })),
      ].sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()).slice(0, 6);

      setData({
        turmas: mappedTurmas,
        catequistas: Array.isArray(catequistasData?.catequistas) ? catequistasData.catequistas.length : 0,
        pendenciasCatequistas: Number(inscricoesData?.total ?? catequistaApplications.length),
        pendenciasPreMatriculas: Number(preMatriculasData?.total ?? preApplications.length),
        recentes,
      });
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
  }, [toast]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const levelData = useMemo(() => {
    const counts = new Map<string, number>();
    data.turmas.forEach((turma) => {
      const level = getLevelName(turma.ano);
      counts.set(level, (counts.get(level) ?? 0) + 1);
    });
    return Array.from(counts, ([name, value]) => ({ name, value }));
  }, [data.turmas]);

  const studentsByClass = useMemo(
    () => [...data.turmas].sort((a, b) => b.alunos - a.alunos).slice(0, 8),
    [data.turmas],
  );
  const totalStudents = data.turmas.reduce((total, turma) => total + turma.alunos, 0);
  const totalPending = data.pendenciasCatequistas + data.pendenciasPreMatriculas;

  return (
    <DashboardShell
      items={ADMIN_NAV_ITEMS}
      title="Área Administrativa"
      description="Gerencie usuários, turmas, conteúdos e configurações do sistema."
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
            <Card><CardHeader className="pb-2"><CardDescription>Turmas ativas</CardDescription><CardTitle className="flex items-center gap-2 text-3xl"><Users className="h-5 w-5 text-primary" />{data.turmas.length}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Catequizandos em turma</CardDescription><CardTitle className="flex items-center gap-2 text-3xl"><GraduationCap className="h-5 w-5 text-primary" />{totalStudents}</CardTitle></CardHeader></Card>
            <Card><CardHeader className="pb-2"><CardDescription>Catequistas ativos</CardDescription><CardTitle className="flex items-center gap-2 text-3xl"><Users className="h-5 w-5 text-primary" />{data.catequistas}</CardTitle></CardHeader></Card>
            <Card className={totalPending ? "border-amber-300" : undefined}><CardHeader className="pb-2"><CardDescription>Inscrições para revisar</CardDescription><CardTitle className="flex items-center gap-2 text-3xl"><ClipboardList className="h-5 w-5 text-amber-700" />{totalPending}</CardTitle><p className="text-xs text-muted-foreground">{data.pendenciasCatequistas} catequistas · {data.pendenciasPreMatriculas} pré-matrículas</p></CardHeader></Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Turmas por nível</CardTitle><CardDescription>Distribuição das turmas cadastradas</CardDescription></CardHeader>
              <CardContent>
                {levelData.length ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={levelData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={96} paddingAngle={3}>
                        {levelData.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="py-16 text-center text-sm text-muted-foreground">Ainda não há turmas cadastradas.</p>}
                <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
                  {levelData.map((entry, index) => <span key={entry.name} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />{entry.name}: {entry.value}</span>)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Catequizandos por turma</CardTitle><CardDescription>Até oito turmas com mais alunos</CardDescription></CardHeader>
              <CardContent>
                {studentsByClass.length ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={studentsByClass} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={54} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="alunos" name="Catequizandos" fill="#176b5b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="py-16 text-center text-sm text-muted-foreground">Ainda não há dados de turmas.</p>}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div><CardTitle>Inscrições recentes para revisar</CardTitle><CardDescription>Solicitações públicas aguardando análise da coordenação</CardDescription></div>
              {totalPending > 0 && <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3.5 w-3.5" />{totalPending} pendentes</Badge>}
            </CardHeader>
            <CardContent>
              {data.recentes.length ? (
                <div className="divide-y">
                  {data.recentes.map((item) => (
                    <div key={`${item.tipo}-${item.id}`} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="font-medium">{item.nome}</p><p className="text-xs text-muted-foreground">{item.tipo} · {item.criadoEm ? new Date(item.criadoEm).toLocaleDateString("pt-BR") : "Data indisponível"}</p></div>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={item.tipo === "Catequista" ? "/admin/inscricoes-catequistas" : "/admin/add-catequizando"}>Abrir revisão</Link>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma inscrição pendente.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </DashboardShell>
  );
}