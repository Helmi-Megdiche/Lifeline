import { Module } from '@nestjs/common';
import { PouchController } from './pouch.controller';
import { StatusModule } from '../status/status.module';

@Module({
  imports: [StatusModule],
  controllers: [PouchController],
})
export class PouchModule {}
