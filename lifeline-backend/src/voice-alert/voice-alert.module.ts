import { Module } from '@nestjs/common';
import { VoiceAlertController } from './voice-alert.controller';
import { VoiceAlertService } from './voice-alert.service';
import { SttService } from './stt/stt.service';
import { ClassifierService } from './intents/classifier.service';
import { ContactsModule } from '../contacts/contacts.module';
import { AlertsModule } from '../alerts/alerts.module';
import { TwilioNotifierService } from '../notifier/twilio-notifier.service';

@Module({
  imports: [
    ContactsModule,
    AlertsModule,
  ],
  controllers: [VoiceAlertController],
  providers: [VoiceAlertService, SttService, ClassifierService, TwilioNotifierService],
  exports: [VoiceAlertService],
})
export class VoiceAlertModule {}


