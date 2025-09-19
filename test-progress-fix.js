// Test script for progress fix
async function testProgressFix() {
  console.log('🔧 Testing progress recalculation fix...');
  
  try {
    // Test the manual recalculation API
    const response = await fetch('http://localhost:3000/api/recalculate-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS! Progress recalculation API working:');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
      
      if (data.levelsUpdated) {
        console.log(`🎯 Updated ${data.levelsUpdated} level records`);
        console.log('Updated levels:', data.levels);
      }
    } else {
      console.log('❌ API Error:', data);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

// Test dashboard access
async function testDashboard() {
  console.log('📊 Testing dashboard access...');
  
  try {
    const response = await fetch('http://localhost:3000/dashboard');
    console.log('Dashboard Status:', response.status);
    
    if (response.ok) {
      console.log('✅ Dashboard accessible - check Mine Statistikker section');
    }
  } catch (error) {
    console.error('❌ Dashboard Error:', error.message);
  }
}

// Run tests
console.log('🚀 Starting progress fix tests...');
testProgressFix();
setTimeout(testDashboard, 2000);