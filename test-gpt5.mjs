import { config } from 'dotenv';
import OpenAI from 'openai';

// Load environment variables from .env.local
config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testGPT5() {
  try {
    console.log('🧪 Testing GPT-5 API with correct parameters...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "user",
          content: "Respond with exactly: GPT-5 test successful with max_completion_tokens parameter"
        }
      ],
      max_completion_tokens: 20,
    });

    console.log('✅ Success! Response:', completion.choices[0]?.message?.content);
    console.log('✅ GPT-5 is working correctly with the new parameter name!');
    
    return { success: true, message: completion.choices[0]?.message?.content };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

testGPT5().then(result => {
  if (result.success) {
    console.log('\n🎉 GPT-5 integration is ready!');
  } else {
    console.log('\n❌ GPT-5 integration needs fixing:', result.error);
  }
  process.exit(result.success ? 0 : 1);
});
