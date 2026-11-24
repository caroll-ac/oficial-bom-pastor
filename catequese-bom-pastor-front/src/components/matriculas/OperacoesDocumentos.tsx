import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";

type Documento = { id: string; nomeArquivo: string; tipoDocumento: string };
type Operacao = "adicionar" | "substituir" | "atualizar";

const tipos: Record<string, string> = {
  CERTIDAO_NASCIMENTO: "Certidão de Nascimento",
  CERTIFICADO_BATISMO: "Certificado de Batismo",
  COMPROVANTE_ENDERECO: "Comprovante de Residência",
};

export function OperacoesDocumentos({ protocolo, documentos, disabled, aoSalvar, aoEnviarChange }: {
  protocolo: string;
  documentos: Documento[];
  disabled: boolean;
  aoSalvar: () => Promise<void>;
  aoEnviarChange: (enviando: boolean) => void;
}) {
  const { toast } = useToast();
  const [operacao, setOperacao] = useState<Operacao>("adicionar");
  const [documentoId, setDocumentoId] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [arquivoSubstituto, setArquivoSubstituto] = useState<File | null>(null);
  const [status, setStatus] = useState("MANTER");
  const [alterarParecer, setAlterarParecer] = useState(false);
  const [parecer, setParecer] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const arquivoRef = useRef<HTMLInputElement>(null);

  const salvar = async () => {
    if (disabled || enviandoRef.current) return;
    const nomeArquivoSubstituto = arquivoSubstituto?.name.trim() ?? "";
    if (operacao !== "adicionar" && !documentos.some((documento) => documento.id === documentoId)) {
      setErro("Selecione um documento.");
      return;
    }
    if (operacao === "adicionar" && !tipoDocumento) {
      setErro("Selecione o tipo de documento.");
      return;
    }
    if (operacao === "adicionar" && !nomeArquivo.trim()) {
      setErro("Informe o nome do arquivo.");
      return;
    }
    if (operacao === "substituir" && !arquivoSubstituto) {
      setErro("Selecione o arquivo para atualizar o registro documental.");
      return;
    }
    if (operacao === "substituir" && (!nomeArquivoSubstituto || nomeArquivoSubstituto.length > 255)) {
      setErro("O nome do arquivo deve ter entre 1 e 255 caracteres.");
      return;
    }
    if (operacao === "atualizar" && status === "MANTER" && !alterarParecer) {
      setErro("Selecione um novo status ou marque a alteração do parecer.");
      return;
    }
    setErro("");
    enviandoRef.current = true;
    setEnviando(true);
    aoEnviarChange(true);
    const base = `${API_ROUTES.matriculas}/${encodeURIComponent(protocolo)}/documentos`;
    const extra = observacao.trim() ? { observacao: observacao.trim() } : {};
    try {
      let response: Response;
      if (operacao === "adicionar") {
        response = await api.post(base, { nomeArquivo: nomeArquivo.trim(), tipoDocumento, ...extra });
      } else if (operacao === "substituir") {
        response = await api.put(`${base}/${encodeURIComponent(documentoId)}/substituicao`, { nomeArquivo: nomeArquivoSubstituto, ...extra });
      } else {
        response = await api.patch(`${base}/${encodeURIComponent(documentoId)}`, {
          ...(status !== "MANTER" && { status }),
          ...(alterarParecer && { parecer: parecer.trim() }),
          ...extra,
        });
      }
      if (!response.ok) {
        const mensagens: Record<number, string> = {
          400: "Dados inválidos. Revise as informações.",
          401: "Sessão expirada. Faça login novamente.",
          403: "Você não tem permissão para alterar documentos.",
          404: "Matrícula ou documento não encontrado.",
          409: "A matrícula pode ter sido alterada ou não permitir mais alterações. Atualize os detalhes.",
        };
        throw new Error(mensagens[response.status] ?? "Não foi possível registrar a operação.");
      }
      setNomeArquivo("");
      setArquivoSubstituto(null);
      if (arquivoRef.current) arquivoRef.current.value = "";
      setTipoDocumento("");
      setDocumentoId("");
      setStatus("MANTER");
      setAlterarParecer(false);
      setParecer("");
      setObservacao("");
      toast({
        title: "Operação registrada",
        description: operacao === "substituir"
          ? "Somente o nome do arquivo foi registrado; o arquivo não foi enviado."
          : "Os metadados foram atualizados sem alterar o status da matrícula.",
      });
      await aoSalvar();
    } catch (e) {
      toast({ title: "Erro na operação", description: e instanceof Error ? e.message : "Não foi possível registrar a operação.", variant: "destructive" });
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
      aoEnviarChange(false);
    }
  };

  const bloqueado = disabled || enviando;
  return (
    <section className="space-y-3 border-t pt-4">
      <h3 className="font-display font-semibold">Operações da Secretaria</h3>
      <p className="text-sm text-muted-foreground">
        Apenas metadados são registrados; nenhum arquivo é enviado ou substituído no armazenamento. Atualizar o registro de substituição reinicia o status e o parecer do documento.
      </p>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void salvar(); }}>
        <div className="space-y-1.5">
          <Label htmlFor="operacao-documento">Operação</Label>
          <Select value={operacao} onValueChange={(valor: Operacao) => { setOperacao(valor); setArquivoSubstituto(null); setErro(""); }} disabled={bloqueado}>
            <SelectTrigger id="operacao-documento"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="adicionar">Adicionar documento</SelectItem>
              <SelectItem value="substituir">Atualizar registro de substituição</SelectItem>
              <SelectItem value="atualizar">Atualizar status ou parecer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {operacao === "adicionar" ? (
          <div className="space-y-1.5">
            <Label htmlFor="tipo-documento">Tipo de documento *</Label>
            <Select value={tipoDocumento} onValueChange={setTipoDocumento} disabled={bloqueado}>
              <SelectTrigger id="tipo-documento"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>{Object.entries(tipos).map(([valor, label]) => <SelectItem key={valor} value={valor}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="documento-operacao">Documento *</Label>
            <Select value={documentoId} onValueChange={setDocumentoId} disabled={bloqueado || documentos.length === 0}>
              <SelectTrigger id="documento-operacao"><SelectValue placeholder="Selecione um documento" /></SelectTrigger>
              <SelectContent>{documentos.map((documento) => (
                <SelectItem key={documento.id} value={documento.id}>{tipos[documento.tipoDocumento] ?? documento.tipoDocumento} — {documento.nomeArquivo}</SelectItem>
              ))}</SelectContent>
            </Select>
          </div>
        )}
        {operacao === "adicionar" ? (
          <div className="space-y-1.5">
            <Label htmlFor="nome-arquivo-operacao">Nome do arquivo *</Label>
            <Input id="nome-arquivo-operacao" value={nomeArquivo} onChange={(event) => setNomeArquivo(event.target.value)} maxLength={255} disabled={bloqueado} />
          </div>
        ) : operacao === "substituir" ? (
          <div className="space-y-1.5">
            <Label htmlFor="arquivo-substituto">Selecionar arquivo *</Label>
            <Input ref={arquivoRef} id="arquivo-substituto" type="file" onChange={(event) => setArquivoSubstituto(event.target.files?.[0] ?? null)} disabled={bloqueado} />
            <p className="text-sm text-muted-foreground">Somente o nome do arquivo será registrado. O arquivo não será enviado nem substituído.</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="status-documento">Status do documento</Label>
              <Select value={status} onValueChange={setStatus} disabled={bloqueado}>
                <SelectTrigger id="status-documento"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANTER">Manter atual</SelectItem>
                  <SelectItem value="PENDENTE">Pendente</SelectItem>
                  <SelectItem value="APROVADO">Aprovado</SelectItem>
                  <SelectItem value="REJEITADO">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="alterar-parecer-documento" checked={alterarParecer} onCheckedChange={(checked) => setAlterarParecer(checked === true)} disabled={bloqueado} />
              <Label htmlFor="alterar-parecer-documento">Atualizar parecer do documento</Label>
            </div>
            {alterarParecer && (
              <div className="space-y-1.5">
                <Label htmlFor="parecer-documento">Novo parecer (vazio remove o parecer)</Label>
                <Textarea id="parecer-documento" value={parecer} onChange={(event) => setParecer(event.target.value)} maxLength={1000} disabled={bloqueado} />
              </div>
            )}
          </>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="observacao-documento">Observação da operação (opcional)</Label>
          <Textarea id="observacao-documento" value={observacao} onChange={(event) => setObservacao(event.target.value)} maxLength={1000} disabled={bloqueado} />
        </div>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <Button type="submit" disabled={bloqueado} className="w-full sm:w-auto">{enviando ? "Registrando..." : operacao === "substituir" ? "Atualizar metadados" : "Registrar operação"}</Button>
      </form>
    </section>
  );
}
