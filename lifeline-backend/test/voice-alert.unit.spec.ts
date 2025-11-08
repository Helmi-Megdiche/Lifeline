import { Test } from '@nestjs/testing';
import { VoiceAlertService } from '../src/voice-alert/voice-alert.service';
import { getModelToken } from '@nestjs/mongoose';
import { SttService } from '../src/voice-alert/stt/stt.service';
import { ClassifierService } from '../src/voice-alert/intents/classifier.service';
import { ContactsService } from '../src/contacts/contacts.service';
import { TwilioNotifierService } from '../src/notifier/twilio-notifier.service';

describe('VoiceAlertService', () => {
  let svc: VoiceAlertService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VoiceAlertService,
        SttService,
        ClassifierService,
        TwilioNotifierService,
        {
          provide: ContactsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([{ _id: '1', phone: '+123', methods: ['sms'] }]),
          },
        },
        { provide: getModelToken('Alert'), useValue: function () { return { save: async () => ({ _id: 'a1', save: async () => ({}) }) } as any; } },
      ],
    }).compile();

    svc = moduleRef.get(VoiceAlertService);
  });

  it('should process audio and notify contact', async () => {
    const buf = Buffer.from('dummy');
    await expect((svc as any).processAudio('user1', buf, 36.8, 10.18)).resolves.toBeDefined();
  });
});


