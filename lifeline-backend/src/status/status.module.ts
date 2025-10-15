import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StatusController } from './status.controller';
import { StatusService } from './status.service';
import { CheckInStatus, CheckInStatusSchema } from '../schemas/status.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CheckInStatus.name, schema: CheckInStatusSchema }])
  ],
  controllers: [StatusController],
  providers: [StatusService],
  exports: [StatusService],
})
export class StatusModule {}
