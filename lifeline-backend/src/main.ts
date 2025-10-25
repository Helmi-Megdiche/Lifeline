import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
          // Add request logging middleware
          app.use((req, res, next) => {
            if (req.url.includes('_bulk_docs')) {
            }
            next();
          });
  
  // Increase body size limits for PouchDB/CouchDB sync
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  
  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  
  // Enable CORS for Next.js frontend (including mobile access)
      app.enableCors({
        origin: [
          'http://localhost:3000', 
          'http://localhost:3001', 
          'http://localhost:3002',
          'http://10.133.250.197:3000',  // Your actual WiFi IP for mobile access
          'http://192.168.136.1:3000',   // VMware adapter IP (backup)
          'http://192.168.1.100:3000',  // Common alternative network IP
          'http://10.0.0.100:3000'      // Common alternative network IP
        ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'cache-control', 'pragma', 'expires'],
  });
  
  const port = process.env.PORT || 4004; // Changed to 4004 to avoid conflicts
  await app.listen(port, '0.0.0.0'); // Listen on all network interfaces
  console.log(`Application is running on: http://localhost:${port}`);
      console.log(`Application is also accessible on: http://10.133.250.197:${port}`);
}
bootstrap();
