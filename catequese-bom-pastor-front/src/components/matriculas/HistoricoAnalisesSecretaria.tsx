export interface AnaliseSecretaria {
  id: string;
  resultado: string;
  parecer: string;
  decididoEm: string;
  usuarioId: string;
}

const resultados: Record<string, string> = {
  DOCUMENTACAO_OK: "Documentação OK",
  PENDENCIA_DOCUMENTAL: "Pendência documental",
};

export function HistoricoAnalisesSecretaria({ analises }: { analises: AnaliseSecretaria[] }) {
  return (
    <section className="space-y-2 border-t pt-4">
      <h3 className="font-display font-semibold">Histórico de análises da Secretaria</h3>
      {analises.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma análise registrada.</p>
      ) : (
        <ul className="space-y-2">
          {analises.map((analise) => {
            const data = new Date(analise.decididoEm);
            return (
              <li key={analise.id} className="space-y-1 rounded-md border p-3 text-sm">
                <p className="font-medium">{resultados[analise.resultado] ?? analise.resultado}</p>
                <p className="text-muted-foreground">
                  {Number.isNaN(data.getTime()) ? "—" : data.toLocaleString("pt-BR")}
                </p>
                <p className="whitespace-pre-wrap break-words">{analise.parecer}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
