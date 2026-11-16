export const statusMatriculaConfig: Record<string, { label: string; className: string }> = {
  PENDENTE: { label: "Pendente", className: "border-transparent bg-gray-100 text-gray-800" },
  EM_ANALISE: { label: "Em análise", className: "border-transparent bg-blue-100 text-blue-800" },
  PENDENCIA_DOCUMENTAL: { label: "Pendência documental", className: "border-transparent bg-amber-100 text-amber-800" },
  AGUARDANDO_COORDENADOR: { label: "Aguardando coordenador", className: "border-transparent bg-blue-100 text-blue-800" },
  APROVADA: { label: "Aprovada", className: "border-transparent bg-green-100 text-green-800" },
  REJEITADA: { label: "Rejeitada", className: "border-transparent bg-red-100 text-red-800" },
};
