import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SidebarNav, type SidebarNavItem } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { Cross, LogOut, Menu } from "lucide-react";

type DashboardShellProps = {
  items: SidebarNavItem[];
  title: string;
  description: string;
  children: ReactNode;
};

export function DashboardShell({ items, title, description, children }: DashboardShellProps) {
  const location = useLocation();
  const { logout } = useAuth();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();

  return (
    <div className={`flex min-h-screen bg-background transition-[padding] duration-300 ${sidebarOpen ? "lg:pl-64" : "lg:pl-0"}`}>
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Cross className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold">Catequese</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Fechar menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <SidebarUser />
          <SidebarNav items={items} pathname={location.pathname} />
          <div className="border-t p-4">
            <Button variant="nav" className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={logout}>
              <LogOut className="mr-3 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-foreground/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b bg-card">
          <div className="flex min-h-16 items-center gap-4 px-4 py-2 pr-16">
            <Button variant="ghost" size="icon" className={sidebarOpen ? "lg:hidden" : ""} onClick={toggleSidebar} aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}