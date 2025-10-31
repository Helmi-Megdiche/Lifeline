import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
import { AppModule } from './app.module';
import * as mongoose from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });
  
  // Disable Mongoose debug logs explicitly
  mongoose.set('debug', false);
  
  // Increase body size limits for PouchDB/CouchDB sync
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
  
  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));
  
  // Get network interfaces to display all accessible IPs
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  
  // Enable CORS for Next.js frontend (including mobile access)
  // Allow all origins in development for dynamic IP detection
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  app.enableCors({
    origin: isDevelopment ? true : [  // In development, allow all origins
      'http://localhost:3000', 
      'http://localhost:3001', 
      'http://localhost:3002',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'cache-control', 'pragma', 'expires'],
  });
  
  const port = process.env.PORT || 4004; // Changed to 4004 to avoid conflicts
  await app.listen(port, '0.0.0.0'); // Listen on all network interfaces
  
  console.log(`Application is running on: http://localhost:${port}`);
  
  // Display all network IPs that the backend is accessible on
  console.log('\nBackend is accessible on:');
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName]?.forEach((net: any) => {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  http://${net.address}:${port}`);
      }
    });
  });
}
bootstrap();
