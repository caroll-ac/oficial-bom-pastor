import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
// import { TurmasModule } from './modules/turmas/turmas.module';
// import { CatequizandosModule } from './modules/alunos/alunos.module';
// import { ResponsaveisModule } from './modules/responsaveis/responsaveis.module';
// import { InscricoesModule } from './modules/inscricoes/inscricoes.module';
// import { PagamentosModule } from './modules/pagamentos/pagamentos.module';
// import { MateriaisModule } from './modules/materiais/materiais.module';
// import { CronogramaModule } from './modules/cronograma/cronograma.module';
// import { CalendarioModule } from './modules/calendario/calendario.module';
// import { GaleriaModule } from './modules/galeria/galeria.module';
// import { MusicasModule } from './modules/musicas/musicas.module';
// import { UploadsModule } from './modules/uploads/uploads.module';
// import { DashboardModule } from './modules/dashboard/dashboard.module';
// import { CatequistasModule } from './modules/catequistas/catequistas.module';
// import { PhotosModule } from './modules/photos/photos.module';
// import { PreMatriculasModule } from './modules/pre-matriculas/pre-matriculas.module';
// import { ItensLojaModule } from './modules/loja/loja.module';
// import { ComunicacaoModule } from './modules/comunicacao/comunicacao.module';
// import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { MatriculaModule } from './modules/matricula/matricula.module';
import { DocumentoModule } from './modules/documento/documento.module';
import { RenovacoesModule } from './modules/renovacoes/renovacoes.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minuto
        limit: 100, // 100 requests
      },
    ]),

    // Prisma
    PrismaModule,

    // Modules
    AuthModule,
    MatriculaModule,
    DocumentoModule,
    RenovacoesModule,
    // TurmasModule,
    // CatequizandosModule,
    // ResponsaveisModule,
    // InscricoesModule,
    // PagamentosModule,
    // MateriaisModule,
    // CronogramaModule,
    // CalendarioModule,
    // GaleriaModule,
    // MusicasModule,
    // ItensLojaModule,
    // UploadsModule,
    // DashboardModule,
    // CatequistasModule,
    // PhotosModule,
    // PreMatriculasModule,
    // ComunicacaoModule,
    // NotificacoesModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
