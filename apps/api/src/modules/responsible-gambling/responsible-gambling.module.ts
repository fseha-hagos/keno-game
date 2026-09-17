import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResponsibleGamblingLimit } from '../../database/entities/responsible-gambling-limit.entity';
import { User } from '../../database/entities/user.entity';
import { Bet } from '../../database/entities/bet.entity';
import { ResponsibleGamblingService } from './responsible-gambling.service';
import { ResponsibleGamblingController } from './responsible-gambling.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ResponsibleGamblingLimit, User, Bet])],
  controllers: [ResponsibleGamblingController],
  providers: [ResponsibleGamblingService],
  exports: [ResponsibleGamblingService],
})
export class ResponsibleGamblingModule {}
