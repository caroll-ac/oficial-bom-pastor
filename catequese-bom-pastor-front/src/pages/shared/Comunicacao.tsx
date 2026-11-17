import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useMensagens } from "@/hooks/useMensagens";
import { SendMessageDialog } from "@/components/comunicacao/SendMessageDialog";
import { useAuth } from "@/contexts/AuthContext";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { ADMIN_NAV_ITEMS, CATECHIST_NAV_ITEMS, PARENT_NAV_ITEMS } from "@/lib/sidebarNavItems";
import { Link, useLocation } from "react-router-dom";
import {
  Cross,
  Mail,
  MailOpen,
  LogOut,
  Menu,
  Send,
  MessageSquare,
  Loader2,
  Inbox,
  RefreshCw,
} from "lucide-react";

export default function Comunicacao() {
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const activeRole = user?.role ?? role;
  const navigationItems = activeRole === "admin"
    ? ADMIN_NAV_ITEMS
    : activeRole === "catequista"
      ? CATECHIST_NAV_ITEMS
      : activeRole === "responsavel"
        ? PARENT_NAV_ITEMS
        : [];
  const {
    mensagens,
    total,
    page,
    totalPages,
    loading,
    error,
    unreadCount,
    loadMessages,
    markAsRead,
  } = useMensagens();

  const handleSendSuccess = () => {
    loadMessages();
  };

  const handleMessageClick = async (msg: any) => {
    if (!msg.lida) {
      await markAsRead([msg.id]);
    }
  };

  return (
    <div className={`flex min-h-screen bg-background transition-[padding] duration-300 ${sidebarOpen ? "lg:pl-64" : "lg:pl-0"}`}>
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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
          <SidebarNav items={navigationItems} pathname={location.pathname} />
          <div className="border-t p-4">
            <Button
              variant="nav"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={logout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b bg-card">
          <div className="flex h-16 items-center gap-4 px-4">
            <Button
              variant="ghost"
              size="icon"
              className={sidebarOpen ? "lg:hidden" : ""}
              onClick={toggleSidebar}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-semibold">Comunicação</span>
          </div>
        </header>

    <div className="container mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Comunicação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie suas mensagens e comunicações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadMessages()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button onClick={() => setIsSendDialogOpen(true)}>
            <Send className="h-4 w-4 mr-2" />
            Nova Mensagem
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Mensagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Não Lidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Página Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {page} / {totalPages}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Histórico de Mensagens
          </CardTitle>
          <CardDescription>
            {total > 0
              ? `Exibindo mensagens recebidas e enviadas`
              : "Nenhuma mensagem encontrada"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadMessages()}
                className="mt-4"
              >
                Tentar novamente
              </Button>
            </div>
          ) : mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">Nenhuma mensagem</p>
              <p className="text-sm mb-4">
                Você ainda não possui mensagens. Clique em "Nova Mensagem" para
                iniciar uma conversa.
              </p>
              <Button onClick={() => setIsSendDialogOpen(true)}>
                <Send className="h-4 w-4 mr-2" />
                Enviar Mensagem
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {mensagens.map((msg) => (
                <button
                  key={msg.id}
                  onClick={() => handleMessageClick(msg)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors hover:bg-muted/50 ${
                    !msg.lida ? "border-primary/30 bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {msg.lida ? (
                          <MailOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                        <span
                          className={`text-sm truncate ${
                            !msg.lida ? "font-semibold" : ""
                          }`}
                        >
                          {msg.assunto}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate ml-6">
                        De: {msg.remetente}
                      </p>
                      <p className="text-xs text-muted-foreground ml-6">
                        Para: {Array.isArray(msg.destinatarios) ? msg.destinatarios.join(", ") : msg.destinatarios}
                      </p>
                      <p className="text-sm mt-1 ml-6 line-clamp-2">
                        {msg.conteudo}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <Badge
                        variant={msg.lida ? "secondary" : "default"}
                        className="text-[10px]"
                      >
                        {msg.lida ? "Lida" : "Nova"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {new Date(msg.criadoEm).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => page > 1 && loadMessages(page - 1)}
                      className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => {
                      const items = [];
                      if (idx > 0 && arr[idx - 1] !== p - 1) {
                        items.push(
                          <PaginationItem key={`ellipsis-${p}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        );
                      }
                      items.push(
                        <PaginationItem key={p}>
                          <PaginationLink
                            isActive={p === page}
                            onClick={() => loadMessages(p)}
                            className="cursor-pointer"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                      return items;
                    })}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => page < totalPages && loadMessages(page + 1)}
                      className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <SendMessageDialog
        isOpen={isSendDialogOpen}
        onClose={() => setIsSendDialogOpen(false)}
        onSuccess={handleSendSuccess}
      />
    </div>
      </main>
    </div>
  );
}