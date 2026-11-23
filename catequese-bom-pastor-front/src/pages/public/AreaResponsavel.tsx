import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { API_ROUTES } from "@/lib/routes";
import { PARENT_NAV_ITEMS } from "@/lib/sidebarNavItems";

type Child = { id: string; nome: string; turma: string | null };
type Event = { id: string; titulo: string; data: string; horaInicio: string | null; local: string | null; turma: { nome: string } | null };
type Photo = { id: string; title: string; description: string | null; imageUrl: string };

export function MeusCatequizandos() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api.get(`${API_ROUTES.renovacoes}/me`).then(async (response) => {
      if (!response.ok) throw new Error("Não foi possível carregar os catequizandos.");
      const data: { catequizandos: Child[] } = await response.json();
      setChildren(data.catequizandos);
    }).catch((err: unknown) => setError(err instanceof Error ? err.message : "Falha de conexão."))
      .finally(() => setLoading(false));
  }, []);
  return <DashboardShell items={PARENT_NAV_ITEMS} title="Meus catequizandos" description="Acompanhe seus catequizandos cadastrados.">
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {loading ? <p>Carregando...</p> : !error && children.length === 0 ? <p>Nenhum catequizando cadastrado. Entre em contato com a coordenação.</p> :
      children.map((child) => <Card key={child.id}><CardHeader><CardTitle>{child.nome}</CardTitle></CardHeader>
        <CardContent>Turma: {child.turma || "Ainda não alocado"}</CardContent></Card>)}
    <Button asChild><Link to="/pais/renovacao">Solicitar ou acompanhar rematrícula</Link></Button>
  </DashboardShell>;
}

export function CronogramaResponsavel() {
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get(API_ROUTES.cronogramaEventos).then(async (response) => {
      if (!response.ok) throw new Error("Não foi possível carregar o cronograma.");
      const data: { eventos: Event[] } = await response.json();
      setEvents(data.eventos);
    }).catch((err: unknown) => setError(err instanceof Error ? err.message : "Falha de conexão."))
      .finally(() => setLoading(false));
  }, []);
  return <DashboardShell items={PARENT_NAV_ITEMS} title="Cronograma" description="Eventos disponíveis para sua família.">
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {loading ? <p>Carregando...</p> : !error && events.length === 0 ? <p>Nenhum evento encontrado.</p> :
      events.map((event) => <Card key={event.id}><CardHeader><CardTitle>{event.titulo}</CardTitle></CardHeader>
        <CardContent>{new Date(event.data).toLocaleDateString("pt-BR", { timeZone: "UTC" })}{event.horaInicio && ` — ${event.horaInicio}`}{event.local && ` — ${event.local}`}{event.turma && ` — ${event.turma.nome}`}</CardContent></Card>)}
  </DashboardShell>;
}

export function GaleriaResponsavel() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get(API_ROUTES.photosPublic).then(async (response) => {
      if (!response.ok) throw new Error("Não foi possível carregar a galeria.");
      const data: { photos: Photo[] } = await response.json();
      setPhotos(data.photos);
    }).catch((err: unknown) => setError(err instanceof Error ? err.message : "Falha de conexão."))
      .finally(() => setLoading(false));
  }, []);
  return <DashboardShell items={PARENT_NAV_ITEMS} title="Galeria" description="Fotos publicadas pela coordenação.">
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {loading ? <p>Carregando...</p> : !error && photos.length === 0 ? <p>Nenhuma foto publicada.</p> :
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{photos.map((photo) => <Card key={photo.id}>
        <CardHeader><CardTitle>{photo.title}</CardTitle></CardHeader>
        <CardContent><img className="w-full rounded-md object-cover" src={photo.imageUrl} alt={photo.title} />
          {photo.description && <p className="mt-2">{photo.description}</p>}</CardContent>
      </Card>)}</div>}
  </DashboardShell>;
}
