import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { MatriculaController } from './matricula.controller';
import { MatriculaService } from './matricula.service';
import { AuthModule } from '../auth/auth.module';
import { MailerModule } from '../../common/mailer/mailer.module';

@Module({
  imports: [PrismaModule, ConfigModule, AuthModule, MailerModule],
  controllers: [MatriculaController],
  providers: [MatriculaService],
})
export class MatriculaModule {}
