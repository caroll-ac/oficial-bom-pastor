import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Archive,
  BookOpen,
  Calendar,
  ClipboardList,
  Cross,
  DollarSign,
  Folder,
  FolderOpen,
  LogOut,
  Menu,
  Music,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { ADMIN_NAV_ITEMS } from "@/lib/sidebarNavItems";
import { Link, useLocation } from "react-router-dom";

// Mock data for historical records
const historicalData = [
  {
    year: 2024,
    turmas: [
      {
        id: 1,
        nome: "Turma A - Nível 1",
        nivel: 1,
        catequista: "Maria Silva",
        catequizandosCount: 12,
        catequizandos: [
          { id: 1, nome: "Ana Carolina Souza", dataNascimento: "2015-03-22" },
          { id: 2, nome: "Bruno Santos Lima", dataNascimento: "2015-07-15" },
          { id: 3, nome: "Clara Oliveira", dataNascimento: "2015-11-08" },
        ],
      },
      {
        id: 2,
        nome: "Turma B - Nível 1",
        nivel: 1,
        catequista: "João Pedro",
        catequizandosCount: 10,
        catequizandos: [
          { id: 4, nome: "Daniel Pereira", dataNascimento: "2016-01-20" },
          { id: 5, nome: "Elena Maria Costa", dataNascimento: "2015-05-10" },
        ],
      },
      {
        id: 3,
        nome: "Turma A - Nível 2",
        nivel: 2,
        catequista: "Fernanda Costa",
        catequizandosCount: 8,
        catequizandos: [
          { id: 6, nome: "Felipe Martins", dataNascimento: "2014-09-05" },
        ],
      },
    ],
  },
  {
    year: 2023,
    turmas: [
      {
        id: 4,
        nome: "Turma A - Nível 1",
        nivel: 1,
        catequista: "Maria Silva",
        catequizandosCount: 15,
        catequizandos: [
          { id: 7, nome: "Gabriela Santos", dataNascimento: "2014-02-14" },
          { id: 8, nome: "Henrique Gomes", dataNascimento: "2014-08-30" },
        ],
      },
      {
        id: 5,
        nome: "Turma B - Nível 1",
        nivel: 1,
        catequista: "Carlos Mendes",
        catequizandosCount: 12,
        catequizandos: [
          { id: 9, nome: "Iris Ferreira", dataNascimento: "2014-06-18" },
        ],
      },
      {
        id: 6,
        nome: "Turma A - Nível 2",
        nivel: 2,
        catequista: "Beatriz Rocha",
        catequizandosCount: 10,
        catequizandos: [
          { id: 10, nome: "João Oliveira", dataNascimento: "2013-04-25" },
          { id: 11, nome: "Karen Lima", dataNascimento: "2013-10-12" },
        ],
      },
      {
        id: 7,
        nome: "Turma B - Nível 2",
        nivel: 2,
        catequista: "Fernanda Costa",
        catequizandosCount: 9,
        catequizandos: [
          { id: 12, nome: "Lucas Alves", dataNascimento: "2013-07-08" },
        ],
      },
    ],
  },
  {
    year: 2022,
    turmas: [
      {
        id: 8,
        nome: "Turma A - Nível 1",
        nivel: 1,
        catequista: "Maria Silva",
        catequizandosCount: 13,
        catequizandos: [
          { id: 13, nome: "Mariana Castro", dataNascimento: "2013-01-19" },
        ],
      },
      {
        id: 9,
        nome: "Turma B - Nível 1",
        nivel: 1,
        catequista: "João Pedro",
        catequizandosCount: 11,
        catequizandos: [
          { id: 14, nome: "Nathalia Barbosa", dataNascimento: "2013-05-03" },
        ],
      },
    ],
  },
];

export default function Historico() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const location = useLocation();

  const isAdminRoute = location.pathname.startsWith("/admin");
  const baseRoute = isAdminRoute ? "/admin" : "/catequista";

  const getColorByLevel = (level: number) => {
    switch (level) {
      case 1:
        return "bg-sage-light dark:bg-sage-dark/20 text-sage-dark dark:text-sage-light";
      case 2:
        return "bg-gold-light dark:bg-gold-dark/20 text-gold-dark dark:text-gold-light";
      case 3:
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className={`flex min-h-screen bg-background transition-[padding] duration-300 ${sidebarOpen ? "lg:pl-64" : "lg:pl-0"}`}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card text-card-foreground transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } `}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Cross className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold">
                Catequese
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <SidebarUser />

          <SidebarNav items={ADMIN_NAV_ITEMS} pathname={location.pathname} />

          {/* Logout */}
          <div className="border-t p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:bg-destructive/10"
              asChild
            >
              <Link to="/">
                <LogOut className="mr-3 h-4 w-4" />
                Sair
              </Link>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card text-card-foreground px-4">
          <Button
            variant="ghost"
            size="icon"
            className={sidebarOpen ? "lg:hidden" : ""}
            onClick={toggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-display text-lg font-semibold">Histórico</span>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
              {/* Header */}
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  Histórico de Turmas e Catequizandos
                </h1>
                <p className="text-muted-foreground">
                  Acompanhe o histórico de todas as turmas separadas por ano
                </p>
              </div>

              {/* Pastas por Ano */}
              <div className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  {historicalData.map((yearData) => (
                    <AccordionItem key={yearData.year} value={`year-${yearData.year}`} className="border rounded-lg px-4 bg-card text-card-foreground mb-2">
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3">
                          <Folder className="h-5 w-5 text-yellow-500 dark:text-yellow-600" />
                          <span className="text-lg font-semibold">Ano {yearData.year}</span>
                          <Badge variant="secondary">{yearData.turmas.length} turmas</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-4 pt-2 md:pl-4">
                          {/* Accordion aninhado para Turmas */}
                          <Accordion type="single" collapsible className="w-full">
                            {yearData.turmas.map((turma) => (
                              <AccordionItem key={turma.id} value={`turma-${turma.id}`} className="border-none">
                                <AccordionTrigger className="hover:no-underline py-3 px-3 rounded-lg hover:bg-muted/50">
                                  <div className="flex flex-wrap items-center gap-3 w-full text-left">
                                    <Folder className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" />
                                    <span className="font-medium text-foreground">{turma.nome}</span>
                                    <Badge className={getColorByLevel(turma.nivel)}>
                                      Nível {turma.nivel}
                                    </Badge>
                                    <Badge variant="outline" className="ml-auto sm:inline-flex hidden">
                                      {turma.catequizandosCount} catequizandos
                                    </Badge>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-3">
                                  <div className="space-y-3 pt-4">
                                    <div className="text-sm">
                                      <p className="font-medium text-foreground">
                                        Catequista: <span className="font-normal text-muted-foreground">{turma.catequista}</span>
                                      </p>
                                    </div>

                                    {/* Tabela de Catequizandos */}
                                    <div className="border rounded-lg overflow-hidden bg-card">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-muted/50">
                                            <TableHead className="w-[80px]">ID</TableHead>
                                            <TableHead>Nome do Catequizando</TableHead>
                                            <TableHead>Data de Nascimento</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {turma.catequizandos.map((catequizando) => (
                                            <TableRow key={catequizando.id}>
                                              <TableCell className="font-medium">
                                                {catequizando.id}
                                              </TableCell>
                                              <TableCell className="text-foreground">{catequizando.nome}</TableCell>
                                              <TableCell className="text-muted-foreground">
                                                {new Date(
                                                  catequizando.dataNascimento
                                                ).toLocaleDateString("pt-BR")}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}