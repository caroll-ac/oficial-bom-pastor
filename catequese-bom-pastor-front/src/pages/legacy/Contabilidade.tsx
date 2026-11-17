import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Calendar,
  ClipboardList,
  Cross,
  DollarSign,
  Gift,
  GraduationCap,
  LogOut,
  Menu,
  Music,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { ADMIN_NAV_ITEMS } from "@/lib/sidebarNavItems";
import { Link, useLocation } from "react-router-dom";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";

type Sale = { id: string; product: string; qty: number; price: number };
type Purchase = { id: string; item: string; qty: number; cost: number };
type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  isActive: boolean;
};

type ReservaItem = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
};

type ReservaLojinha = {
  id: string;
  status: string;
  total: number;
  criadoEm: string;
  retiradaAte: string;
  comprovantePagamentoUrl: string | null;
  responsavel: {
    id: string;
    nome: string;
    email: string;
    telefone: string | null;
  };
  itens: ReservaItem[];
};

const Contabilidade = () => {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  // Estado do Catálogo de Produtos da Loja
  const [products, setProducts] = useState<Product[]>([
    { id: "PROD-001", name: "Camiseta da Catequese", category: "Vestuário", price: 45.0, stock: 15, isActive: true },
    { id: "PROD-002", name: "Terço Infantil", category: "Artigos Religiosos", price: 15.0, stock: 40, isActive: true },
    { id: "PROD-003", name: "Caneca Personalizada", category: "Lembranças", price: 30.0, stock: 0, isActive: true },
    { id: "PROD-004", name: "Bíblia Sagrada Jovem", category: "Livros", price: 60.0, stock: 5, isActive: false },
  ]);

  const [reservas, setReservas] = useState<ReservaLojinha[]>([]);
  const [reservasLoading, setReservasLoading] = useState(false);

  // Histórico de Vendas
  const [sales, setSales] = useState<Sale[]>([
    { id: "S-001", product: "Camiseta", qty: 2, price: 45 },
    { id: "S-002", product: "Terço Infantil", qty: 3, price: 15 },
    { id: "S-003", product: "Caneca", qty: 1, price: 30 },
  ]);

  // Compras previstas
  const [purchases, setPurchases] = useState<Purchase[]>([
    { id: "P-001", item: "Bíblias", qty: 5, cost: 40 },
    { id: "P-002", item: "Material Escolar", qty: 20, cost: 3 },
  ]);

  // --- Funções de Gerenciamento de Produtos ---
  const handleAddProduct = () => {
    setProducts((prev) => [
      ...prev,
      {
        id: `PROD-${String(prev.length + 1).padStart(3, "0")}`,
        name: "Novo Produto",
        category: "Geral",
        price: 0,
        stock: 0,
        isActive: true,
      },
    ]);
  };

  const handleUpdateProduct = (id: string, field: keyof Product, value: any) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleToggleActive = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p))
    );
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm("Tem certeza que deseja excluir permanentemente este produto do catálogo?")) {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const handleSaveChanges = () => {
    alert("Alterações do catálogo salvas com sucesso!");
  };

  // --- Cálculos Financeiros ---
  const totalRevenue = useMemo(
    () => sales.reduce((acc, s) => acc + s.qty * s.price, 0),
    [sales]
  );

  const totalPlanned = useMemo(
    () => purchases.reduce((acc, p) => acc + p.qty * p.cost, 0),
    [purchases]
  );

  const balance = useMemo(
    () => totalRevenue - totalPlanned,
    [totalRevenue, totalPlanned]
  );

  const transactions = [
    { id: 1, date: "2024-01-15", description: "Materiais didáticos", type: "despesa", value: 150.00, category: "Material" },
    { id: 2, date: "2024-01-10", description: "Mensalidade - Turma A", type: "receita", value: 450.00, category: "Mensalidade" },
    { id: 3, date: "2024-01-08", description: "Instrumentos musicais", type: "despesa", value: 300.00, category: "Música" },
    { id: 4, date: "2024-01-05", description: "Mensalidade - Turma B", type: "receita", value: 400.00, category: "Mensalidade" },
    { id: 5, date: "2024-01-03", description: "Lanche para evento", type: "despesa", value: 80.00, category: "Eventos" },
  ];

  const totalReceitas = transactions
    .filter(t => t.type === "receita")
    .reduce((sum, t) => sum + t.value, 0);

  const totalDespesas = transactions
    .filter(t => t.type === "despesa")
    .reduce((sum, t) => sum + t.value, 0);

  const saldo = totalReceitas - totalDespesas;

  const totalItemsVendidos = useMemo(
    () => sales.reduce((acc, s) => acc + s.qty, 0),
    [sales]
  );

  const totalItemsCadastrados = products.length;

  useEffect(() => {
    const loadReservas = async () => {
      setReservasLoading(true);
      try {
        const response = await api.get((API_ROUTES as any).lojinhaReservasAdmin || "/api/loja/itens/reservas");

        if (!response.ok) {
          throw new Error("Falha ao carregar reservas");
        }

        const data = await response.json();
        setReservas(Array.isArray(data) ? data : data.reservas || []);
      } catch (error) {
        console.error("Erro ao carregar reservas da lojinha:", error);
      } finally {
        setReservasLoading(false);
      }
    };

    loadReservas();
  }, []);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("pt-BR").format(new Date(value));

  const handleConfirmarCompra = async (id: string) => {
    try {
      const response = await api.patch(`/api/loja/itens/reservas/${id}/confirmar`);
      if (!response.ok) {
        throw new Error("Não foi possível confirmar a compra.");
      }
      setReservas((prev) => prev.map((reserva) =>
        reserva.id === id ? { ...reserva, status: "confirmada" } : reserva
      ));
    } catch (error) {
      console.error("Erro ao confirmar compra da lojinha:", error);
    }
  };

  return (
    <div className={`flex min-h-screen bg-background transition-[padding] duration-300 ${sidebarOpen ? "lg:pl-64" : "lg:pl-0"}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform overflow-hidden border-r bg-card transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } `}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between border-b px-3 lg:px-4">
            <Link to="/" className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Cross className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold">
                Catequese
              </span>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <SidebarUser />

          <SidebarNav items={ADMIN_NAV_ITEMS} pathname={location.pathname} />

          <div className="border-t p-3 lg:p-4">
            <Button
              variant="nav"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-4 w-4" />
              <span>
                Sair
              </span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4">
          <Button
            variant="ghost"
            size="icon"
            className={sidebarOpen ? "lg:hidden" : ""}
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-display text-lg font-semibold">
            Contabilidade
          </span>
          <div className="w-10" />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Tabs defaultValue="geral" className="space-y-6">
            <TabsList>
              <TabsTrigger value="geral">Visão Geral</TabsTrigger>
              <TabsTrigger value="lojinha">Gerenciar Loja</TabsTrigger>
              <TabsTrigger value="compras">Compras Previstas</TabsTrigger>
            </TabsList>

            {/* Tab: Visão Geral */}
            <TabsContent value="geral" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      R$ {totalReceitas.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mensalidades e outras entradas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      R$ {totalDespesas.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Materiais, eventos e outras saídas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      R$ {saldo.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Saldo atual
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ShoppingCart className="h-5 w-5" /> Vendas Lojinha
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{totalItemsVendidos}</p>
                    <p className="text-sm text-muted-foreground">Itens vendidos histórico</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <DollarSign className="h-5 w-5" /> Receita Lojinha
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      R$ {totalRevenue.toFixed(2).replace(".", ",")}
                    </p>
                    <p className="text-sm text-muted-foreground">Total arrecadado</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Gift className="h-5 w-5" /> Compras Previstas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      R$ {totalPlanned.toFixed(2).replace(".", ",")}
                    </p>
                    <p className="text-sm text-muted-foreground">Custo planejado</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Saldo Lojinha</CardTitle>
                  <CardDescription>Receita da lojinha - Compras previstas</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    R$ {balance.toFixed(2).replace(".", ",")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Transações Recentes</CardTitle>
                      <CardDescription>
                        Histórico de receitas e despesas da catequese
                      </CardDescription>
                    </div>
                    <Button>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Nova Transação
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="font-medium">
                            {new Date(transaction.date).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>{transaction.category}</TableCell>
                          <TableCell>
                            <Badge variant={transaction.type === "receita" ? "default" : "destructive"}>
                              {transaction.type === "receita" ? "Receita" : "Despesa"}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${transaction.type === "receita" ? "text-green-600" : "text-red-600"}`}>
                            {transaction.type === "receita" ? "+" : "-"} R$ {transaction.value.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Lojinha (Painel Administrativo do Catálogo) */}
            <TabsContent value="lojinha" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Catálogo de Produtos</CardTitle>
                      <CardDescription>
                        Gerenciamento completo do inventário da lojinha da Paróquia/Catequese.
                      </CardDescription>
                    </div>
                    <Button onClick={handleAddProduct} className="w-full sm:w-auto">
                      <Plus className="mr-2 h-4 w-4" /> Adicionar Produto
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Cód.</TableHead>
                          <TableHead className="min-w-[200px]">Nome do Produto</TableHead>
                          <TableHead className="w-44">Categoria</TableHead>
                          <TableHead className="w-32">Preço (R$)</TableHead>
                          <TableHead className="w-28">Estoque</TableHead>
                          <TableHead className="w-32">Status</TableHead>
                          <TableHead className="w-28 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => {
                          let badgeVariant: "default" | "secondary" | "destructive" = "default";
                          let badgeLabel = "Ativo";

                          if (!product.isActive) {
                            badgeVariant = "secondary";
                            badgeLabel = "Inativo";
                          } else if (product.stock === 0) {
                            badgeVariant = "destructive";
                            badgeLabel = "Sem Estoque";
                          }

                          return (
                            <TableRow key={product.id} className={!product.isActive ? "opacity-60 bg-muted/20" : ""}>
                              <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                                {product.id}
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={product.name}
                                  className="h-8 border-transparent hover:border-input focus-visible:border-input"
                                  onChange={(e) => handleUpdateProduct(product.id, "name", e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={product.category}
                                  className="h-8 border-transparent hover:border-input focus-visible:border-input"
                                  onChange={(e) => handleUpdateProduct(product.id, "category", e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="relative">
                                  <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">R$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={product.price || ""}
                                    className="h-8 pl-7 border-transparent hover:border-input focus-visible:border-input"
                                    onChange={(e) => handleUpdateProduct(product.id, "price", Number(e.target.value))}
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={product.stock}
                                  className={`h-8 border-transparent hover:border-input focus-visible:border-input font-medium ${
                                    product.stock === 0 && product.isActive ? "text-destructive font-bold" : ""
                                  }`}
                                  onChange={(e) => handleUpdateProduct(product.id, "stock", Number(e.target.value))}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant={badgeVariant}>{badgeLabel}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title={product.isActive ? "Desativar Produto" : "Ativar Produto"}
                                    onClick={() => handleToggleActive(product.id)}
                                  >
                                    {product.isActive ? (
                                      <Eye className="h-4 w-4 text-amber-600" />
                                    ) : (
                                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    title="Excluir Produto"
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Button onClick={handleSaveChanges}>
                      Salvar todas as alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Compras da Lojinha</CardTitle>
                      <CardDescription>
                        Compras aguardando conferência do comprovante e confirmação.
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{reservas.length} reservas carregadas</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {reservasLoading ? (
                    <p className="text-sm text-muted-foreground">Carregando reservas...</p>
                  ) : reservas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma reserva registrada ainda.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {reservas.map((reserva) => (
                        <div key={reserva.id} className="rounded-lg border p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold">{reserva.responsavel.nome}</h3>
                                <Badge variant={reserva.status === "aguardando_confirmacao" ? "outline" : "default"}>
                                  {reserva.status}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{reserva.responsavel.email}</p>
                              <p className="text-sm text-muted-foreground">
                                Retirar até {formatDate(reserva.retiradaAte)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold">{formatCurrency(reserva.total)}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(reserva.criadoEm)}</p>
                            </div>
                          </div>

                          <div className="mt-4">
                            <p className="mb-2 text-sm font-medium">Itens</p>
                            <div className="grid gap-2 md:grid-cols-2">
                              {reserva.itens.map((item) => (
                                <div key={item.id} className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                                  <div className="font-medium">{item.nome}</div>
                                  <div className="text-muted-foreground">{formatCurrency(item.preco)}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
                            {reserva.comprovantePagamentoUrl && (
                              <a
                                href={reserva.comprovantePagamentoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm font-medium text-primary hover:underline"
                              >
                                Ver comprovante PIX
                              </a>
                            )}
                            {reserva.status !== "confirmada" && (
                              <Button size="sm" onClick={() => handleConfirmarCompra(reserva.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Confirmar compra
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Itens Totais Registrados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{totalItemsCadastrados}</p>
                    <p className="text-xs text-muted-foreground">
                      {products.filter((p) => p.isActive).length} ativos e {products.filter((p) => !p.isActive).length} desativados.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Alertas de Reposição</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-destructive">
                      {products.filter((p) => p.isActive && p.stock === 0).length}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Produtos ativos que encontram-se esgotados no momento.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Compras Previstas */}
            <TabsContent value="compras" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Compras Previstas</CardTitle>
                  <CardDescription>Materiais e itens a serem adquiridos</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Qtde</TableHead>
                        <TableHead>Custo (R$)</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map((p, idx) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <Input
                              value={p.item}
                              onChange={(e) => {
                                const v = e.target.value;
                                setPurchases((prev) =>
                                  prev.map((row, i) =>
                                    i === idx ? { ...row, item: v } : row
                                  )
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell className="w-32">
                            <Input
                              type="number"
                              value={p.qty}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setPurchases((prev) =>
                                  prev.map((row, i) =>
                                    i === idx ? { ...row, qty: v } : row
                                  )
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell className="w-40">
                            <Input
                              type="number"
                              step="0.01"
                              value={p.cost}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setPurchases((prev) =>
                                  prev.map((row, i) =>
                                    i === idx ? { ...row, cost: v } : row
                                  )
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {(p.qty * p.cost).toFixed(2).replace(".", ",")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        setPurchases((prev) => [
                          ...prev,
                          {
                            id: `P-${String(prev.length + 1).padStart(3, "0")}`,
                            item: "Novo Item",
                            qty: 1,
                            cost: 0,
                          },
                        ])
                      }
                    >
                      Adicionar compra
                    </Button>
                    <Button>Salvar alterações</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumo de Compras</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total de itens:</span>
                      <span className="font-bold">
                        {purchases.reduce((acc, p) => acc + p.qty, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custo total previsto:</span>
                      <span className="font-bold text-red-600">
                        R$ {totalPlanned.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default Contabilidade;