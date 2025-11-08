import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('VoiceAlertController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('/voice-alert/process (POST) should accept audio', async () => {
    const filepath = path.join(__dirname, 'sample_audio.wav');
    if (!fs.existsSync(filepath)) fs.writeFileSync(filepath, 'dummy');
    const res = await request(app.getHttpServer())
      .post('/voice-alert/process')
      .attach('audio', filepath)
      .field('userId', 'testuser')
      .field('latitude', '36.8065')
      .field('longitude', '10.1815');
    expect([200,201]).toContain(res.status);
  });

  afterAll(async () => {
    await app.close();
  });
});


