#!/bin/bash

# Navigate to the backend directory
cd "$(dirname "$0")/.."

# Run the migration script
echo "Running expenses migration..."
npx ts-node migration/data/migrate-expenses.ts
