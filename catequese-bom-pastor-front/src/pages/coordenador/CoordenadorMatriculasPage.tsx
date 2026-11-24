import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { HistoricoAnalisesSecretaria, type AnaliseSecretaria } from "@/components/matriculas/HistoricoAnalisesSecretaria";
import { MatriculaStatusBadge } from "@/components/matriculas/MatriculaStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { statusMatriculaConfig } from "@/lib/matriculaStatus";
import { API_ROUTES } from "@/lib/routes";
import { COORDENADOR_NAV_ITEMS } from "@/lib/sidebarNavItems";
import { cn } from "@/lib/utils";

interface MatriculaResponse {
  protocolo: string;
  status: string;
  dataSolicitacao: string | null;
  etapa: { id: string; nome: string };
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
}

interface MatriculaDetalheResponse extends MatriculaResponse {
  analisesSecretaria: AnaliseSecretaria[];
  documentos: {
    id: string;
    tipoDocumento: string;
    nomeArquivo: string;
    status: string;
    parecer: string | null;
    dataEnvio: string | null;
  }[];
}

type Resultado = "APROVADA" | "REJEITADA";

const tiposDocumento: Record<string, string> = {
  CERTIDAO_NASCIMENTO: "Certidão de Nascimento",
  CERTIFICADO_BATISMO: "Certificado de Batismo",
  COMPROVANTE_ENDERECO: "Comprovante de Residência",
};

const statusDocumento: Record<string, { label: string; className: string }> = {
  PENDENTE: { label: "Pendente", className: "border-transparent bg-gray-100 text-gray-800" },
  APROVADO: { label: "Aprovado", className: "border-transparent bg-green-100 text-green-800" },
  REJEITADO: { label: "Rejeitado", className: "border-transparent bg-red-100 text-red-800" },
};

const formatarData = (iso: string | null) => {
  if (!iso) return "—";
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const DocumentoStatusBadge = ({ status }: { status: string }) => {
  const estilo = statusDocumento[status] ?? { label: status, className: "border-transparent bg-gray-100 text-gray-800" };
  return <Badge className={cn("whitespace-nowrap", estilo.className)}>{estilo.label}</Badge>;
};

const Dado = ({ label, valor }: { label: string; valor: string }) => (
  <div>
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="break-words text-sm font-medium">{valor || "—"}</dd>
  </div>
);

function mensagemErro(status: number, acao: string) {
  const mensagens: Record<number, string> = {
    400: "Dados inválidos. Revise as informações e tente novamente.",
    401: "Sessão expirada. Faça login novamente.",
    403: "Você não tem permissão para realizar esta ação.",
    404: "Matrícula não encontrada.",
    409: "Esta matrícula não permite mais uma decisão. Atualize os dados.",
  };
  return mensagens[status] ?? `Não foi possível ${acao}. Tente novamente.`;
}

export default function CoordenadorMatriculasPage() {
  const { toast } = useToast();
  const { role } = useAuth();
  const location = useLocation();
  const podeDecidir = role === "coordenador" || role === "admin";
  const [matriculas, setMatriculas] = useState<MatriculaResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<MatriculaResponse | null>(null);
  const [detalhe, setDetalhe] = useState<MatriculaDetalheResponse | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
  const [tentativaDetalhe, setTentativaDetalhe] = useState(0);
  const [resultado, setResultado] = useState<Resultado | "">("");
  const [parecer, setParecer] = useState("");
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const navegacaoProcessada = useRef<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [busca, setBusca] = useState(() => new URLSearchParams(location.search).get("protocolo") ?? "");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const response = await api.get(API_ROUTES.matriculas);
      if (!response.ok) throw new Error(mensagemErro(response.status, "carregar as matrículas"));
      const dados: MatriculaResponse[] = await response.json();
      setMatriculas(dados);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar as matrículas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const protocolo = new URLSearchParams(location.search).get("protocolo");
    if (!protocolo || carregando || erro || navegacaoProcessada.current === location.key) return;
    navegacaoProcessada.current = location.key;
    setBusca(protocolo);
    const matricula = matriculas.find((item) => item.protocolo === protocolo);
    if (!matricula) {
      toast({ title: "Matrícula não encontrada", description: `Não foi encontrada a matrícula ${protocolo}.`, variant: "destructive" });
      return;
    }
    setResultado("");
    setParecer("");
    setErroForm(null);
    setDetalhe(null);
    setSelecionada(matricula);
  }, [carregando, erro, matriculas, location.key, location.search, toast]);

  const protocolo = selecionada?.protocolo;
  useEffect(() => {
    if (!protocolo) return;
    let ativa = true;
    setDetalhe(null);
    setErroDetalhe(null);
    setCarregandoDetalhe(true);
    const carregarDetalhe = async () => {
      try {
        const response = await api.get(`${API_ROUTES.matriculas}/${encodeURIComponent(protocolo)}`);
        if (!response.ok) throw new Error(mensagemErro(response.status, "carregar os detalhes"));
        const dados: MatriculaDetalheResponse = await response.json();
        if (ativa) {
          setDetalhe(dados);
          setMatriculas((atuais) => atuais.map((m) => m.protocolo === protocolo ? { ...m, status: dados.status } : m));
        }
      } catch (e) {
        if (ativa) setErroDetalhe(e instanceof Error ? e.message : "Não foi possível carregar os detalhes.");
      } finally {
        if (ativa) setCarregandoDetalhe(false);
      }
    };
    void carregarDetalhe();
    return () => { ativa = false; };
  }, [protocolo, tentativaDetalhe]);

  const abrir = (matricula: MatriculaResponse) => {
    setResultado("");
    setParecer("");
    setErroForm(null);
    setDetalhe(null);
    setSelecionada(matricula);
  };

  const fechar = () => {
    if (enviandoRef.current) return;
    setSelecionada(null);
    setDetalhe(null);
    setErroDetalhe(null);
  };

  const registrarDecisao = async () => {
    if (!podeDecidir || !detalhe || !["PENDENTE", "AGUARDANDO_COORDENADOR"].includes(detalhe.status) || enviandoRef.current) return;
    const texto = parecer.trim();
    if (!resultado) {
      setErroForm("Selecione o resultado da decisão.");
      return;
    }
    if (texto.length < 5 || texto.length > 1000) {
      setErroForm("O parecer deve ter entre 5 e 1000 caracteres.");
      return;
    }
    setErroForm(null);
    enviandoRef.current = true;
    setEnviando(true);
    try {
      const response = await api.post(
        `${API_ROUTES.matriculas}/${encodeURIComponent(detalhe.protocolo)}/decisao-coordenador`,
        { resultado, parecer: texto },
      );
      if (!response.ok) {
        const erroResposta: { message?: string } = await response.json().catch(() => ({}));
        if (response.status === 409) {
          setDetalhe(null);
          setTentativaDetalhe((atual) => atual + 1);
          void carregar();
        }
        toast({
          variant: "destructive",
          title: "Erro ao registrar decisão",
          description: typeof erroResposta.message === "string" ? erroResposta.message : mensagemErro(response.status, "registrar a decisão"),
        });
        return;
      }
      const dados: { status: string; emailEnviado?: boolean } = await response.json();
      setMatriculas((atuais) => atuais.map((m) => m.protocolo === detalhe.protocolo ? { ...m, status: dados.status } : m));
      setSelecionada((atual) => atual && atual.protocolo === detalhe.protocolo ? { ...atual, status: dados.status } : atual);
      setDetalhe((atual) => atual && atual.protocolo === detalhe.protocolo ? { ...atual, status: dados.status } : atual);
      setResultado("");
      setParecer("");
      toast(dados.emailEnviado === false ? {
        variant: "destructive",
        title: "Matrícula aprovada, mas o e-mail não foi enviado",
        description: "Verifique a configuração de e-mail e use a opção de reenviar.",
      } : { title: "Decisão registrada", description: `Matrícula ${detalhe.protocolo}: ${statusMatriculaConfig[dados.status]?.label ?? dados.status}.` });
    } catch {
      toast({
        variant: "destructive",
        title: "Erro ao registrar decisão",
        description: "Não foi possível registrar a decisão. Verifique a conexão e tente novamente.",
      });
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  const reenviarEmail = async () => {
    if (!detalhe || enviando) return;
    setEnviando(true);
    try {
      const response = await api.post(`${API_ROUTES.matriculas}/${encodeURIComponent(detalhe.protocolo)}/notificacao-aprovacao`);
      if (!response.ok) throw new Error("Não foi possível reenviar o e-mail.");
      const dados: { emailEnviado: boolean } = await response.json();
      if (!dados.emailEnviado) throw new Error("O e-mail não foi enviado. Verifique a configuração de e-mail.");
      toast({ title: "E-mail enviado" });
    } catch (error) {
      toast({ variant: "destructive", title: "Falha no envio", description: error instanceof Error ? error.message : "Não foi possível reenviar o e-mail." });
    } finally {
      setEnviando(false);
    }
  };

  const contagem = (status: string) => matriculas.filter((m) => m.status === status).length;
  const indicadores = [
    { titulo: "Aguardando decisão", valor: contagem("AGUARDANDO_COORDENADOR") },
    { titulo: "Aprovadas", valor: contagem("APROVADA") },
    { titulo: "Rejeitadas", valor: contagem("REJEITADA") },
    { titulo: "Total", valor: matriculas.length },
  ];
  const matriculasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return matriculas.filter((m) =>
      (filtroStatus === "TODOS" || m.status === filtroStatus) &&
      [m.protocolo, m.responsavel.nome, m.catequizando.nome].some((valor) => valor.toLowerCase().includes(termo)),
    );
  }, [matriculas, busca, filtroStatus]);

  return (
    <DashboardShell
      items={COORDENADOR_NAV_ITEMS}
      title="Área do Coordenador"
      description="Avalie as matrículas e registre a decisão final."
    >
          {!carregando && !erro && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {indicadores.map((i) => (
                <Card key={i.titulo} variant="elevated">
                  <CardHeader className="pb-2">
                    <CardDescription>{i.titulo}</CardDescription>
                    <CardTitle className="font-display text-3xl">{i.valor}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}

          <Card variant="elevated" className="min-w-0">
            <CardHeader>
              <CardTitle>Lista de matrículas</CardTitle>
              <CardDescription>
                {carregando ? "Carregando matrículas..." : erro ? "Não foi possível carregar a lista." : `${matriculasFiltradas.length} de ${matriculas.length} matrículas encontradas`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input value={busca} onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por protocolo, responsável ou catequizando" aria-label="Buscar matrículas" className="pl-9" />
                </div>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger className="sm:w-56" aria-label="Filtrar por status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODOS">Todos</SelectItem>
                    {Object.entries(statusMatriculaConfig).map(([valor, config]) => (
                      <SelectItem key={valor} value={valor}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {erro && (
                <div role="alert" className="flex flex-col gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
                  <span>{erro}</span><Button size="sm" variant="outline" onClick={() => void carregar()}>Tentar novamente</Button>
                </div>
              )}
              {carregando && <p role="status" className="text-sm text-muted-foreground">Carregando matrículas...</p>}
              {!carregando && !erro && (
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Protocolo</TableHead><TableHead>Responsável</TableHead><TableHead>Catequizando</TableHead>
                      <TableHead>Etapa</TableHead><TableHead>Data Solicitação</TableHead><TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matriculasFiltradas.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Nenhuma matrícula encontrada.</TableCell></TableRow>
                    )}
                    {matriculasFiltradas.map((m) => (
                      <TableRow key={m.protocolo}>
                        <TableCell className="whitespace-nowrap font-mono font-semibold">{m.protocolo}</TableCell>
                        <TableCell className="whitespace-nowrap">{m.responsavel.nome}</TableCell>
                        <TableCell className="whitespace-nowrap">{m.catequizando.nome}</TableCell>
                        <TableCell className="whitespace-nowrap">{m.etapa.nome}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatarData(m.dataSolicitacao)}</TableCell>
                        <TableCell><MatriculaStatusBadge status={m.status} /></TableCell>
                        <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => abrir(m)}>Visualizar</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      <Dialog open={!!selecionada} onOpenChange={(aberto) => { if (!aberto) fechar(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Matrícula {selecionada?.protocolo}</DialogTitle>
            <DialogDescription>Detalhes da matrícula e decisão do Coordenador.</DialogDescription>
          </DialogHeader>
          {carregandoDetalhe && <p role="status" className="text-sm text-muted-foreground">Carregando detalhes da matrícula...</p>}
          {erroDetalhe && (
            <div role="alert" className="flex flex-col gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
              <span>{erroDetalhe}</span>
              <Button size="sm" variant="outline" onClick={() => setTentativaDetalhe((atual) => atual + 1)}>Tentar novamente</Button>
            </div>
          )}
          {detalhe && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <MatriculaStatusBadge status={detalhe.status} />
                <span>{detalhe.etapa.nome} • {formatarData(detalhe.dataSolicitacao)}</span>
              </div>
              <section className="space-y-2">
                <h3 className="font-display font-semibold">Dados do Responsável</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Dado label="Nome" valor={detalhe.responsavel.nome} /><Dado label="CPF" valor={detalhe.responsavel.cpf} />
                  <Dado label="Parentesco" valor={detalhe.responsavel.parentesco} /><Dado label="Telefone" valor={detalhe.responsavel.telefone} />
                  <Dado label="WhatsApp" valor={detalhe.responsavel.whatsapp} /><Dado label="E-mail" valor={detalhe.responsavel.email} />
                </dl>
              </section>
              <section className="space-y-2">
                <h3 className="font-display font-semibold">Dados do Catequizando</h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Dado label="Nome" valor={detalhe.catequizando.nome} /><Dado label="Nascimento" valor={formatarData(detalhe.catequizando.dataNascimento)} />
                  <Dado label="Etapa" valor={detalhe.etapa.nome} /><Dado label="Telefone de emergência" valor={detalhe.catequizando.telefoneEmergencia} />
                  <div className="sm:col-span-2"><Dado label="Endereço" valor={detalhe.catequizando.endereco} /></div>
                </dl>
              </section>
              <section className="space-y-2">
                <h3 className="font-display font-semibold">Documentos</h3>
                {detalhe.documentos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum documento registrado.</p> : (
                  <ul className="space-y-2">
                    {detalhe.documentos.map((d) => (
                      <li key={d.id} className="space-y-2 rounded-md border p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <span className="flex min-w-0 items-start gap-2">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span className="min-w-0">
                              <span className="block font-medium">{tiposDocumento[d.tipoDocumento] ?? d.tipoDocumento}</span>
                              <span className="block break-all text-muted-foreground">{d.nomeArquivo}</span>
                            </span>
                          </span>
                          <DocumentoStatusBadge status={d.status} />
                        </div>
                        <dl className="grid gap-2 sm:grid-cols-2">
                          <Dado label="Data de envio" valor={formatarData(d.dataEnvio)} />
                          <Dado label="Parecer" valor={d.parecer ?? ""} />
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <HistoricoAnalisesSecretaria analises={detalhe.analisesSecretaria} />
              {podeDecidir && !enviando && ["PENDENTE", "AGUARDANDO_COORDENADOR"].includes(detalhe.status) && (
                <Button variant="outline" asChild>
                  <Link to={`/secretaria/matriculas?protocolo=${encodeURIComponent(detalhe.protocolo)}`}>Operações e observações desta matrícula</Link>
                  </Button>
              )}
              {detalhe.status === "APROVADA" && ( 
                <Button type="button" variant="outline" disabled={enviando} onClick={() => void reenviarEmail()}>
                  {enviando ? "Enviando..." : "Reenviar e-mail de aprovação"}
                </Button>
              )}
              <section className="space-y-3 border-t pt-4">
                <h3 className="font-display font-semibold">Decisão do Coordenador</h3>
                {!podeDecidir ? (
                  <p className="text-sm text-muted-foreground">Você não tem permissão para registrar uma decisão.</p>
                ) : !["PENDENTE", "AGUARDANDO_COORDENADOR"].includes(detalhe.status) ? (
                  <p className="text-sm text-muted-foreground">Esta matrícula não permite mais uma decisão do Coordenador.</p>
                ) : (
                  <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void registrarDecisao(); }}>
                    <div className="space-y-1.5">
                      <Label htmlFor="resultado-decisao">Resultado *</Label>
                      <Select value={resultado} onValueChange={(valor: Resultado) => setResultado(valor)} disabled={enviando}>
                        <SelectTrigger id="resultado-decisao" aria-required="true"><SelectValue placeholder="Selecione o resultado" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="APROVADA">Aprovada</SelectItem><SelectItem value="REJEITADA">Rejeitada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="parecer-coordenador">Parecer *</Label>
                      <Textarea id="parecer-coordenador" value={parecer} onChange={(e) => setParecer(e.target.value)}
                        maxLength={1000} rows={4} disabled={enviando} aria-required="true" placeholder="Descreva a decisão" />
                      <p className="text-right text-xs text-muted-foreground">{parecer.length}/1000 (mínimo 5)</p>
                    </div>
                    {erroForm && <p role="alert" className="text-sm text-destructive">{erroForm}</p>}
                    <Button type="submit" disabled={enviando} className="w-full sm:w-auto">
                      {enviando ? "Registrando..." : "Registrar decisão"}
                    </Button>
                  </form>
                )}
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
