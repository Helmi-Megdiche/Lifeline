#!/bin/bash
# LifeLine Backend Test Script
# Run this after starting the NestJS backend to verify endpoints

echo "Testing LifeLine Backend Endpoints..."
echo "=================================="

# Test health endpoint
echo "1. Testing health endpoint..."
curl -s http://localhost:4000/health
echo -e "\n"

# Test status endpoint (no auth required for now)
echo "2. Testing status endpoint..."
curl -s -X POST http://localhost:4000/status \
  -H "Content-Type: application/json" \
  -d '{"status":"safe","timestamp":'$(date +%s)',"latitude":36.8065,"longitude":10.1815}'
echo -e "\n"

# Test PouchDB sync endpoint
echo "3. Testing PouchDB sync endpoint..."
curl -s http://localhost:4000/pouch/status
echo -e "\n"

# Test auth registration
echo "4. Testing auth registration..."
curl -s -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
echo -e "\n"

echo "Backend test complete!"
echo "Note: Make sure MongoDB is running and backend is started with 'npm run start:dev'"