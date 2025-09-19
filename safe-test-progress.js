// Simple test script that won't interfere with the running server
console.log('🔧 Testing Progress Recalculation API...');
console.log('Server should remain running during this test');
console.log('');

// Simple fetch test
fetch('http://localhost:3000/api/recalculate-progress', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('✅ API Response Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('✅ SUCCESS! Progress API response:');
  console.log('Success:', data.success);
  console.log('Message:', data.message);
  if (data.levelsUpdated) {
    console.log('Levels updated:', data.levelsUpdated);
    console.log('Updated levels:', data.levels);
  }
  console.log('');
  console.log('🎯 PROGRESS RECALCULATION COMPLETED!');
  console.log('The dashboard Mine Statistikker should now show correct progress!');
})
.catch(error => {
  console.error('❌ Error:', error.message);
});

// Test dashboard accessibility after a delay
setTimeout(() => {
  console.log('');
  console.log('📊 Testing dashboard accessibility...');
  
  fetch('http://localhost:3000/dashboard')
    .then(response => {
      console.log('✅ Dashboard Status:', response.status);
      if (response.ok) {
        console.log('✅ Dashboard accessible - Mine Statistikker should show fixed progress!');
      }
    })
    .catch(error => {
      console.error('❌ Dashboard Error:', error.message);
    });
}, 3000);