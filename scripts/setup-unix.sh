#!/bin/bash

echo "==================================="
echo "  KANBAN CRM - PostgreSQL Setup"
echo "==================================="
echo

echo "1. Installing PostgreSQL dependencies..."
npm install pg pg-hstore --save
npm uninstall better-sqlite3 --save

echo
echo "2. Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    echo "   Download: https://www.docker.com/products/docker-desktop/"
    exit 1
fi

echo "✅ Docker found!"
echo

echo "3. Starting PostgreSQL with Docker..."
docker-compose up -d postgres

echo
echo "4. Waiting for PostgreSQL to initialize..."
sleep 10

echo
echo "5. Running migrations..."
npm run migrate

echo
echo "6. Running seed (initial data)..."
npm run seed

echo
echo "==================================="
echo "   ✅ SETUP COMPLETED!"
echo "==================================="
echo
echo "Available services:"
echo "  - PostgreSQL: localhost:5432"
echo "  - pgAdmin: http://localhost:8080"
echo "    Email: admin@kanban.local"
echo "    Password: admin123"
echo
echo "To start the server:"
echo "  npm run dev"
echo
