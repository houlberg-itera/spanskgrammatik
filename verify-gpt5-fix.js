// GPT-5 Content Extraction Fix Verification Script
const http = require('http');

console.log('🎯 VERIFYING GPT-5 CONTENT EXTRACTION FIX');
console.log('');

// Test data for GPT-5 API call
const testData = JSON.stringify({
  configId: 1,
  configName: 'GPT-5 Verification Test',
  model: 'gpt-5',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: 'You are a helpful Spanish teacher creating exercises for Danish students.',
  userPromptTemplate: 'Create a simple Spanish exercise about {{topic}} for {{level}} level. Include a Spanish sentence, three multiple choice options, and the correct answer.',
  testParams: {
    topic: 'familia',
    level: 'A1',
    exerciseType: 'multiple_choice',
    difficulty: 'easy',
    questionCount: 1
  }
});

// HTTP request options
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/test-ai-config',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData)
  }
};

// Make the request
const req = http.request(options, (res) => {
  console.log('📊 Response Status:', res.statusCode);
  console.log('📋 Response Headers:', res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      console.log('📥 Raw Response Length:', data.length);
      
      if (res.statusCode === 200) {
        const response = JSON.parse(data);
        console.log('');
        console.log('✅ SUCCESS! GPT-5 API Response:');
        console.log('🤖 Model:', response.model);
        console.log('⏱️  Response Time:', response.responseTime);
        console.log('📈 Token Usage:', JSON.stringify(response.usage, null, 2));
        console.log('📝 Content Length:', response.content ? response.content.length : 0);
        console.log('');
        console.log('📄 Generated Content:');
        console.log('=====================================');
        console.log(response.content || '[NO CONTENT]');
        console.log('=====================================');
        console.log('');
        
        if (response.content && response.content.trim().length > 0) {
          console.log('🎉 VERIFICATION SUCCESSFUL: GPT-5 content extraction is working!');
          console.log('✅ The enhanced debugging logic successfully fixed the empty content issue.');
        } else {
          console.log('❌ VERIFICATION FAILED: GPT-5 still returning empty content');
          console.log('🔍 Need to investigate further...');
        }
      } else {
        console.log('❌ API Error:', res.statusCode);
        console.log('📄 Error Response:', data);
      }
    } catch (error) {
      console.log('❌ JSON Parse Error:', error.message);
      console.log('📄 Raw Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.log('❌ Request Error:', error.message);
  console.log('🔍 Make sure the development server is running on port 3000');
});

// Send the request
req.write(testData);
req.end();

console.log('📤 Sending GPT-5 test request...');
console.log('⏳ Waiting for response...');