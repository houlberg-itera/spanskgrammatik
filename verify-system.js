// Final verification script
console.log('🎯 Final System Verification');
console.log('============================');

// 1. Check TypeScript configuration
try {
  const path = require('path');
  const fs = require('fs');
  
  const tsconfigPath = path.resolve(process.cwd(), 'tsconfig.json');
  console.log('📝 TypeScript config path:', tsconfigPath);
  
  if (fs.existsSync(tsconfigPath)) {
    const config = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
    console.log('✅ TypeScript config is valid');
  } else {
    console.log('❌ TypeScript config not found');
  }
} catch (error) {
  console.log('❌ TypeScript config error:', error.message);
}

// 2. Check package.json dependencies
try {
  const packageJson = require('./package.json');
  const requiredDeps = [
    '@supabase/supabase-js',
    '@supabase/ssr',
    'next',
    'react',
    'typescript',
    'tailwindcss'
  ];
  
  console.log('\n📦 Checking dependencies:');
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
      console.log(`✅ ${dep}: ${packageJson.dependencies[dep] || packageJson.devDependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: Missing`);
    }
  });
} catch (error) {
  console.log('❌ Package.json error:', error.message);
}

// 3. Check for merge conflict markers
try {
  const fs = require('fs');
  const path = require('path');
  
  const filesToCheck = [
    'tsconfig.json',
    'package.json',
    'next.config.ts',
    'tailwind.config.ts',
    'src/app/layout.tsx',
    'src/app/globals.css'
  ];
  
  console.log('\n🔍 Checking for merge conflicts:');
  
  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const hasConflicts = content.includes('<<<<<<<') || content.includes('>>>>>>>') || content.includes('=======');
      console.log(`${hasConflicts ? '❌' : '✅'} ${file}: ${hasConflicts ? 'Has conflicts' : 'Clean'}`);
    } else {
      console.log(`⚠️  ${file}: File not found`);
    }
  }
} catch (error) {
  console.log('❌ Merge conflict check error:', error.message);
}

console.log('\n✅ System verification complete!');
console.log('\nNext steps:');
console.log('1. Run "npm run dev" to start the development server');
console.log('2. Open http://localhost:3000 in your browser');
console.log('3. Test the authentication and exercise features');