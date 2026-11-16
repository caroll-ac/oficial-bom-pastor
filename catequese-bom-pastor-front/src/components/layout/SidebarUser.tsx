import { User } from "lucide-react";
import { useAuth, type UserRole } from "@/contexts/AuthContext";

const roleLabels: Record<UserRole, string> = {
  admin: "Administrador",
  secretaria: "Secretaria",
  coordenador: "Coordenador",
  responsavel: "Responsável",
  catequista: "Catequista",
};

export function SidebarUser() {
  const { user, role } = useAuth();

  return (
    <div className="border-b p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-light">
          <User className="h-5 w-5 text-sage-dark" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          {user?.nome && <p className="break-words font-medium">{user.nome}</p>}
          {role && <p className="text-sm text-muted-foreground">{roleLabels[role]}</p>}
        </div>
      </div>
    </div>
  );
}
