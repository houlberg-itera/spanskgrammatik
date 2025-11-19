import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      configId,
      configName,
      model, 
      temperature, 
      maxTokens, 
      systemPrompt, 
      userPromptTemplate,
      testParams 
    } = body;

    // Validate required parameters
    if (!model || !systemPrompt || !userPromptTemplate || !testParams) {
      return NextResponse.json(
        { error: 'Missing required parameters for testing' },
        { status: 400 }
      );
    }

    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Validate test parameters
    if (!testParams.topic || !testParams.level || !testParams.exerciseType) {
      return NextResponse.json(
        { error: 'Invalid test parameters - missing topic, level, or exerciseType' },
        { status: 400 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build the user prompt by replacing template variables
    let userPrompt = userPromptTemplate;
    
    // Replace common template variables
    userPrompt = userPrompt.replace(/\{\{topic\}\}/g, testParams.topic);
    userPrompt = userPrompt.replace(/\{\{level\}\}/g, testParams.level);
    userPrompt = userPrompt.replace(/\{\{exerciseType\}\}/g, testParams.exerciseType);
    userPrompt = userPrompt.replace(/\{\{difficulty\}\}/g, testParams.difficulty);
    
    // Handle question count with multiple possible variable names
    const questionCountStr = testParams.questionCount.toString();
    userPrompt = userPrompt.replace(/\{\{questionCount\}\}/g, questionCountStr);
    userPrompt = userPrompt.replace(/\{\{count\}\}/g, questionCountStr);
    userPrompt = userPrompt.replace(/\{\{numQuestions\}\}/g, questionCountStr);
    userPrompt = userPrompt.replace(/\{\{numberOfQuestions\}\}/g, questionCountStr);
    userPrompt = userPrompt.replace(/\{\{questionsCount\}\}/g, questionCountStr);
    
    // Additional template variables that might be used
    userPrompt = userPrompt.replace(/\{\{language\}\}/g, 'Spanish');
    userPrompt = userPrompt.replace(/\{\{targetLanguage\}\}/g, 'Danish');
    userPrompt = userPrompt.replace(/\{\{topicName\}\}/g, testParams.topic);
    userPrompt = userPrompt.replace(/\{\{topicDescription\}\}/g, 
      testParams.topicData?.description_da || testParams.topicData?.description || `Spanish ${testParams.topic} vocabulary and grammar`);
    
    // Add specific instructions for question structure based on exercise type
    const questionCountText = testParams.questionCount === 1 ? 'EXACTLY 1 question' : `EXACTLY ${testParams.questionCount} questions`;
    
    if (testParams.exerciseType === 'fill_blank') {
      userPrompt = userPrompt.replace(/\{\{exerciseInstructions\}\}/g, 
        `For fill_blank exercises, generate ${questionCountText}. Include: 1) Clear Spanish sentence with one blank (___), 2) Danish question asking what goes in the blank, 3) Multiple choice options, 4) Explanation in Danish. IMPORTANT: The questions array must contain exactly ${testParams.questionCount} question(s).`);
    } else if (testParams.exerciseType === 'multiple_choice') {
      userPrompt = userPrompt.replace(/\{\{exerciseInstructions\}\}/g,
        `For multiple_choice exercises, generate ${questionCountText}. Include: 1) Clear question in Danish, 2) Spanish content if applicable, 3) Multiple choice options, 4) Explanation in Danish. IMPORTANT: The questions array must contain exactly ${testParams.questionCount} question(s).`);
    } else {
      userPrompt = userPrompt.replace(/\{\{exerciseInstructions\}\}/g,
        `Generate ${questionCountText}. Include clear questions with Danish instructions and explanations. IMPORTANT: The questions array must contain exactly ${testParams.questionCount} question(s).`);
    }

    // Record start time for performance tracking
    const startTime = Date.now();

    // Make the OpenAI API call with enhanced debugging
    let completion;
    try {
      // Enhance system prompt for reasoning models
      let enhancedSystemPrompt = systemPrompt;
      if (model.includes('gpt-5') || model.includes('o1')) {
        enhancedSystemPrompt = `${systemPrompt}

IMPORTANT FOR REASONING MODELS:
You are a reasoning model that thinks step-by-step. Please:
1. First, reason through the task internally
2. Then, provide a clear, explicit response 
3. Always end with a specific output or answer
4. For exercise generation, provide the complete JSON structure
5. Do not leave responses empty - always generate the requested content after reasoning

Remember: The user expects to see your final output, not just your reasoning process.`;
      }

      // Prepare the request parameters
      const requestParams: any = {
        model: model,
        messages: [
          {
            role: "system",
            content: enhancedSystemPrompt
          },
          {
            role: "user", 
            content: userPrompt
          }
        ],
        temperature: temperature || 0.7,
      };

      // Handle model-specific token parameters
      let tokenLimit = maxTokens || 2000;
      
      // For reasoning models like GPT-5/o1, use much higher token limits
      // since they use tokens for internal reasoning
      if (model.includes('gpt-5') || model.includes('o1')) {
        // For reasoning models, increase token limit significantly
        tokenLimit = Math.max(tokenLimit, 8000); // Minimum 8000 tokens for reasoning models
        requestParams.max_completion_tokens = tokenLimit;
      } else {
        // Other models use max_tokens
        requestParams.max_tokens = tokenLimit;
      }

      completion = await openai.chat.completions.create(requestParams);
    } catch (openaiError: any) {
      
      // Handle specific OpenAI errors
      if (openaiError.error?.code === 'model_not_found') {
        return NextResponse.json(
          { error: `Model '${model}' not found or not accessible` },
          { status: 400 }
        );
      }
      
      if (openaiError.error?.code === 'insufficient_quota') {
        return NextResponse.json(
          { error: 'OpenAI API quota exceeded' },
          { status: 429 }
        );
      }
      
      if (openaiError.error?.code === 'invalid_api_key') {
        return NextResponse.json(
          { error: 'Invalid OpenAI API key' },
          { status: 401 }
        );
      }
      
      // Generic OpenAI error
      return NextResponse.json(
        { error: `OpenAI API Error: ${openaiError.error?.message || openaiError.message || 'Unknown error'}` },
        { status: 500 }
      );
    }

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // Extract the generated content with enhanced debugging for reasoning models
    const choice = completion.choices[0];
    if (!choice) {
      throw new Error('No choices returned from OpenAI API');
    }

    const generatedContent = choice.message?.content;
    
    // For GPT-5/o1 models, the content might be in alternative locations
    if (!generatedContent && (model.includes('o1') || model.includes('gpt-5'))) {
      // Check for reasoning tokens
      if (completion.usage?.completion_tokens_details?.reasoning_tokens > 0) {
        const reasoningTokens = completion.usage.completion_tokens_details.reasoning_tokens;
        
        // For reasoning models, return helpful guidance instead of throwing an error
        return NextResponse.json({
          success: false,
          error: 'Reasoning model guidance needed',
          reasoning_analysis: {
            model_used: model,
            reasoning_tokens: reasoningTokens,
            completion_tokens: completion.usage.completion_tokens,
            total_tokens: completion.usage.total_tokens
          },
          guidance: {
            title: '🧠 GPT-5 Reasoning Model Detected',
            description: 'Your configuration works, but reasoning models like GPT-5 need specific prompt patterns.',
            recommendations: [
              {
                title: '1. Add explicit output instructions',
                description: 'End your system prompt with: "After thinking through this, provide your final answer as valid JSON."'
              },
              {
                title: '2. Use clear task structure',
                description: 'Structure your user prompt: "Task: [description]. Requirements: [specific format]. Output: [exact format expected]"'
              },
              {
                title: '3. Request explicit reasoning',
                description: 'Add to user prompt: "Think step by step, then provide your final JSON response."'
              },
              {
                title: '4. Specify output format clearly',
                description: 'Be very explicit: "Return ONLY the JSON object, no explanations or additional text."'
              }
            ],
            optimal_system_prompt: `You are an expert Spanish learning exercise generator. Your task is to create high-quality educational exercises.

First, think through:
- The learning objectives for the given level
- Appropriate vocabulary and grammar concepts
- Question difficulty and progression
- Cultural context and relevance

After your analysis, generate a well-structured exercise as valid JSON using the exact schema provided. Return ONLY the JSON object.`,
            optimal_user_prompt: `Create a {{level}} level {{exerciseType}} exercise about "{{topic}}" with {{questionCount}} questions.

Requirements:
- Questions should be appropriate for {{level}} proficiency
- Include clear Danish instructions (instructions_da)
- Each question must have a clear, visible question text
- For fill_blank: Include Spanish sentence with blank (___)
- For multiple_choice: Include clear question in Danish
- Provide correct answers and distractors
- Ensure cultural relevance

{{exerciseInstructions}}

Think through the exercise design, then return ONLY valid JSON using this structure:
{
  "title": "string (exercise title)",
  "instructions_da": "string (Danish instructions)",
  "questions": [
    {
      "id": "number",
      "question_da": "string (Danish question that students see)",
      "question": "string (Target language content/sentence with blank if fill_blank)",
      "correct_answer": "string",
      "options": ["array of answer choices"],
      "explanation_da": "string (Danish explanation)"
    }
  ]
}`
          },
          response_time: responseTime,
          estimated_cost: calculateEstimatedCost(completion.usage, model)
        });
      } else {
        throw new Error(`${model} model returned empty content with no reasoning tokens - unexpected behavior`);
      }
    }
    
    if (!generatedContent) {
      throw new Error('No content generated from OpenAI - the model response was empty');
    }

    // Try to parse the generated content as JSON
    let parsedExercise;
    try {
      parsedExercise = JSON.parse(generatedContent);
    } catch (parseError) {
      // If JSON parsing fails, return the raw content with a note
      parsedExercise = {
        title: `Test Exercise - ${testParams.topic}`,
        description: `Generated content (not JSON): ${generatedContent.substring(0, 200)}...`,
        raw_content: generatedContent,
        questions: []
      };
    }

    // Calculate estimated cost (rough estimates)
    const estimatedCost = calculateEstimatedCost(completion.usage, model);

    // Build response
    const response = {
      success: true,
      exercise: parsedExercise,
      usage: completion.usage,
      model_info: {
        model: completion.model,
        response_time: responseTime
      },
      config_used: {
        id: configId,
        name: configName,
        model,
        temperature,
        token_param: model.includes('gpt-5') || model.includes('o1') ? 'max_completion_tokens' : 'max_tokens',
        token_limit: maxTokens
      },
      test_params: testParams,
      prompt_debug: {
        original_template: userPromptTemplate,
        processed_prompt: userPrompt,
        question_count_requested: testParams.questionCount,
        template_contained_question_count: userPromptTemplate.includes('{{questionCount}}') || 
                                          userPromptTemplate.includes('{{count}}') || 
                                          userPromptTemplate.includes('{{numQuestions}}') ||
                                          userPromptTemplate.includes('{{numberOfQuestions}}') ||
                                          userPromptTemplate.includes('{{questionsCount}}'),
        exercise_structure_analysis: {
          has_questions_array: Array.isArray(parsedExercise.questions),
          question_count_generated: parsedExercise.questions ? parsedExercise.questions.length : 0,
          first_question_fields: parsedExercise.questions && parsedExercise.questions[0] ? 
            Object.keys(parsedExercise.questions[0]) : [],
          sample_question_structure: parsedExercise.questions && parsedExercise.questions[0] ? 
            JSON.stringify(parsedExercise.questions[0], null, 2) : 'No questions generated'
        }
      },
      estimated_cost: estimatedCost
    };

    return NextResponse.json(response);

  } catch (error) {
    
    return NextResponse.json(
      { 
        error: 'Configuration test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    );
  }
}

// Helper function to estimate API costs
function calculateEstimatedCost(usage: any, model: string): string {
  if (!usage) return '0.00';

  // Rough cost estimates per 1K tokens (as of 2024)
  const costPer1K: { [key: string]: { input: number; output: number } } = {
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-5': { input: 0.01, output: 0.03 }, // Estimated
    'gpt-3.5-turbo': { input: 0.001, output: 0.002 }
  };

  const modelCosts = costPer1K[model] || costPer1K['gpt-4o']; // Default to gpt-4o

  const inputCost = (usage.prompt_tokens / 1000) * modelCosts.input;
  const outputCost = (usage.completion_tokens / 1000) * modelCosts.output;
  const totalCost = inputCost + outputCost;

  return totalCost.toFixed(4);
}