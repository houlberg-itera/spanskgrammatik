console.log('🔧 TYPESCRIPT PATH CASING FIX');
console.log('==============================');

const fs = require('fs');
const path = require('path');

// 1. Clear Next.js cache completely
console.log('1. Clearing Next.js cache...');
try {
  if (fs.existsSync('.next')) {
    fs.rmSync('.next', { recursive: true, force: true });
    console.log('   ✅ .next directory removed');
  }
} catch (error) {
  console.log('   ⚠️  Could not remove .next directory:', error.message);
}

// 2. Clear node_modules cache
console.log('2. Clearing node_modules cache...');
try {
  if (fs.existsSync('node_modules/.cache')) {
    fs.rmSync('node_modules/.cache', { recursive: true, force: true });
    console.log('   ✅ node_modules/.cache removed');
  }
} catch (error) {
  console.log('   ⚠️  Could not remove cache:', error.message);
}

// 3. Check TypeScript configuration
console.log('3. Validating TypeScript configuration...');
try {
  const tsconfigPath = path.resolve('tsconfig.json');
  const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf8');
  
  if (tsconfigContent.includes('<<<<<<<') || tsconfigContent.includes('>>>>>>>')) {
    console.log('   ❌ tsconfig.json contains merge conflict markers');
    process.exit(1);
  }
  
  const tsconfig = JSON.parse(tsconfigContent);
  console.log('   ✅ tsconfig.json is valid JSON');
  console.log('   ✅ No merge conflict markers found');
  
} catch (error) {
  console.log('   ❌ tsconfig.json error:', error.message);
  process.exit(1);
}

// 4. Check critical files
console.log('4. Checking critical files for merge conflicts...');
const criticalFiles = [
  'src/lib/supabase/client.ts',
  'src/lib/supabase/server.ts',
  'package.json',
  'next.config.ts'
];

for (const file of criticalFiles) {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('<<<<<<<') || content.includes('>>>>>>>') || content.includes('=======')) {
        console.log(`   ❌ ${file} contains merge conflicts`);
        process.exit(1);
      }
      console.log(`   ✅ ${file} is clean`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check ${file}:`, error.message);
  }
}

console.log('');
console.log('✅ TYPESCRIPT PATH ISSUE DIAGNOSIS COMPLETE');
console.log('');
console.log('🚀 Ready to start development server');
console.log('Run: npm run dev');
console.log('');
