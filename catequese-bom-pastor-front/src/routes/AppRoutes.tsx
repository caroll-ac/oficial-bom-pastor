import { Navigate, Route, Routes } from "react-router-dom";
import AdminDashboard from "@/pages/legacy/AdminDashboard";
import AddCatequizando from "@/pages/legacy/AddCatequizando";
import Cronograma from "@/pages/catequista/Cronograma";
import CatechistDashboard from "@/pages/catequista/CatechistDashboard";
import Contabilidade from "@/pages/legacy/Contabilidade";
import Historico from "@/pages/legacy/Historico";
import Index from "@/pages/public/Index";
import Inscricao from "@/pages/public/Inscricao";
import Login from "@/pages/public/Login";
import EsqueciSenha from "@/pages/public/EsqueciSenha";
import Lojinha from "@/pages/legacy/Lojinha";
import Material from "@/pages/catequista/Material";
import MinhasTurmas from "@/pages/catequista/MinhasTurmas";
import Musicas from "@/pages/legacy/Musicas";
import NotFound from "@/pages/public/NotFound";
import { MeusCatequizandos } from "@/pages/public/AreaResponsavel";
import { RenovacaoAdmin, RenovacaoResponsavel, RenovacaoSecretaria } from "@/pages/public/Renovacao";
import ParentDocumentos from "@/pages/responsavel/ParentDocumentos";
import ParentCronograma from "@/pages/responsavel/ParentCronograma";
import ParentGaleria from "@/pages/responsavel/ParentGaleria";
import AdminInscricoesCatequistas from "@/pages/legacy/AdminInscricoesCatequistas";
import PrimeiroAcesso from "@/pages/public/PrimeiroAcesso";
import Sobre from "@/pages/public/Sobre";
import ProtectedRoute from "@/components/auth/protectedRoute";
import Photos from "@/pages/legacy/Photos";
import MeuPerfil from "@/pages/shared/MeuPerfil";
import AdminOverview from "@/pages/legacy/AdminOverview";
import CatechistOverview from "@/pages/catequista/CatechistOverview";
import MatriculaPage from "@/pages/public/MatriculaPage";
import MatriculaSucessoPage from "@/pages/public/MatriculaSucessoPage";
import SecretariaMatriculasPage from "@/pages/secretaria/SecretariaMatriculasPage";
import CoordenadorMatriculasPage from "@/pages/coordenador/CoordenadorMatriculasPage";

const AppRoutes = () => (
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/sobre" element={<Sobre />} />
              <Route path="/lojinha" element={<Lojinha />} />
              <Route path="/login" element={<Login />} />
              <Route path="/esqueci-senha" element={<EsqueciSenha />} />
              <Route path="/inscricao" element={<Inscricao />} />
              <Route path="/inscricao/sucesso" element={<MatriculaSucessoPage />} />
              <Route path="/matricula" element={<MatriculaPage />} />
              <Route path="/criar-senha" element={<PrimeiroAcesso />} />
              <Route path="/pre-matricula" element={<Navigate to="/matricula" replace />} />
              <Route element={<ProtectedRoute />} >
                <Route path="/perfil" element={<MeuPerfil />} />

                {/* Rotas Secretaria (sem autorização por perfil ainda) */}
                <Route path="/secretaria/matriculas" element={<SecretariaMatriculasPage />} />
                <Route path="/secretaria/renovacoes" element={<RenovacaoSecretaria />} />

                {/* Rotas Coordenador (sem autorização por perfil ainda) */}
                <Route path="/coordenador/matriculas" element={<CoordenadorMatriculasPage />} />
                <Route path="/coordenador/renovacoes" element={<RenovacaoAdmin />} />

                {/* Rotas Pais */}
                <Route path="/pais" element={<MeusCatequizandos />} />
                <Route path="/pais/renovacao" element={<RenovacaoResponsavel />} />
                <Route path="/pais/documentos" element={<ParentDocumentos />} />
                <Route path="/pais/cronograma" element={<ParentCronograma />} />
                <Route path="/pais/galeria" element={<ParentGaleria />} />

                {/* Rotas Admin */}
                <Route path="/admin" element={<AdminOverview />} />
                <Route path="/admin/renovacoes" element={<RenovacaoAdmin />} />
                <Route path="/admin/turmas" element={<AdminDashboard />} />
                <Route
                  path="/admin/add-catequizando"
                  element={
                    <AddCatequizando />
                  }
                />
                <Route path="/admin/inscricoes-catequistas" element={<AdminInscricoesCatequistas />} />
                <Route path="/admin/chamada" element={<CatechistDashboard />} />
                <Route path="/admin/minhas-turmas" element={<MinhasTurmas />} />
                <Route path="/admin/cronograma" element={<Cronograma />} />
                <Route path="/admin/material" element={<Material />} />
                <Route path="/admin/musicas" element={<Musicas />} />
                <Route path="/admin/fotos" element={<Photos />} />
                <Route path="/admin/contabilidade" element={<Contabilidade />} />
                <Route path="/admin/historico" element={<Historico />} />

                {/* Rotas Catequista */}
                <Route path="/catequista" element={<CatechistOverview />} />
                <Route path="/catequista/chamada" element={<CatechistDashboard />} />
                <Route path="/catequista/minhas-turmas" element={<MinhasTurmas />} />
                <Route path="/catequista/cronograma" element={<Cronograma />} />
                <Route path="/catequista/material" element={<Material />} />
                <Route path="/catequista/musicas" element={<Musicas />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
);

export default AppRoutes;
