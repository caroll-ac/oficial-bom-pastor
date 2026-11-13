import { useCallback, useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";

// Espelha MatriculaResponseDto do backend (GET /api/matriculas).
interface MatriculaResponse {
  protocolo: string;
  responsavel: {
    nome: string;
    cpf: string;
    parentesco: string;
    dataNascimento: string;
    telefone: string;
    whatsapp: string;
    email: string;
  };
  catequizando: {
    nome: string;
    dataNascimento: string;
    endereco: string;
    telefoneEmergencia: string;
  };
  etapa: { id: string; nome: string };
  status: string;
  dataSolicitacao: string | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDENTE: { label: "Pendente", className: "border-transparent bg-gray-100 text-gray-800" },
  EM_ANALISE: { label: "Em análise", className: "border-transparent bg-blue-100 text-blue-800" },
  PENDENCIA_DOCUMENTAL: { label: "Pendência documental", className: "border-transparent bg-amber-100 text-amber-800" },
  APROVADA: { label: "Aprovada", className: "border-transparent bg-green-100 text-green-800" },
  REJEITADA: { label: "Rejeitada", className: "border-transparent bg-red-100 text-red-800" },
};

const TODOS = "TODOS";

const formatarData = (iso: string | null) => {
  if (!iso) return "—";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = statusConfig[status] ?? {
    label: status,
    className: "border-transparent bg-gray-100 text-gray-800",
  };
  return <Badge className={cn("whitespace-nowrap", config.className)}>{config.label}</Badge>;
};

const Dado = ({ label, valor }: { label: string; valor: string }) => (
  <div>
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm font-medium">{valor || "—"}</dd>
  </div>
);

export default function SecretariaMatriculasPage() {
  const [matriculas, setMatriculas] = useState<MatriculaResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState(TODOS);
  const [selecionada, setSelecionada] = useState<MatriculaResponse | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const response = await api.get(API_ROUTES.matriculas);
      if (!response.ok) {
        const mensagens: Record<number, string> = {
          401: "Sessão expirada. Faça login novamente.",
          403: "Você não tem permissão para visualizar as matrículas.",
        };
        throw new Error(mensagens[response.status] ?? "Não foi possível carregar as matrículas.");
      }
      setMatriculas(await response.json());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar as matrículas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return matriculas.filter((m) => {
      if (filtroStatus !== TODOS && m.status !== filtroStatus) return false;
      if (!termo) return true;
      return [m.protocolo, m.responsavel.nome, m.catequizando.nome].some((v) =>
        v.toLowerCase().includes(termo),
      );
    });
  }, [matriculas, busca, filtroStatus]);

  return (
    <MainLayout>
      <section className="bg-gradient-to-br from-background via-muted/30 to-sage-light/20 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Matrículas recebidas</h1>
            <p className="text-muted-foreground">Área da Secretaria — acompanhamento das matrículas.</p>
          </div>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Lista de matrículas</CardTitle>
              <CardDescription>
                {carregando ? "Carregando..." : `${filtradas.length} de ${matriculas.length} matrículas`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por protocolo, responsável ou catequizando"
                  aria-label="Buscar matrículas"
                />
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="sm:w-56" aria-label="Filtrar por status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODOS}>Todos os status</SelectItem>
                    {Object.entries(statusConfig).map(([valor, { label }]) => (
                      <SelectItem key={valor} value={valor}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {erro && (
                <div role="alert" className="flex flex-col gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
                  <span>{erro}</span>
                  <Button size="sm" variant="outline" onClick={carregar}>Tentar novamente</Button>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Catequizando</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!carregando && !erro && filtradas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Nenhuma matrícula encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtradas.map((m) => (
                    <TableRow key={m.protocolo}>
                      <TableCell className="whitespace-nowrap font-medium">{m.protocolo}</TableCell>
                      <TableCell className="whitespace-nowrap">{m.responsavel.nome}</TableCell>
                      <TableCell className="whitespace-nowrap">{m.catequizando.nome}</TableCell>
                      <TableCell className="whitespace-nowrap">{m.etapa.nome}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatarData(m.dataSolicitacao)}</TableCell>
                      <TableCell><StatusBadge status={m.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelecionada(m)}>Visualizar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog open={!!selecionada} onOpenChange={(aberto) => !aberto && setSelecionada(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selecionada && (
            <>
              <DialogHeader>
                <DialogTitle>Matrícula {selecionada.protocolo}</DialogTitle>
                <DialogDescription asChild>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selecionada.status} />
                    <span>{selecionada.etapa.nome} • {formatarData(selecionada.dataSolicitacao)}</span>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <section className="space-y-2">
                <h3 className="font-display font-semibold">Dados do Responsável</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Dado label="Nome" valor={selecionada.responsavel.nome} />
                  <Dado label="CPF" valor={selecionada.responsavel.cpf} />
                  <Dado label="Nascimento" valor={formatarData(selecionada.responsavel.dataNascimento)} />
                  <Dado label="Parentesco" valor={selecionada.responsavel.parentesco} />
                  <Dado label="Telefone" valor={selecionada.responsavel.telefone} />
                  <Dado label="WhatsApp" valor={selecionada.responsavel.whatsapp} />
                  <Dado label="E-mail" valor={selecionada.responsavel.email} />
                </dl>
              </section>

              <section className="space-y-2">
                <h3 className="font-display font-semibold">Dados do Catequizando</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Dado label="Nome" valor={selecionada.catequizando.nome} />
                  <Dado label="Nascimento" valor={formatarData(selecionada.catequizando.dataNascimento)} />
                  <Dado label="Etapa" valor={selecionada.etapa.nome} />
                  <Dado label="Telefone de emergência" valor={selecionada.catequizando.telefoneEmergencia} />
                  <div className="sm:col-span-2"><Dado label="Endereço" valor={selecionada.catequizando.endereco} /></div>
                </dl>
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
