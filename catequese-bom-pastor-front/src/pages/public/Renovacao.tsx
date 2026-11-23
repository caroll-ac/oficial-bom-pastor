import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import { ADMIN_NAV_ITEMS, COORDENADOR_NAV_ITEMS, PARENT_NAV_ITEMS, SECRETARIA_NAV_ITEMS } from "@/lib/sidebarNavItems";
import { PIX_KEY, PIX_RECIPIENT } from "@/lib/contact";

type DocumentField = "certificadoBatismo" | "comprovanteEndereco" | "certidaoNascimento";
type Child = { id: string; nome: string; turma: string | null; documentosFaltantes: DocumentField[] };
type Renewal = { id: string; catequizandoId: string; ano: number; status: string; observacoes: string | null };
type AdminRenewal = Renewal & {
  catequizando: { nome: string };
  responsavel: { nome: string; email: string; telefone: string | null };
  comprovanteUrl: string;
  documentos: { tipo: string; url: string | null }[];
};
const labels: Record<DocumentField, string> = {
  certificadoBatismo: "Certificado de batismo",
  comprovanteEndereco: "Comprovante de endereço",
  certidaoNascimento: "Certidão de nascimento",
};
const documentLabels: Record<string, string> = {
  CERTIFICADO_BATISMO: labels.certificadoBatismo,
  COMPROVANTE_ENDERECO: labels.comprovanteEndereco,
  CERTIDAO_NASCIMENTO: labels.certidaoNascimento,
};
const statusLabels: Record<string, string> = { PENDING: "Em análise", APPROVED: "Aprovada", REJECTED: "Não aprovada" };
const periodoSchema = z.object({ dataLiberacao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), aberta: z.boolean() })
  .refine((periodo) => !periodo.aberta || periodo.dataLiberacao !== null);
type Periodo = z.infer<typeof periodoSchema>;

const formatarData = (data: string) => data.split("-").reverse().join("/");

async function carregarPeriodo(): Promise<Periodo> {
  const response = await api.get(API_ROUTES.renovacoesPeriodo);
  if (!response.ok) throw new Error(await errorMessage(response));
  const result = periodoSchema.safeParse(await response.json());
  if (!result.success) throw new Error("O servidor retornou uma configuração de rematrícula inválida.");
  return result.data;
}

function mensagemPeriodo(periodo: Periodo) {
  if (periodo.aberta && periodo.dataLiberacao) return `Rematrícula aberta desde ${formatarData(periodo.dataLiberacao)}.`;
  if (periodo.dataLiberacao) return `Rematrícula fechada. Abertura prevista para ${formatarData(periodo.dataLiberacao)}.`;
  return "Rematrícula fechada. A data de abertura ainda não foi definida.";
}

async function errorMessage(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null);
  const message: unknown = payload?.message;
  if (Array.isArray(message)) return message.join(" ");
  return typeof message === "string" ? message : `Falha na solicitação (${response.status}).`;
}

export function RenovacaoResponsavel() {
  const [children, setChildren] = useState<Child[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [childId, setChildId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear() + 1));
  const [files, setFiles] = useState<Partial<Record<DocumentField | "comprovantePix", File>>>({});
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [erroPeriodo, setErroPeriodo] = useState("");
  const [carregandoPeriodo, setCarregandoPeriodo] = useState(true);

  const atualizarPeriodo = async () => {
    try {
      const resultado = await carregarPeriodo();
      setPeriodo(resultado);
      if (!resultado.aberta) setFiles({});
      setErroPeriodo("");
    } catch (err) {
      setPeriodo(null);
      setFiles({});
      setErroPeriodo(err instanceof Error ? err.message : "Não foi possível consultar a liberação.");
    } finally {
      setCarregandoPeriodo(false);
    }
  };

  const load = async () => {
    const response = await api.get(`${API_ROUTES.renovacoes}/me`);
    if (!response.ok) throw new Error(await errorMessage(response));
    const result: { catequizandos: Child[]; renovacoes: Renewal[] } = await response.json();
    setChildren(result.catequizandos);
    setRenewals(result.renovacoes);
  };
  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : "Não foi possível carregar os dados."))
      .finally(() => setLoading(false));
    void atualizarPeriodo();
    const timer = window.setInterval(() => { void atualizarPeriodo(); }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const child = children.find((item) => item.id === childId);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!periodo?.aberta) {
      setError("A rematrícula ainda não está liberada.");
      return;
    }
    if (!child || !files.comprovantePix || child.documentosFaltantes.some((field) => !files[field])) {
      setError("Selecione o catequizando e anexe o comprovante e os documentos pendentes.");
      return;
    }
    const form = new FormData();
    form.append("catequizandoId", child.id);
    form.append("ano", year);
    form.append("comprovantePix", files.comprovantePix);
    for (const field of Object.keys(labels) as DocumentField[]) {
      if (files[field]) form.append(field, files[field]!);
    }
    setSubmitting(true);
    try {
      const response = await api.post(API_ROUTES.renovacoes, form);
      if (!response.ok) {
        if (response.status === 403) await atualizarPeriodo();
        throw new Error(await errorMessage(response));
      }
      setFiles({});
      setFormKey((value) => value + 1);
      setNotice("Solicitação enviada. A coordenação analisará o comprovante e os documentos.");
      try {
        await load();
      } catch {
        setError("A solicitação foi enviada, mas não foi possível atualizar a lista. Recarregue a página.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a solicitação.");
    } finally {
      setSubmitting(false);
    }
  };
  const fileInput = (field: DocumentField | "comprovantePix", label: string, required = true) => (
    <div key={field} className="space-y-2">
      <Label htmlFor={field}>{label}{required ? " *" : " (opcional)"}</Label>
      <Input id={field} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required={required}
        onChange={(event) => setFiles((previous) => ({ ...previous, [field]: event.target.files?.[0] }))} />
    </div>
  );
  return (
    <DashboardShell items={PARENT_NAV_ITEMS} title="Rematrícula" description="Solicite a rematrícula de uma criança cadastrada para análise da coordenação.">
      <Card><CardHeader><CardTitle>Solicitar rematrícula</CardTitle></CardHeader><CardContent className="space-y-4">
        {carregandoPeriodo ? <p>Consultando liberação...</p> : erroPeriodo ? <p role="alert" className="text-destructive">{erroPeriodo}</p> : periodo && <p role="status">{mensagemPeriodo(periodo)}</p>}
        {periodo?.aberta && <>
        <p>Taxa de rematrícula: <strong>R$ 50,00 via Pix</strong>. Chave celular: <strong>{PIX_KEY}</strong>. Beneficiário: {PIX_RECIPIENT}. Anexe o comprovante; a rematrícula não é automática.</p>
        <p className="text-sm text-muted-foreground">PDF, JPG, PNG ou WEBP, até 5 MB por arquivo. Documentos já enviados não precisam ser reenviados, mas podem ser substituídos.</p>
        {loading ? <p>Carregando...</p> : children.length === 0 ? !error && <p>Nenhum catequizando cadastrado foi encontrado. Entre em contato com a coordenação.</p> : (
          <form key={formKey} onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="child">Catequizando</Label>
              <select id="child" required className="flex h-10 w-full rounded-md border bg-background px-3" value={childId}
                onChange={(event) => { setChildId(event.target.value); setFiles({}); setFormKey((value) => value + 1); }}>
                <option value="">Selecione</option>{children.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label htmlFor="year">Ano da rematrícula</Label>
              <select id="year" className="flex h-10 w-full rounded-md border bg-background px-3" value={year} onChange={(event) => setYear(event.target.value)}>
                {[new Date().getFullYear() + 1, new Date().getFullYear()].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            {fileInput("comprovantePix", "Comprovante do Pix")}
            {child && (Object.keys(labels) as DocumentField[]).map((field) => fileInput(field, labels[field], child.documentosFaltantes.includes(field)))}
            <Button type="submit" disabled={submitting}>{submitting ? "Enviando..." : "Enviar solicitação"}</Button>
          </form>
        )}
        </>}
        {notice && <p role="status" className="text-green-700">{notice}</p>}
        {error && <p role="alert" className="text-destructive">{error}</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Solicitações enviadas</CardTitle></CardHeader><CardContent className="space-y-3">
        {renewals.length === 0 ? <p>Nenhuma solicitação encontrada.</p> : renewals.map((item) => (
          <div className="rounded border p-3" key={item.id}>
            <p className="font-medium">{children.find((child) => child.id === item.catequizandoId)?.nome} — {item.ano}</p>
            <p>{statusLabels[item.status] || item.status}</p>
            {item.observacoes && <p>Observações: {item.observacoes}</p>}
          </div>
        ))}
      </CardContent></Card>
    </DashboardShell>
  );
}

function ConfiguracaoPeriodo({ podeEditar }: { podeEditar: boolean }) {
  const [periodo, setPeriodo] = useState<Periodo | null>(null);
  const [data, setData] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    carregarPeriodo().then((result) => {
      setPeriodo(result);
      setData(result.dataLiberacao ?? "");
    }).catch((err: unknown) => setError(err instanceof Error ? err.message : "Não foi possível consultar a liberação."))
      .finally(() => setLoading(false));
  }, []);

  const alterar = async (fechar: boolean) => {
    setError("");
    setNotice("");
    if (!fechar && !data) {
      setError("Informe a data de abertura.");
      return;
    }
    setBusy(true);
    try {
      const response = fechar
        ? await api.delete(API_ROUTES.renovacoesPeriodo)
        : await api.put(API_ROUTES.renovacoesPeriodo, { dataLiberacao: data });
      if (!response.ok) throw new Error(await errorMessage(response));
      const result = periodoSchema.safeParse(await response.json());
      if (!result.success) throw new Error("O servidor retornou uma configuração inválida. Atualize a página.");
      setPeriodo(result.data);
      setData(result.data.dataLiberacao ?? "");
      setNotice(fechar ? "Rematrícula fechada." : "Data de abertura salva.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível alterar a liberação.");
    } finally {
      setBusy(false);
    }
  };

  return <Card><CardHeader><CardTitle>Liberação da rematrícula</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      {loading ? <p>Carregando...</p> : periodo && <p role="status">{mensagemPeriodo(periodo)}</p>}
      <p className="text-sm text-muted-foreground">A abertura ocorre à meia-noite no horário de Brasília. A data vale para todas as rematrículas.</p>
      {podeEditar && !loading && periodo && <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void alterar(false); }}>
        <div className="space-y-2"><Label htmlFor="data-liberacao">Data de abertura</Label>
          <Input id="data-liberacao" type="date" value={data} onChange={(event) => setData(event.target.value)} required />
        </div>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>Salvar data</Button>
          {periodo.dataLiberacao && <Button type="button" variant="outline" disabled={busy} onClick={() => void alterar(true)}>Limpar data e fechar</Button>}
        </div>
      </form>}
      {notice && <p role="status" className="text-green-700">{notice}</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </CardContent>
  </Card>;
}

export function RenovacaoSecretaria() {
  return <DashboardShell items={SECRETARIA_NAV_ITEMS} title="Liberação de rematrícula" description="Consulte a data definida pela administração.">
    <ConfiguracaoPeriodo podeEditar={false} />
  </DashboardShell>;
}

export function RenovacaoAdmin() {
  const { pathname } = useLocation();
  const { role, user } = useAuth();
  const [records, setRecords] = useState<AdminRenewal[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const load = async () => {
    const response = await api.get(API_ROUTES.renovacoes);
    if (!response.ok) throw new Error(await errorMessage(response));
    setRecords(await response.json());
  };
  useEffect(() => {
    load().catch((err: unknown) => setError(err instanceof Error ? err.message : "Falha ao carregar solicitações."))
      .finally(() => setLoading(false));
  }, []);
  const decide = async (id: string, status: "APPROVED" | "REJECTED") => {
    if (status === "REJECTED" && !notes[id]?.trim()) {
      setError("Informe o motivo da recusa antes de continuar.");
      return;
    }
    setError("");
    setNotice("");
    setBusy(id);
    try {
      const response = await api.patch(`${API_ROUTES.renovacoes}/${id}`, { status, observacoes: notes[id] || undefined });
      if (!response.ok) throw new Error(await errorMessage(response));
      setNotice("Decisão registrada.");
      try {
        await load();
      } catch {
        setError("A decisão foi registrada, mas não foi possível atualizar a lista. Recarregue a página.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao analisar solicitação.");
    } finally {
      setBusy(null);
    }
  };
  return (
    <DashboardShell items={pathname.startsWith("/coordenador") ? COORDENADOR_NAV_ITEMS : ADMIN_NAV_ITEMS} title="Rematrículas" description="Confira o Pix e os documentos antes de decidir.">
      <ConfiguracaoPeriodo podeEditar={role === "admin" || Boolean(user?.perfis?.includes("ADMINISTRADOR"))} />
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {notice && <p role="status" className="text-green-700">{notice}</p>}
      {loading ? <p>Carregando...</p> : records.length === 0 ? !error && <p>Nenhuma solicitação de rematrícula.</p> : records.map((item) => (
        <Card key={item.id}><CardHeader><CardTitle>{item.catequizando.nome} — {item.ano}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p>Responsável: {item.responsavel.nome} — {item.responsavel.email} {item.responsavel.telefone && `— ${item.responsavel.telefone}`}</p>
            <p>Status: {statusLabels[item.status] || item.status}</p>
            <a className="block text-primary underline" href={item.comprovanteUrl} target="_blank" rel="noopener noreferrer">Abrir comprovante do Pix</a>
            {item.documentos.map((doc) => doc.url ? <a key={doc.tipo} className="block text-primary underline" href={doc.url} target="_blank" rel="noopener noreferrer">{documentLabels[doc.tipo]}</a> : <p key={doc.tipo}>{documentLabels[doc.tipo]}: não enviado</p>)}
            {item.status === "PENDING" ? <>
              <Label htmlFor={`notes-${item.id}`}>Observações (obrigatórias para recusar)</Label>
              <Textarea id={`notes-${item.id}`} value={notes[item.id] || ""} onChange={(event) => setNotes((prev) => ({ ...prev, [item.id]: event.target.value }))} />
              <div className="flex gap-2"><Button disabled={busy !== null} onClick={() => decide(item.id, "APPROVED")}>Aprovar</Button>
                <Button variant="destructive" disabled={busy !== null} onClick={() => decide(item.id, "REJECTED")}>Recusar</Button></div>
            </> : item.observacoes && <p>Observações: {item.observacoes}</p>}
          </CardContent>
        </Card>
      ))}
    </DashboardShell>
  );
}
