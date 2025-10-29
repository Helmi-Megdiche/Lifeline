import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StatusModule } from './status/status.module';
import { AuthModule } from './auth/auth.module';
import { PouchModule } from './pouch/pouch.module';
import { AlertsModule } from './alerts/alerts.module';
import { GroupsModule } from './groups/groups.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/lifeline'),
    StatusModule,
    AuthModule,
    PouchModule,
    AlertsModule,
    GroupsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
