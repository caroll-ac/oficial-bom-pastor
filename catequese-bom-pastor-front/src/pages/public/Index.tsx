import bomPastor from "@/assets/bom-pastor.jpg";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { API_ROUTES } from "@/lib/routes";
import { PIX_KEY, PIX_RECIPIENT } from "@/lib/contact";
import { fetchPublic } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bell,
  BookOpen,
  Calendar,
  Camera,
  ChevronDown,
  ChevronRight,
  Clock,
  Cross,
  Upload,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const features = [
  {
    icon: Users,
    title: "Área dos Pais",
    description:
      "Acompanhe o progresso dos seus filhos, receba notificações e acesse informações importantes.",
  },
  {
    icon: BookOpen,
    title: "Material de Estudo",
    description:
      "Acesse apostilas, vídeos de formação e recursos organizados por nível de catequese.",
  },
  {
    icon: Calendar,
    title: "Cronograma de Eventos",
    description:
      "Fique por dentro de todos os eventos, celebrações e datas importantes.",
  },
  {
    icon: Bell,
    title: "Notificações",
    description:
      "Receba avisos importantes, recados dos catequistas e lembretes de eventos.",
  },
  {
    icon: Upload,
    title: "Documentação Online",
    description:
      "Envie documentos de matrícula e renovação de forma prática e segura.",
  },
  {
    icon: Camera,
    title: "Galeria de Fotos",
    description:
      "Veja os momentos especiais das turmas e celebrações da catequese.",
  },
];

interface UpcomingEvent {
  id: string;
  date: string;
  month: string;
  title: string;
  time: string;
  description: string;
}

const levels = [
  {
    level: 1,
    name: "Nível I",
    color: "bg-sage-light text-sage-dark",
    age: "3-6 anos",
    duration: "3 anos",
    description: "Iniciação à fé cristã. As crianças aprendem os fundamentos da fé católica, conhecem Jesus Cristo e iniciam-se nos sacramentos.",
    content: [
      "Conhecimento de Jesus e do Evangelho",
      "Sinais e símbolos da fé cristã",
      "Preparação para o Batismo",
      "Primeiros passos na comunidade paroquial",
    ],
  },
  {
    level: 2,
    name: "Nível II",
    color: "bg-gold-light text-gold-dark",
    age: "6-9 anos",
    duration: "3 anos",
    description: "Aprofundamento da fé. Preparação para a Primeira Comunhão com compreensão mais profunda dos mistérios da fé.",
    content: [
      "Aprofundamento dos sacramentos",
      "Eucaristia e Missa",
      "Preparação para a Primeira Comunhão",
      "Vida de oração e práticas cristãs",
    ],
  },
  {
    level: 3,
    name: "Nível III",
    color: "bg-primary text-primary-foreground",
    age: "9-12 anos",
    duration: "3 anos",
    description: "Consolidação da fé. Preparação para a Confirmação com vivência plena da comunidade cristã e compromisso pessoal.",
    content: [
      "Vida sacramental completa",
      "Preparação para a Confirmação",
      "Compromisso e responsabilidade cristã",
      "Integração na comunidade da Igreja",
    ],
  },
];

export default function Index() {
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [loadingUpcomingEvents, setLoadingUpcomingEvents] = useState(true);

  useEffect(() => {
    const loadUpcomingEvents = async () => {
      setLoadingUpcomingEvents(true);

      try {
        const response = await fetchPublic(`${API_ROUTES.cronogramaEventosPublicos}?limit=6`);

        if (!response.ok) {
          setUpcomingEvents([]);
          return;
        }

        const data = await response.json();
        const eventos = Array.isArray(data?.eventos) ? data.eventos : [];

        const mapped = eventos.map((event: any) => {
          const rawDate = new Date(event?.data);
          const validDate = Number.isNaN(rawDate.getTime()) ? new Date() : rawDate;

          return {
            id: String(event?.id || Math.random().toString(36).slice(2, 10)),
            date: String(validDate.getDate()).padStart(2, "0"),
            month: validDate
              .toLocaleString("pt-BR", { month: "short" })
              .replace(".", "")
              .toUpperCase(),
            title: String(event?.titulo || "Evento da Comunidade"),
            time: validDate.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            description: String(event?.descricao || "Evento da comunidade paroquial."),
          } satisfies UpcomingEvent;
        });

        setUpcomingEvents(mapped);
      } catch (error) {
        console.error("Erro ao carregar próximos eventos:", error);
        setUpcomingEvents([]);
      } finally {
        setLoadingUpcomingEvents(false);
      }
    };

    loadUpcomingEvents();
  }, []);

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute inset-0 bg-navy-dark/60" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${bomPastor})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="container relative z-10 px-4 py-32 md:px-6 md:py-48">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 font-display text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl animate-slide-up">
              Catequese Bom Pastor
            </h1>
            <p
              className="mb-8 text-lg text-primary-foreground/90 md:text-xl animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
             "Portanto, ide, fazei discípulos de todas as nações, batizando-os em nome do Pai, do Filho e do Espírito Santo, e 
              ensinando-os a praticar tudo o que eu vos mandei. E eu estarei sempre convosco até o fim do mundo." (Mt 28,19-20)
            </p>
            <div
              className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <Button variant="hero" size="lg" asChild>
                <Link to="/matricula">
                  <Cross className="mr-2 h-5 w-5" />
                  Realizar Matrícula
                </Link>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <Link to="/login">
                  Acessar minha conta
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
            <p className="mt-5 text-sm text-primary-foreground/90">
              Para rematricular uma criança já cadastrada, <Link to="/login" className="font-semibold underline underline-offset-4">acesse a área dos pais</Link>. Para uma nova criança, use a matrícula.
            </p>
          </div>
        </div>
        {/* Decorative wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 120"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full block translate-y-[1px]"
          >
            <path
              d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              className="fill-background"
            />
          </svg>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-background">
        <div className="container px-4 md:px-6">
          {/* Header */}
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-display text-3xl md:text-4xl font-bold text-foreground">
              Um pouco sobre a Catequese...
            </h2>
          </div>

          <div className="mx-auto max-w-4xl mb-12">
            <div className="rounded-xl border border-border/80 bg-card/90 p-8 shadow-sm backdrop-blur-sm md:p-10">
              <div className="flex gap-4">
                <div className="flex-shrink-0 pt-1">
                  <BookOpen className="h-7 w-7 text-primary shrink-0" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground text-lg mb-3">
                    O que é Catequese?
                  </h3>
                  <p className="text-foreground/75 leading-relaxed text-base">
                    A catequese é a ação evangelizadora da Igreja que procura amadurecer a fé das crianças e jovens, 
                    transmitindo-lhes o ensinamento de Jesus Cristo e a tradição da Igreja. Através de aulas, 
                    dinâmicas, brincadeiras e experiências vivenciais, as crianças aprendem a conhecer a Deus, 
                    a vivenciar a fé cristã na comunidade, a celebrar os sacramentos (Batismo, Eucaristia, Confirmação) 
                    e a crescer como discípulos de Jesus. É um caminho de formação que integra inteligência, coração e vontade.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {levels.map((item, index) => (
              <Card
                key={item.level}
                className="animate-slide-up overflow-hidden transition-all duration-300 border shadow-md hover:shadow-lg cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <button
                  onClick={() => setExpandedLevel(expandedLevel === item.level ? null : item.level)}
                  className="w-full text-left hover:opacity-90 transition-opacity"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg font-display text-2xl font-bold ${item.color} shadow-sm`}>
                        {item.level}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl md:text-2xl">{item.name}</CardTitle>
                        <CardDescription className="text-sm md:text-base mt-1">
                          {item.age} • {item.duration} do ciclo
                        </CardDescription>
                      </div>
                      <ChevronDown
                        className={`h-6 w-6 shrink-0 transition-transform duration-300 text-muted-foreground ${
                          expandedLevel === item.level ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </CardHeader>
                </button>

                {expandedLevel === item.level && (
                  <CardContent className="border-t pt-6 pb-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Descrição</h4>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-3">Tópicos trabalhados:</h4>
                      <ul className="space-y-2">
                        {item.content.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-muted-foreground">
                            <div className={`h-2 w-2 rounded-full shrink-0 mt-2 ${item.color.split(" ")[0]}`} />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section id="eventos" className="py-16 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl">
              Próximos Eventos
            </h2>
            <p className="text-muted-foreground">
              Fique por dentro das celebrações e atividades
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-4">
            {loadingUpcomingEvents && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Carregando próximos eventos...
                </CardContent>
              </Card>
            )}

            {!loadingUpcomingEvents && upcomingEvents.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  Nenhum próximo evento da comunidade disponível no momento.
                </CardContent>
              </Card>
            )}

            {!loadingUpcomingEvents && upcomingEvents.map((event, index) => (
              <Card
                key={event.id}
                variant="interactive"
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="flex items-center gap-4 p-4 md:p-6">
                  <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <span className="font-display text-2xl font-bold">
                      {event.date}
                    </span>
                    <span className="text-xs uppercase">{event.month}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-1 font-display text-lg font-semibold">
                      {event.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {event.description}
                    </p>
                  </div>
                  <div className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
                    <Clock className="h-4 w-4" />
                    {event.time}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-16 md:py-24 dark:bg-navy-dark">
        <div className="container px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-4xl">
              Pronto para começar?
            </h2>
            <p className="mb-8 text-lg text-primary-foreground/80">
              Inscreva seu filho(a) na catequese e faça parte desta comunidade
              de fé.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="gold" size="xl" asChild>
                <Link to="/matricula">Iniciar Matrícula</Link>
              </Button>
              <Button variant="heroOutline" size="xl" asChild>
                <Link to="/login">Já tenho cadastro</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
