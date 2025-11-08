import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name);

  constructor() {}

  async transcribeWithProvider(provider: string, audioBuffer: Buffer): Promise<string> {
    this.logger.log(`Transcribing with provider: ${provider}, audio buffer size: ${audioBuffer.length} bytes`);
    
    try {
      if (provider === 'whisper') {
        if (process.env.OPENAI_API_KEY) {
          this.logger.log('Using OpenAI Whisper API');
          return await this.whisperApi(audioBuffer);
        }
        this.logger.warn('OPENAI_API_KEY not set, falling back to mockWhisper');
        return await this.mockWhisper();
      } else if (provider === 'vosk') {
        // Try local adapter if configured, else mock
        if (process.env.VOSK_URL) {
          this.logger.log(`Using Vosk local at ${process.env.VOSK_URL}`);
          try { 
            const result = await this.voskLocal(audioBuffer);
            this.logger.log('Vosk local transcription successful');
            return result;
          } catch (err: any) {
            this.logger.warn('Vosk local failed, falling back to mock:', err.message);
            // fall through to mock
          }
        }
        this.logger.log('Using mock Vosk (no VOSK_URL configured)');
        return await this.mockVosk();
      }
      this.logger.warn(`Unknown provider: ${provider}, using keyword fallback`);
      return this.keywordFallback();
    } catch (err) {
      this.logger.error('STT provider error, falling back to mock', err as any);
      return await this.mockVosk();
    }
  }

  // Whisper API using native fetch/FormData (Node 18+)
  private async whisperApi(audioBuffer: Buffer): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY as string;
    const form = new FormData();
    // Convert Node Buffer -> ArrayBuffer slice to avoid SharedArrayBuffer typing
    const uint8 = new Uint8Array(audioBuffer);
    const arrayBuffer: ArrayBuffer = uint8.buffer;
    const file = new Blob([arrayBuffer as ArrayBuffer], { type: 'audio/webm' });
    form.append('file', file, 'audio.webm');
    form.append('model', 'whisper-1');
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form as any,
    });
    if (!res.ok) {
      const txt = await res.text();
      this.logger.error(`Whisper API error: ${res.status} ${txt}`);
      throw new Error('Whisper API failed');
    }
    const data: any = await res.json();
    const text: string = data.text || '';
    return text.toLowerCase();
  }

  // Optional local Vosk adapter (HTTP). Set VOSK_URL (default http://localhost:2700/stt)
  private async voskLocal(audioBuffer: Buffer): Promise<string> {
    const url = process.env.VOSK_URL || 'http://localhost:2700/stt';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: new Uint8Array(audioBuffer) as any,
    });
    if (!res.ok) {
      const txt = await res.text();
      this.logger.error(`Vosk local error: ${res.status} ${txt}`);
      throw new Error('Vosk local failed');
    }
    const data: any = await res.json();
    return (data.text || '').toLowerCase();
  }

  async mockWhisper(): Promise<string> {
    this.logger.debug('Mock Whisper called');
    return 'help me lifeline i am trapped in my car';
  }

  async mockVosk(): Promise<string> {
    this.logger.debug('Mock Vosk called');
    return 'help me lifeline i have been in a car accident';
  }

  keywordFallback(): string {
    return '';
  }
}


