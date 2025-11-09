import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VoiceAlertController } from './voice-alert.controller';
import { VoiceAlertService } from './voice-alert.service';
import { SttService } from './stt/stt.service';
import { ClassifierService } from './intents/classifier.service';
import { ContactsModule } from '../contacts/contacts.module';
import { AlertsModule } from '../alerts/alerts.module';
import { EmailNotifierService } from '../notifier/email-notifier.service';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    ContactsModule,
    AlertsModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [VoiceAlertController],
  providers: [VoiceAlertService, SttService, ClassifierService, EmailNotifierService],
  exports: [VoiceAlertService],
})
export class VoiceAlertModule {}


