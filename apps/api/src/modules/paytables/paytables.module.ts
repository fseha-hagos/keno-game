import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Paytable } from '../../database/entities/paytable.entity';
import { PaytablesService } from './paytables.service';
import { PaytablesController } from './paytables.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Paytable])],
  controllers: [PaytablesController],
  providers: [PaytablesService],
  exports: [PaytablesService],
})
export class PaytablesModule {}
