// Test script for GPT-5 content extraction fix
console.log('🧪 Testing GPT-5 content extraction fix...');

const testPayload = {
  configId: 1,
  configName: 'GPT-5 Content Fix Test',
  model: 'gpt-5',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: 'You are a helpful Spanish teacher creating exercises for Danish students.',
  userPromptTemplate: 'Create a simple Spanish exercise for {{level}} level about {{topic}}. Include: 1. A Spanish sentence with a missing word 2. Three multiple choice options in Spanish 3. The correct answer 4. A brief explanation in Danish. Please respond with actual exercise content.',
  testParams: {
    topic: 'familia',
    level: 'A1', 
    exerciseType: 'multiple_choice',
    difficulty: 'easy',
    questionCount: 1
  }
};

async function testGPT5Fix() {
  try {
    console.log('📤 Making API call to test-ai-config...');
    
    const response = await fetch('http://localhost:3000/api/test-ai-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    console.log('📥 Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ SUCCESS! GPT-5 Response:');
    console.log('🤖 Model:', data.model);
    console.log('⏱️  Response Time:', data.responseTime);
    console.log('📊 Usage:', JSON.stringify(data.usage, null, 2));
    console.log('📝 Content Length:', data.content?.length || 0);
    console.log('📄 Generated Content:');
    console.log('---');
    console.log(data.content || 'No content');
    console.log('---');
    
    if (data.content && data.content.length > 0) {
      console.log('🎉 GPT-5 CONTENT EXTRACTION FIX SUCCESSFUL!');
    } else {
      console.log('❌ Still no content - need further investigation');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testGPT5Fix();