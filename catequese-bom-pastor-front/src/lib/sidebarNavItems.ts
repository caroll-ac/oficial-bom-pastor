import {
  BookOpen,
  Calendar,
  Camera,
  ClipboardList,
  DollarSign,
  FileText,
  Music,
  Users,
} from "lucide-react";
import type { SidebarNavItem } from "@/components/layout/SidebarNav";

export const ADMIN_NAV_ITEMS: SidebarNavItem[] = [
  { label: "Dashboard", to: "/admin", icon: Users },
  { label: "Rematrículas", to: "/admin/renovacoes", icon: ClipboardList },
  { label: "Turmas", to: "/admin/turmas", icon: Users },
  { label: "Catequizandos", to: "/admin/add-catequizando", icon: Users },
  { label: "Catequistas", to: "/admin/inscricoes-catequistas", icon: ClipboardList },
  { label: "Chamada", to: "/admin/chamada", icon: ClipboardList },
  { label: "Minhas Turmas", to: "/admin/minhas-turmas", icon: Users },
  { label: "Cronograma", to: "/admin/cronograma", icon: Calendar },
  // { label: "Material", to: "/admin/material", icon: BookOpen },
  // { label: "Músicas", to: "/admin/musicas", icon: Music },
  { label: "Fotos", to: "/admin/fotos", icon: Camera },
  { label: "Contabilidade", to: "/admin/contabilidade", icon: DollarSign },
  { label: "Histórico", to: "/admin/historico", icon: Calendar },
];

export const CATECHIST_NAV_ITEMS: SidebarNavItem[] = [
  { label: "Dashboard", to: "/catequista", icon: Users },
  { label: "Chamada", to: "/catequista/chamada", icon: ClipboardList },
  { label: "Minhas Turmas", to: "/catequista/minhas-turmas", icon: Users },
  { label: "Cronograma", to: "/catequista/cronograma", icon: Calendar },
  // { label: "Material", to: "/catequista/material", icon: BookOpen },
  // { label: "Músicas", to: "/catequista/musicas", icon: Music },
];

export const PARENT_NAV_ITEMS: SidebarNavItem[] = [
  { label: "Meus Filhos", to: "/pais", icon: Users },
  { label: "Rematrícula", to: "/pais/renovacao", icon: ClipboardList },
  { label: "Cronograma", to: "/pais/cronograma", icon: Calendar },
  { label: "Documentos", to: "/pais/documentos", icon: FileText,},
];

export const SECRETARIA_NAV_ITEMS: SidebarNavItem[] = [
  { label: "Análise de matrículas", to: "/secretaria/matriculas", icon: ClipboardList },
  { label: "Liberação de rematrícula", to: "/secretaria/renovacoes", icon: Calendar },
];

export const COORDENADOR_NAV_ITEMS: SidebarNavItem[] = [
  { label: "Aprovação de matrículas", to: "/coordenador/matriculas", icon: ClipboardList },
  { label: "Rematrículas", to: "/coordenador/renovacoes", icon: ClipboardList },
];

export function getDashboardNavItems(isAdminRoute: boolean): SidebarNavItem[] {
  return isAdminRoute ? ADMIN_NAV_ITEMS : CATECHIST_NAV_ITEMS;
}
