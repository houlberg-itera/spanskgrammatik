// Simple test to verify GPT-5 fix and write output to file
const fs = require('fs');
const http = require('http');

const testData = JSON.stringify({
  model: 'gpt-5',
  temperature: 0.7,
  maxTokens: 500,
  systemPrompt: 'You are a helpful assistant.',
  userPromptTemplate: 'Please say "Hello, I am GPT-5 and I am working correctly!" in Spanish.',
  testParams: {
    topic: 'test',
    level: 'A1'
  }
});

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

function writeResults(message) {
  const timestamp = new Date().toISOString();
  const output = `[${timestamp}] ${message}\n`;
  console.log(output);
  fs.appendFileSync('gpt5-test-results.txt', output);
}

writeResults('🧪 Starting GPT-5 content extraction test...');

const req = http.request(options, (res) => {
  writeResults(`📊 Response Status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      if (res.statusCode === 200) {
        const response = JSON.parse(data);
        writeResults(`✅ SUCCESS! Model: ${response.model}`);
        writeResults(`📝 Content Length: ${response.content ? response.content.length : 0}`);
        writeResults(`📄 Content: ${response.content || '[NO CONTENT]'}`);
        
        if (response.content && response.content.trim().length > 0) {
          writeResults('🎉 GPT-5 CONTENT EXTRACTION FIX VERIFIED SUCCESSFUL!');
        } else {
          writeResults('❌ GPT-5 still returning empty content - needs investigation');
        }
      } else {
        writeResults(`❌ API Error: ${res.statusCode} - ${data}`);
      }
    } catch (error) {
      writeResults(`❌ Parse Error: ${error.message} - Raw: ${data}`);
    }
  });
});

req.on('error', (error) => {
  writeResults(`❌ Request Error: ${error.message}`);
});

req.write(testData);
req.end();

writeResults('📤 GPT-5 test request sent...');