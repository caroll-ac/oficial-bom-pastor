import { useEffect, useRef, useState } from "react";
import { Controller, useForm, type FieldErrors, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, FileText, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api, fetchPublic } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";

const etapaSchema = z.object({ id: z.string().regex(/^[1-9]\d*$/), nome: z.string().min(1) });
const matriculaCriadaSchema = z.object({ id: z.string().regex(/^[1-9]\d*$/), status: z.literal("PENDENTE") });

const obrigatorio = z.string().trim().min(1, "Este campo é obrigatório.");
const telefone = obrigatorio.max(20, "Use no máximo 20 caracteres.").refine(
  (value) => /^\d{10,11}$/.test(value.replace(/\D/g, "")),
  "Informe um telefone com DDD e 10 ou 11 dígitos.",
);

const schema = z.object({
  nomeResponsavel: obrigatorio.max(150, "Use no máximo 150 caracteres."),
  cpf: obrigatorio.max(14, "Use no máximo 14 caracteres.").refine((value) => /^\d{11}$/.test(value.replace(/\D/g, "")), "Informe o CPF com 11 dígitos."),
  nascimentoResponsavel: obrigatorio,
  telefone,
  whatsapp: telefone,
  email: obrigatorio.email("Informe um e-mail válido.").max(150, "Use no máximo 150 caracteres."),
  parentesco: obrigatorio.max(50, "Use no máximo 50 caracteres."),
  nomeCatequizando: obrigatorio.max(150, "Use no máximo 150 caracteres."),
  nascimentoCatequizando: obrigatorio,
  endereco: obrigatorio.max(16000, "Use no máximo 16000 caracteres."),
  telefoneEmergencia: telefone,
  nivelCatequetico: obrigatorio,
  observacoes: z.string().max(16000, "Use no máximo 16000 caracteres."),
});

type FormValues = z.infer<typeof schema>;
type DocumentKey = "nascimento" | "batismo" | "residencia";
const documentos: { key: DocumentKey; label: string; tipoDocumento: string; obrigatorio: boolean }[] = [
  { key: "nascimento", label: "Certidão de Nascimento", tipoDocumento: "CERTIDAO_NASCIMENTO", obrigatorio: true },
  { key: "batismo", label: "Certificado de Batismo", tipoDocumento: "CERTIFICADO_BATISMO", obrigatorio: false },
  { key: "residencia", label: "Comprovante de Residência", tipoDocumento: "COMPROVANTE_ENDERECO", obrigatorio: true },
];
const etapas = ["Responsável", "Catequizando", "Documentos", "Revisão"];
const camposPorEtapa: FieldPath<FormValues>[][] = [
  ["nomeResponsavel", "cpf", "nascimentoResponsavel", "telefone", "whatsapp", "email", "parentesco"],
  ["nomeCatequizando", "nascimentoCatequizando", "endereco", "telefoneEmergencia", "nivelCatequetico"],
];

function Campo({ label, id, error, children }: { label: string; id: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Resumo({ items }: { items: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map(({ label, value }) => (
        <div key={label} className="min-w-0">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="mt-1 break-words font-medium">{value || "Não informado"}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatarData(value: string) {
  const [ano, mes, dia] = value.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : value;
}

export default function MatriculaPage() {
  const [etapa, setEtapa] = useState(0);
  const [usarMesmoTelefone, setUsarMesmoTelefone] = useState(false);
  const [arquivos, setArquivos] = useState<Record<DocumentKey, string>>({
    nascimento: "", batismo: "", residencia: "",
  });
  const [niveis, setNiveis] = useState<z.infer<typeof etapaSchema>[]>([]);
  const [carregandoNiveis, setCarregandoNiveis] = useState(true);
  const [erroNiveis, setErroNiveis] = useState("");
  const [tentativaNiveis, setTentativaNiveis] = useState(0);
  const [erroDocumentos, setErroDocumentos] = useState("");
  const [erroEnvio, setErroEnvio] = useState("");
  const [numeroMatricula, setNumeroMatricula] = useState("");
  const enviandoRef = useRef(false);
  const { register, control, handleSubmit, trigger, setValue, watch, getValues, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nomeResponsavel: "", cpf: "", nascimentoResponsavel: "", telefone: "", whatsapp: "", email: "",
      parentesco: "", nomeCatequizando: "", nascimentoCatequizando: "", endereco: "",
      telefoneEmergencia: "", observacoes: "", nivelCatequetico: "",
    },
    shouldUnregister: false,
  });
  const telefoneResponsavel = watch("telefone");

  useEffect(() => {
    const controller = new AbortController();
    setCarregandoNiveis(true);
    setErroNiveis("");
    async function carregarNiveis() {
      try {
        const response = await fetchPublic(API_ROUTES.etapas, { signal: controller.signal });
        if (!response.ok) throw new Error("Não foi possível carregar os níveis catequéticos.");
        const niveisRecebidos = z.array(etapaSchema).parse(await response.json());
        setNiveis(niveisRecebidos);
      } catch {
        if (!controller.signal.aborted) {
          setNiveis([]);
          setErroNiveis("Não foi possível carregar os níveis catequéticos. Tente novamente.");
        }
      } finally {
        if (!controller.signal.aborted) setCarregandoNiveis(false);
      }
    }
    void carregarNiveis();
    return () => controller.abort();
  }, [tentativaNiveis]);

  useEffect(() => {
    if (usarMesmoTelefone) {
      setValue("whatsapp", telefoneResponsavel, { shouldValidate: true });
    }
  }, [setValue, telefoneResponsavel, usarMesmoTelefone]);

  async function proximaEtapa() {
    if (etapa === 2 && documentos.some(({ key, obrigatorio }) => obrigatorio && !arquivos[key])) {
      setErroDocumentos("Certidão de Nascimento e Comprovante de Residência são obrigatórios. O Certificado de Batismo é opcional.");
      return;
    }
    if (etapa === 2 && documentos.some(({ key }) => arquivos[key].length > 255)) {
      setErroDocumentos("O nome do arquivo deve ter no máximo 255 caracteres.");
      return;
    }
    setErroDocumentos("");
    const campos = camposPorEtapa[etapa];
    if (!campos || await trigger(campos, { shouldFocus: true })) {
      setEtapa((atual) => atual + 1);
    }
  }

  async function enviarMatricula(values: FormValues) {
    if (etapa !== 3 || enviandoRef.current) return;
    if (documentos.some(({ key, obrigatorio }) => obrigatorio && !arquivos[key])) {
      setErroDocumentos("Certidão de Nascimento e Comprovante de Residência são obrigatórios. O Certificado de Batismo é opcional.");
      setEtapa(2);
      return;
    }
    if (documentos.some(({ key }) => arquivos[key].length > 255)) {
      setErroDocumentos("O nome do arquivo deve ter no máximo 255 caracteres.");
      setEtapa(2);
      return;
    }
    if (!niveis.some((nivel) => nivel.id === values.nivelCatequetico)) {
      setErroEnvio("Selecione um nível disponível antes de enviar.");
      setEtapa(1);
      return;
    }
    const payload = {
      responsavelNome: values.nomeResponsavel,
      responsavelCpf: values.cpf,
      responsavelDataNascimento: values.nascimentoResponsavel,
      responsavelTelefone: values.telefone,
      responsavelWhatsapp: values.whatsapp,
      responsavelEmail: values.email,
      responsavelParentesco: values.parentesco,
      catequizandoNome: values.nomeCatequizando,
      catequizandoDataNascimento: values.nascimentoCatequizando,
      catequizandoEndereco: values.endereco,
      catequizandoTelefoneEmergencia: values.telefoneEmergencia,
      etapaId: values.nivelCatequetico,
      observacao: values.observacoes || null,
      documentos: documentos
        .filter(({ key }) => arquivos[key])
        .map(({ key, tipoDocumento }) => ({ nomeArquivo: arquivos[key], tipoDocumento })),
    };
    enviandoRef.current = true;
    setErroEnvio("");
    try {
      const response = await api.postPublic(API_ROUTES.matriculas, payload);
      if (!response.ok) {
        if (response.status >= 500) {
          setErroEnvio(`O servidor retornou erro ${response.status} e não foi possível confirmar a matrícula. Consulte a secretaria antes de tentar novamente.`);
          return;
        }
        let mensagem = `Não foi possível enviar a matrícula (erro ${response.status}).`;
        try {
          const body: unknown = await response.json();
          if (typeof body === "object" && body !== null && "message" in body) {
            const detail = body.message;
            if (typeof detail === "string") mensagem = detail;
            else if (Array.isArray(detail) && detail.every((item) => typeof item === "string")) mensagem = detail.join(" ");
          }
        } catch {
          // A resposta pode não conter JSON.
        }
        setErroEnvio(mensagem);
        return;
      }
      const resultado = matriculaCriadaSchema.safeParse(await response.json());
      if (!resultado.success) {
        setErroEnvio("A solicitação pode ter sido registrada, mas a resposta não contém um número válido. Consulte a secretaria antes de tentar novamente.");
        return;
      }
      setNumeroMatricula(resultado.data.id);
    } catch {
      setErroEnvio("Não foi possível confirmar o envio. A matrícula pode ter sido registrada; consulte a secretaria antes de tentar novamente.");
    } finally {
      enviandoRef.current = false;
    }
  }

  function mostrarErrosFormulario(formErrors: FieldErrors<FormValues>) {
    const etapaComErro = camposPorEtapa.findIndex((campos) => campos.some((campo) => formErrors[campo]));
    if (etapaComErro >= 0) setEtapa(etapaComErro);
  }

  const dados = getValues();
  const inputError = (name: keyof FormValues) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });

  if (numeroMatricula) {
    return (
      <MainLayout>
        <section className="bg-gradient-to-br from-background via-muted/30 to-sage-light/20 px-4 py-16">
          <Card variant="elevated" className="mx-auto max-w-lg text-center">
            <CardHeader>
              <Check className="mx-auto mb-4 h-12 w-12 text-primary" aria-hidden="true" />
              <CardTitle>Matrícula enviada</CardTitle>
              <CardDescription>Sua solicitação foi registrada e está pendente de análise.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p role="status">Número da matrícula: <strong className="font-mono">{numeroMatricula}</strong></p>
              <p className="text-sm text-muted-foreground">Guarde esse número. Apenas os nomes dos documentos foram registrados; os arquivos não foram enviados.</p>
              <Button asChild><Link to="/">Voltar à Home</Link></Button>
            </CardContent>
          </Card>
        </section>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <section className="bg-gradient-to-br from-background via-muted/30 to-sage-light/20 py-10 md:py-16">
        <div className="container max-w-4xl px-4 md:px-6">
          <div className="mb-8 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Catequese Bom Pastor</p>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Matrícula na Catequese</h1>
            <p className="mt-3 text-muted-foreground">Para matricular uma criança, preencha as informações em quatro etapas. Para rematricular uma criança já cadastrada, <Link to="/login" className="text-primary underline">entre na área dos pais</Link>.</p>
          </div>
          <div className="mb-6 rounded-lg border border-gold/40 bg-gold-light/30 p-4 text-sm" role="note">
            A matrícula e os nomes dos documentos serão registrados. Os arquivos não serão enviados nem armazenados; consulte a secretaria sobre a entrega dos documentos.
          </div>
          <ol aria-label="Etapas da matrícula" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {etapas.map((titulo, index) => (
              <li key={titulo} aria-current={index === etapa ? "step" : undefined} className="flex items-center gap-2 text-sm">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-semibold ${index <= etapa ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {index < etapa ? <Check className="h-4 w-4" aria-label="Concluída" /> : index + 1}
                </span>
                <span className={index === etapa ? "font-semibold text-foreground" : "text-muted-foreground"}>{titulo}</span>
              </li>
            ))}
          </ol>
          <Card variant="elevated" className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle>{etapas[etapa]}</CardTitle>
              <CardDescription>
                {etapa === 0 && "Informe os dados do responsável. Campos marcados com * são obrigatórios."}
                {etapa === 1 && "Informe os dados do catequizando. Campos marcados com * são obrigatórios."}
                {etapa === 2 && "Certidão de Nascimento e Comprovante de Residência são obrigatórios. O Certificado de Batismo é opcional."}
                {etapa === 3 && "Confira as informações antes de enviar a matrícula."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form noValidate onSubmit={handleSubmit(enviarMatricula, mostrarErrosFormulario)} className="space-y-6">
                {erroEnvio && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{erroEnvio}</p>}
                {etapa === 0 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Campo id="nomeResponsavel" label="Nome Completo *" error={errors.nomeResponsavel?.message}><Input id="nomeResponsavel" autoComplete="name" {...register("nomeResponsavel")} {...inputError("nomeResponsavel")} /></Campo></div>
                    <Campo id="cpf" label="CPF *" error={errors.cpf?.message}><Input id="cpf" inputMode="numeric" {...register("cpf")} {...inputError("cpf")} /></Campo>
                    <Campo id="nascimentoResponsavel" label="Data de Nascimento *" error={errors.nascimentoResponsavel?.message}><Input id="nascimentoResponsavel" type="date" {...register("nascimentoResponsavel")} {...inputError("nascimentoResponsavel")} /></Campo>
                    <Campo id="telefone" label="Telefone *" error={errors.telefone?.message}><Input id="telefone" type="tel" autoComplete="tel" {...register("telefone")} {...inputError("telefone")} /></Campo>
                    <div className="space-y-3">
                      <Campo id="whatsapp" label="WhatsApp *" error={errors.whatsapp?.message}><Input id="whatsapp" type="tel" readOnly={usarMesmoTelefone} {...register("whatsapp")} {...inputError("whatsapp")} /></Campo>
                      <div className="flex items-center gap-2"><Checkbox id="mesmoTelefone" checked={usarMesmoTelefone} onCheckedChange={(checked) => setUsarMesmoTelefone(checked === true)} /><Label htmlFor="mesmoTelefone" className="font-normal">Usar o telefone informado</Label></div>
                    </div>
                    <Campo id="email" label="E-mail *" error={errors.email?.message}><Input id="email" type="email" autoComplete="email" {...register("email")} {...inputError("email")} /></Campo>
                    <Campo id="parentesco" label="Parentesco *" error={errors.parentesco?.message}><Input id="parentesco" {...register("parentesco")} {...inputError("parentesco")} /></Campo>
                  </div>
                )}
                {etapa === 1 && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Campo id="nomeCatequizando" label="Nome Completo *" error={errors.nomeCatequizando?.message}><Input id="nomeCatequizando" {...register("nomeCatequizando")} {...inputError("nomeCatequizando")} /></Campo></div>
                    <Campo id="nascimentoCatequizando" label="Data de Nascimento *" error={errors.nascimentoCatequizando?.message}><Input id="nascimentoCatequizando" type="date" {...register("nascimentoCatequizando")} {...inputError("nascimentoCatequizando")} /></Campo>
                    <Campo id="telefoneEmergencia" label="Telefone de Emergência *" error={errors.telefoneEmergencia?.message}><Input id="telefoneEmergencia" type="tel" {...register("telefoneEmergencia")} {...inputError("telefoneEmergencia")} /></Campo>
                    <div className="sm:col-span-2"><Campo id="endereco" label="Endereço *" error={errors.endereco?.message}><Input id="endereco" autoComplete="street-address" {...register("endereco")} {...inputError("endereco")} /></Campo></div>
                    <div className="sm:col-span-2">
                      <Campo id="nivelCatequetico" label="Nível Catequético *" error={errors.nivelCatequetico?.message}>
                        <Controller name="nivelCatequetico" control={control} render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange} disabled={carregandoNiveis || !!erroNiveis || niveis.length === 0}>
                            <SelectTrigger id="nivelCatequetico" ref={field.ref} onBlur={field.onBlur} {...inputError("nivelCatequetico")}><SelectValue placeholder={carregandoNiveis ? "Carregando níveis..." : "Selecione um nível"} /></SelectTrigger>
                            <SelectContent>{niveis.map((nivel) => <SelectItem key={nivel.id} value={nivel.id}>{nivel.nome}</SelectItem>)}</SelectContent>
                          </Select>
                        )} />
                      </Campo>
                      {erroNiveis && <div role="alert" className="mt-2 text-sm text-destructive">{erroNiveis} <Button type="button" variant="link" onClick={() => setTentativaNiveis((atual) => atual + 1)}>Tentar novamente</Button></div>}
                      {!carregandoNiveis && !erroNiveis && niveis.length === 0 && <p role="status" className="mt-2 text-sm text-muted-foreground">Não há níveis disponíveis para matrícula no momento.</p>}
                    </div>
                    <div className="sm:col-span-2"><Campo id="observacoes" label="Observações" error={errors.observacoes?.message}><Textarea id="observacoes" rows={4} {...register("observacoes")} {...inputError("observacoes")} /></Campo></div>
                  </div>
                )}
                  <div hidden={etapa !== 2} className={etapa === 2 ? "grid gap-4 sm:grid-cols-2" : undefined}>
                    {documentos.map(({ key, label, obrigatorio }) => (
                      <Card key={key} variant="flat" className="border border-border bg-muted/20">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex items-center gap-2 font-medium"><FileText className="h-5 w-5 text-primary" /><Label htmlFor={`documento-${key}`}>{label}{obrigatorio ? " *" : " (opcional)"}</Label></div>
                          <Input id={`documento-${key}`} type="file" onChange={(event) => {
                            const nome = event.target.files?.[0]?.name ?? "";
                            setArquivos((atuais) => ({ ...atuais, [key]: nome }));
                            setErroDocumentos(nome.length > 255 ? "O nome do arquivo deve ter no máximo 255 caracteres." : "");
                          }} />
                          <p className="break-all text-sm text-muted-foreground">{arquivos[key] ? `Selecionado: ${arquivos[key]}` : "Nenhum arquivo selecionado"}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                {etapa === 2 && erroDocumentos && <p role="alert" className="text-sm text-destructive">{erroDocumentos}</p>}
                {etapa === 3 && (
                  <div className="space-y-6">
                    <section className="space-y-4 rounded-lg border p-4"><h2 className="font-display text-xl font-semibold">Responsável</h2><Resumo items={[
                      { label: "Nome completo", value: dados.nomeResponsavel }, { label: "CPF", value: dados.cpf },
                      { label: "Data de nascimento", value: formatarData(dados.nascimentoResponsavel) },
                      { label: "Telefone", value: dados.telefone }, { label: "WhatsApp", value: dados.whatsapp },
                      { label: "E-mail", value: dados.email }, { label: "Parentesco", value: dados.parentesco },
                    ]} /></section>
                    <section className="space-y-4 rounded-lg border p-4"><h2 className="font-display text-xl font-semibold">Catequizando</h2><Resumo items={[
                      { label: "Nome completo", value: dados.nomeCatequizando }, { label: "Data de nascimento", value: formatarData(dados.nascimentoCatequizando) },
                      { label: "Endereço", value: dados.endereco }, { label: "Telefone de emergência", value: dados.telefoneEmergencia },
                      { label: "Nível catequético", value: niveis.find((nivel) => nivel.id === dados.nivelCatequetico)?.nome ?? "" }, { label: "Observações", value: dados.observacoes },
                    ]} /></section>
                    <section className="space-y-4 rounded-lg border p-4"><h2 className="font-display text-xl font-semibold">Documentos</h2><Resumo items={documentos.map(({ key, label, obrigatorio }) => ({ label: obrigatorio ? label : `${label} (opcional)`, value: arquivos[key] || "Não selecionado" }))} /></section>
                  </div>
                )}
                <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-between">
                  {etapa > 0 ? <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setEtapa((atual) => atual - 1)}><ArrowLeft /> Voltar</Button> : <Button type="button" variant="ghost" asChild><Link to="/">Voltar à Home</Link></Button>}
                  {etapa < 3 ? <Button key="next" type="button" onClick={proximaEtapa}>Próximo <ArrowRight /></Button> : <Button key="submit" type="submit" disabled={isSubmitting}><Upload /> {isSubmitting ? "Enviando..." : "Enviar Matrícula"}</Button>}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </MainLayout>
  );
}
