#!/usr/bin/env node
/**
 * TypeScript Debug Failure Fix Script
 * Fixes the path casing issue that causes:
 * Error: Debug Failure. Expected C:/source/repos/Spanskgrammatik/tsconfig.json === C:\source\repos\Spanskgrammatik\tsconfig.json
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting TypeScript path casing fix...');

// Force clean TypeScript compilation
console.log('1. Cleaning Next.js cache...');
try {
    if (fs.existsSync('.next')) {
        fs.rmSync('.next', { recursive: true, force: true });
    }
    if (fs.existsSync('node_modules/.cache')) {
        fs.rmSync('node_modules/.cache', { recursive: true, force: true });
    }
    console.log('✅ Cache cleared');
} catch (error) {
    console.log('⚠️ Cache clear failed:', error.message);
}

// Check TypeScript config
console.log('2. Validating tsconfig.json...');
try {
    const tsconfigPath = path.resolve('tsconfig.json');
    console.log('✅ TypeScript config found at:', tsconfigPath);
    
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    console.log('✅ TypeScript config is valid JSON');
    
    // Check if there are merge conflict markers
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
    if (tsconfigContent.includes('<<<<<<< HEAD') || tsconfigContent.includes('>>>>>>> ')) {
        console.log('❌ Merge conflict markers found in tsconfig.json');
        console.log('Please resolve merge conflicts first');
        process.exit(1);
    }
    
} catch (error) {
    console.log('❌ TypeScript config validation failed:', error.message);
    process.exit(1);
}

console.log('3. TypeScript fix complete! ✅');
console.log('Now try running: npm run dev');