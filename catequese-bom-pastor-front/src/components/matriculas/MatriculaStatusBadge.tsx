import { Badge } from "@/components/ui/badge";
import { statusMatriculaConfig } from "@/lib/matriculaStatus";
import { cn } from "@/lib/utils";

export function MatriculaStatusBadge({ status }: { status: string }) {
  const config = statusMatriculaConfig[status] ?? {
    label: status,
    className: "border-transparent bg-gray-100 text-gray-800",
  };
  return <Badge className={cn("whitespace-nowrap", config.className)}>{config.label}</Badge>;
}
