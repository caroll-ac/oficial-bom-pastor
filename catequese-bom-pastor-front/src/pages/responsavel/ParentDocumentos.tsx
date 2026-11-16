import { useState } from "react";
import { usePersistentSidebar } from "@/hooks/usePersistentSidebar";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { SidebarUser } from "@/components/layout/SidebarUser";
import { PARENT_NAV_ITEMS } from "@/lib/sidebarNavItems";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle,
  Cross,
  Download,
  FileText,
  LogOut,
  Menu,
  Plus,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// Mock data
const children = [
  {
    id: 1,
    name: "Maria Silva",
    level: "Nível II",
  },
  {
    id: 2,
    name: "João Silva",
    level: "Nível I",
  },
];

const requiredDocuments = [
  {
    id: 1,
    name: "Certidão de Batismo",
    description: "Documento comprobatório de batismo",
    required: true,
  },
  {
    id: 2,
    name: "RG/CPF",
    description: "Identificação da criança",
    required: true,
  },
  {
    id: 3,
    name: "Comprovante de Endereço",
    description: "Conta de água, luz ou gás",
    required: true,
  },
  {
    id: 4,
    name: "Autorização de Imagem",
    description: "Termo de consentimento para fotos",
    required: true,
  },
  {
    id: 5,
    name: "Ficha de Saúde",
    description: "Informações médicas e alergias",
    required: false,
  },
];

const uploadedDocuments = [
  {
    id: 1,
    childName: "Maria Silva",
    documentType: "Certidão de Batismo",
    uploadDate: "15/01/2025",
    status: "aprovado",
    fileName: "certidao_maria.pdf",
  },
  {
    id: 2,
    childName: "Maria Silva",
    documentType: "RG/CPF",
    uploadDate: "15/01/2025",
    status: "aprovado",
    fileName: "rg_maria.pdf",
  },
  {
    id: 3,
    childName: "João Silva",
    documentType: "Certidão de Batismo",
    uploadDate: "12/01/2025",
    status: "pendente",
    fileName: "certidao_joao.pdf",
  },
  {
    id: 4,
    childName: "João Silva",
    documentType: "Comprovante de Endereço",
    uploadDate: "14/01/2025",
    status: "rejeitado",
    reason: "Documento ilegível",
    fileName: "comprovante_joao.pdf",
  },
];

export default function ParentDocumentos() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = usePersistentSidebar();
  const location = useLocation();
  const [selectedChild, setSelectedChild] = useState<string>(
    children[0].id.toString()
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string>("");
  const { toast } = useToast();

  const handleUpload = () => {
    if (!selectedChild || !selectedDocument) {
      toast({
        title: "Erro",
        description: "Selecione a criança e o tipo de documento",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Envio indisponível",
      description: "Esta tela é uma demonstração. Nenhum documento foi enviado.",
      variant: "destructive",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aprovado":
        return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
      case "pendente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
      case "rejeitado":
        return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "aprovado":
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "pendente":
        return <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case "rejeitado":
        return <X className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return null;
    }
  };

  const childName =
    children.find((c) => c.id.toString() === selectedChild)?.name || "";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform duration-300 lg:static lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex h-16 items-center justify-between border-b px-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                <Cross className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-semibold">Catequese</span>
            </Link>
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          <SidebarUser />

          <SidebarNav items={PARENT_NAV_ITEMS} pathname={location.pathname} />

          {/* Logout */}
          <div className="border-t p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive"
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
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4">
          <div className="w-10" />
          <span className="font-display text-lg font-semibold">Documentos</span>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-background dark:to-background p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
            <div className="w-10" />
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Documentos</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Gerencie os documentos necessários para a catequese
                </p>
                <p className="mt-2 text-sm text-destructive" role="status">
                  Demonstração com dados fictícios. O envio de documentos ainda não está disponível.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna Principal */}
            <div className="lg:col-span-2 space-y-6">

              {/* Card de Documentos Enviados */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Documentos</CardTitle>
                    <CardDescription>
                      Atente-se aos status dos documentos enviados e aos faltantes!
                    </CardDescription>
                  </div>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Enviar Documento
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Enviar Novo Documento</DialogTitle>
                        <DialogDescription>
                          Preencha os dados abaixo para enviar um novo documento
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label htmlFor="child">Criança</Label>
                          <Select
                            value={selectedChild}
                            onValueChange={setSelectedChild}
                          >
                            <SelectTrigger id="child">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {children.map((child) => (
                                <SelectItem
                                  key={child.id}
                                  value={child.id.toString()}
                                >
                                  {child.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="document">Tipo de Documento</Label>
                          <Select
                            value={selectedDocument}
                            onValueChange={setSelectedDocument}
                          >
                            <SelectTrigger id="document">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {requiredDocuments.map((doc) => (
                                <SelectItem
                                  key={doc.id}
                                  value={doc.id.toString()}
                                >
                                  {doc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="file">Arquivo</Label>
                          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-primary transition cursor-pointer">
                            <Upload className="h-8 w-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Clique ou arraste um arquivo
                            </p>
                            <Input
                              id="file"
                              type="file"
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                            />
                          </div>
                        </div>

                        <Button
                          onClick={handleUpload}
                          className="w-full gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Enviar Documento
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {uploadedDocuments.length > 0 ? (
                    <div className="space-y-3">
                      {uploadedDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-start justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                        >
                          <div className="flex items-start gap-4 flex-1">
                            <FileText className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-900 dark:text-slate-100">
                                {doc.documentType}
                              </h4>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {doc.childName}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                                Enviado em {doc.uploadDate}
                              </p>
                              {doc.status === "rejeitado" && (
                                <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Motivo: {doc.reason}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(doc.status)}
                              <Badge className={getStatusColor(doc.status)}>
                                {doc.status === "aprovado" && "Aprovado"}
                                {doc.status === "pendente" && "Pendente"}
                                {doc.status === "rejeitado" && "Rejeitado"}
                              </Badge>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-600 dark:text-slate-400">
                        Nenhum documento enviado ainda
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Card de Status Geral */}
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Status Geral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {children.map((child) => {
                      const childDocs = uploadedDocuments.filter(
                        (d) => d.childName === child.name
                      );
                      const approved = childDocs.filter(
                        (d) => d.status === "aprovado"
                      ).length;
                      const total = requiredDocuments.filter(
                        (d) => d.required
                      ).length;
                      const percentage = Math.round(
                        (approved / total) * 100
                      );

                      return (
                        <div
                          key={child.id}
                          className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">
                              {child.name}
                            </h4>
                            <Badge variant="outline">{approved}/{total}</Badge>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                            {percentage}% completo
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Card de Informações */}
              <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2 text-blue-900 dark:text-blue-300">
                    <AlertCircle className="h-4 w-4" />
                    Importante
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-blue-800 dark:text-blue-300">
                  <ul className="space-y-2">
                    <li>• Documentos em PDF, JPG ou PNG</li>
                    <li>• Tamanho máximo: 5MB</li>
                    <li>• Envie documentos legíveis</li>
                    <li>
                      • Processamento em até 48 horas
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}