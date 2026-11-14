import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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

// Espelha MatriculaDetalheResponseDto do backend (GET /api/matriculas/:id).
interface DocumentoResponse {
  id: string;
  nomeArquivo: string;
  tipoDocumento: string;
  status: string;
  parecer: string | null;
  dataEnvio: string | null;
}

interface MatriculaDetalheResponse extends MatriculaResponse {
  documentos: DocumentoResponse[];
}

const tiposDocumento: Record<string, string> = {
  CERTIDAO_NASCIMENTO: "Certidão de Nascimento",
  CERTIFICADO_BATISMO: "Certificado de Batismo",
  COMPROVANTE_ENDERECO: "Comprovante de Residência",
};

const statusDocumentoConfig: Record<string, { label: string; className: string }> = {
  PENDENTE: { label: "Pendente", className: "border-transparent bg-gray-100 text-gray-800" },
  APROVADO: { label: "Aprovado", className: "border-transparent bg-green-100 text-green-800" },
  REJEITADO: { label: "Rejeitado", className: "border-transparent bg-red-100 text-red-800" },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDENTE: { label: "Pendente", className: "border-transparent bg-gray-100 text-gray-800" },
  EM_ANALISE: { label: "Em análise", className: "border-transparent bg-blue-100 text-blue-800" },
  AGUARDANDO_COORDENADOR: { label: "Aguardando coordenador", className: "border-transparent bg-indigo-100 text-indigo-800" },
  PENDENCIA_DOCUMENTAL: { label: "Pendência documental", className: "border-transparent bg-amber-100 text-amber-800" },
  APROVADA: { label: "Aprovada", className: "border-transparent bg-green-100 text-green-800" },
  REJEITADA: { label: "Rejeitada", className: "border-transparent bg-red-100 text-red-800" },
};

const TODOS = "TODOS";
const PARECER_MIN = 5;
const PARECER_MAX = 1000;

const resultadosAnalise = [
  { valor: "DOCUMENTACAO_OK", label: "Documentação OK" },
  { valor: "PENDENCIA_DOCUMENTAL", label: "Pendência documental" },
];

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
  const [detalhe, setDetalhe] = useState<MatriculaDetalheResponse | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
  const protocoloAtual = useRef<string | null>(null);
  const [resultado, setResultado] = useState("");
  const [parecer, setParecer] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const { toast } = useToast();
  const carregarDetalhe = useCallback(async (protocolo: string) => {
    protocoloAtual.current = protocolo;
    setCarregandoDetalhe(true);
    setErroDetalhe(null);
    setDetalhe(null);
    try {
      const response = await api.get(`${API_ROUTES.matriculas}/${encodeURIComponent(protocolo)}`);
      if (!response.ok) {
        const mensagens: Record<number, string> = {
          400: "Protocolo inválido.",
          401: "Sessão expirada. Faça login novamente.",
          403: "Você não tem permissão para visualizar esta matrícula.",
          404: "Matrícula não encontrada.",
        };
        throw new Error(mensagens[response.status] ?? "Não foi possível carregar os detalhes da matrícula.");
      }
      const dados: MatriculaDetalheResponse = await response.json();
      if (protocoloAtual.current === protocolo) setDetalhe(dados);
    } catch (e) {
      if (protocoloAtual.current === protocolo) {
        setErroDetalhe(e instanceof Error ? e.message : "Não foi possível carregar os detalhes da matrícula.");
      }
    } finally {
      if (protocoloAtual.current === protocolo) setCarregandoDetalhe(false);
    }
  }, []);

  const abrir = (matricula: MatriculaResponse) => {
    setSelecionada(matricula);
    setResultado("");
    setParecer("");
    setErroForm(null);
    carregarDetalhe(matricula.protocolo);
  };

  const fechar = () => {
    protocoloAtual.current = null;
    setSelecionada(null);
    setDetalhe(null);
    setErroDetalhe(null);
    setCarregandoDetalhe(false);
    setErroForm(null);
  };

  const registrarParecer = async () => {
    if (!selecionada) return;
    const protocolo = selecionada.protocolo;
    const texto = parecer.trim();

    if (!resultado) {
      setErroForm("Selecione o resultado da análise.");
      return;
    }
    if (texto.length < PARECER_MIN || texto.length > PARECER_MAX) {
      setErroForm(`O parecer deve ter entre ${PARECER_MIN} e ${PARECER_MAX} caracteres.`);
      return;
    }

    setErroForm(null);
    setEnviando(true);
    try {
      const response = await api.post(
        `${API_ROUTES.matriculas}/${encodeURIComponent(protocolo)}/parecer-secretaria`,
        { resultado, parecer: texto },
      );
      if (!response.ok) {
        const mensagens: Record<number, string> = {
          400: "Dados inválidos. Revise o resultado e o parecer.",
          401: "Sessão expirada. Faça login novamente.",
          403: "Você não tem permissão para registrar o parecer.",
          404: "Matrícula não encontrada.",
          409: "Esta matrícula não está mais pendente de análise. Atualize a lista.",
        };
        throw new Error(mensagens[response.status] ?? "Não foi possível registrar o parecer. Tente novamente.");
      }

      const dados: { status: string } = await response.json();
      setMatriculas((atuais) => atuais.map((m) => (m.protocolo === protocolo ? { ...m, status: dados.status } : m)));
      if (protocoloAtual.current === protocolo) {
        setSelecionada((atual) => (atual ? { ...atual, status: dados.status } : atual));
        setDetalhe((atual) => (atual ? { ...atual, status: dados.status } : atual));
        setResultado("");
        setParecer("");
      }
      toast({
        title: "Parecer registrado",
        description: `Matrícula ${protocolo}: ${statusConfig[dados.status]?.label ?? dados.status}.`,
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao registrar parecer",
        description: e instanceof Error ? e.message : "Não foi possível registrar o parecer. Tente novamente.",
      });
    } finally {
      setEnviando(false);
    }
  };

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
                        <Button size="sm" variant="outline" onClick={() => abrir(m)}>Visualizar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog open={!!selecionada} onOpenChange={(aberto) => !aberto && fechar()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selecionada && (
            <>
              <DialogHeader>
                <DialogTitle>Matrícula {selecionada.protocolo}</DialogTitle>
                <DialogDescription asChild>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={(detalhe ?? selecionada).status} />
                    <span>{(detalhe ?? selecionada).etapa.nome} • {formatarData((detalhe ?? selecionada).dataSolicitacao)}</span>
                  </div>
                </DialogDescription>
              </DialogHeader>

              {carregandoDetalhe && (
                <p role="status" className="py-6 text-center text-sm text-muted-foreground">
                  Carregando detalhes da matrícula...
                </p>
              )}

              {erroDetalhe && (
                <div role="alert" className="flex flex-col gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
                  <span>{erroDetalhe}</span>
                  <Button size="sm" variant="outline" onClick={() => carregarDetalhe(selecionada.protocolo)}>
                    Tentar novamente
                  </Button>
                </div>
              )}

              {detalhe && (
                <>
                  <section className="space-y-2">
                    <h3 className="font-display font-semibold">Dados do Responsável</h3>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <Dado label="Nome" valor={detalhe.responsavel.nome} />
                      <Dado label="CPF" valor={detalhe.responsavel.cpf} />
                      <Dado label="Parentesco" valor={detalhe.responsavel.parentesco} />
                      <Dado label="Telefone" valor={detalhe.responsavel.telefone} />
                      <Dado label="WhatsApp" valor={detalhe.responsavel.whatsapp} />
                      <Dado label="E-mail" valor={detalhe.responsavel.email} />
                    </dl>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-display font-semibold">Dados do Catequizando</h3>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      <Dado label="Nome" valor={detalhe.catequizando.nome} />
                      <Dado label="Nascimento" valor={formatarData(detalhe.catequizando.dataNascimento)} />
                      <Dado label="Etapa" valor={detalhe.etapa.nome} />
                      <Dado label="Telefone de emergência" valor={detalhe.catequizando.telefoneEmergencia} />
                      <div className="sm:col-span-2"><Dado label="Endereço" valor={detalhe.catequizando.endereco} /></div>
                    </dl>
                  </section>

                  <section className="space-y-2">
                    <h3 className="font-display font-semibold">Documentos</h3>
                    {detalhe.documentos.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum documento enviado.</p>
                    ) : (
                      <ul className="space-y-2">
                        {detalhe.documentos.map((d) => {
                          const status = statusDocumentoConfig[d.status] ?? {
                            label: d.status,
                            className: "border-transparent bg-gray-100 text-gray-800",
                          };
                          return (
                            <li key={d.id} className="space-y-2 rounded-md border p-3 text-sm">
                              <div className="flex items-start justify-between gap-2">
                                <span className="flex min-w-0 items-start gap-2">
                                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                  <span className="min-w-0">
                                    <span className="block font-medium">{tiposDocumento[d.tipoDocumento] ?? d.tipoDocumento}</span>
                                    <span className="block break-all text-muted-foreground">{d.nomeArquivo}</span>
                                  </span>
                                </span>
                                <Badge className={cn("whitespace-nowrap", status.className)}>{status.label}</Badge>
                              </div>
                              <dl className="grid gap-2 sm:grid-cols-2">
                                <Dado label="Data de envio" valor={formatarData(d.dataEnvio)} />
                                <Dado label="Parecer" valor={d.parecer ?? ""} />
                              </dl>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>

                  <section className="space-y-3 border-t pt-4">
                    <h3 className="font-display font-semibold">Análise da Secretaria</h3>
                    {detalhe.status !== "PENDENTE" ? (
                      <p className="text-sm text-muted-foreground">
                        Esta matrícula não está pendente de análise documental.
                      </p>
                    ) : (
                      <form
                        className="space-y-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          registrarParecer();
                        }}
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor="resultado-analise">Resultado *</Label>
                          <Select value={resultado} onValueChange={setResultado} disabled={enviando}>
                            <SelectTrigger id="resultado-analise">
                              <SelectValue placeholder="Selecione o resultado" />
                            </SelectTrigger>
                            <SelectContent>
                              {resultadosAnalise.map((r) => (
                                <SelectItem key={r.valor} value={r.valor}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="parecer-secretaria">Parecer *</Label>
                          <Textarea
                            id="parecer-secretaria"
                            value={parecer}
                            onChange={(e) => setParecer(e.target.value)}
                            maxLength={PARECER_MAX}
                            rows={4}
                            disabled={enviando}
                            placeholder="Descreva o resultado da análise documental"
                          />
                          <p className="text-right text-xs text-muted-foreground">
                            {parecer.length}/{PARECER_MAX} (mínimo {PARECER_MIN})
                          </p>
                        </div>
                        {erroForm && <p role="alert" className="text-sm text-destructive">{erroForm}</p>}
                        <Button type="submit" disabled={enviando} className="w-full sm:w-auto">
                          {enviando ? "Registrando..." : "Registrar parecer"}
                        </Button>
                      </form>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
