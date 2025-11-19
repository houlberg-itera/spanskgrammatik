# Conversation Practice Feature

## Overview
The conversation practice feature enables users to practice real-world conversations in Spanish or Portuguese using AI-powered dialogues with Text-to-Speech (TTS) and Speech Recognition capabilities.

## Features
- 🎤 **Voice Recording**: Record your responses using your device's microphone
- 🔊 **Audio Playback**: Listen to native pronunciation of dialogue lines
- 📊 **Pronunciation Scoring**: Get instant feedback on your pronunciation accuracy
- 💬 **Realistic Scenarios**: Practice common situations like ordering at a café or introducing yourself
- 🌐 **Multi-language**: Supports both Spanish (es) and Portuguese (pt)
- 📝 **Hints & Translations**: Get helpful hints and see translations when needed

## Architecture

### Database Schema
The feature uses 4 main tables:
1. **conversation_scenarios**: Stores conversation scenarios with metadata
2. **conversation_dialogues**: Individual dialogue lines within scenarios
3. **user_conversation_sessions**: Tracks user practice sessions
4. **user_conversation_responses**: Stores user recordings with scoring

### MCP Server Integration
The feature is designed to work with MCP servers for TTS and Speech Recognition:

#### TTS Providers (Text-to-Speech)
- **OpenAI TTS**: Default provider, good quality and fast
- **ElevenLabs**: Premium quality, more natural voices
- **Azure TTS**: Microsoft's TTS with pronunciation assessment

#### Speech Recognition Providers
- **OpenAI Whisper**: Default, excellent accuracy
- **Azure Speech**: Includes pronunciation assessment
- **Google Cloud Speech**: Alternative option

### File Structure
```
src/
├── app/
│   ├── conversation/
│   │   ├── page.tsx                    # List of scenarios
│   │   └── [id]/page.tsx               # Practice interface
│   └── api/
│       ├── conversation/
│       │   ├── scenarios/
│       │   │   ├── route.ts            # GET scenarios
│       │   │   └── [id]/route.ts       # GET single scenario
│       │   ├── sessions/
│       │   │   ├── route.ts            # POST/GET sessions
│       │   │   └── [id]/route.ts       # GET/PATCH session
│       │   └── responses/
│       │       └── route.ts            # POST user response
│       ├── tts/
│       │   └── openai/route.ts         # TTS generation
│       └── speech/
│           └── whisper/route.ts        # Speech transcription
├── components/
│   └── ConversationPractice.tsx        # Main practice component
└── lib/
    └── mcp/
        ├── tts-client.ts               # TTS client library
        └── speech-client.ts            # Speech recognition library
```

## Setup Instructions

### 1. Run Database Migration
Execute the SQL migration to create the required tables:

```bash
# Copy the migration content from migrations/06_conversation_practice_schema.sql
# and run it in your Supabase SQL editor
```

The migration includes:
- Table creation with proper RLS policies
- Sample conversation scenarios (Spanish and Portuguese)
- Sample dialogues for café ordering scenario

### 2. Configure Environment Variables
Add these to your `.env.local` file:

```env
# OpenAI (required for default TTS and Whisper)
OPENAI_API_KEY=your_openai_api_key

# Optional: Enable MCP server mode (future feature)
NEXT_PUBLIC_MCP_TTS_ENABLED=false
NEXT_PUBLIC_MCP_SPEECH_ENABLED=false

# Optional: ElevenLabs (premium TTS)
ELEVENLABS_API_KEY=your_elevenlabs_key

# Optional: Azure (includes pronunciation assessment)
AZURE_SPEECH_KEY=your_azure_key
AZURE_SPEECH_REGION=your_azure_region
```

### 3. Install Dependencies
No additional dependencies needed - uses existing OpenAI SDK.

### 4. Deploy & Test
1. Run development server: `npm run dev`
2. Navigate to `/conversation` to see available scenarios
3. Click on a scenario to start practicing
4. Allow microphone permissions when prompted

## Usage Guide

### For Users
1. **Browse Scenarios**: Go to `/conversation` to see available practice scenarios
2. **Filter**: Select language (Spanish/Portuguese) and level (A1/A2/B1)
3. **Start Practice**: Click on a scenario to begin
4. **Listen**: Click play (▶️) to hear the dialogue
5. **Record**: Click "Start optagelse" to record your response
6. **Get Feedback**: See your pronunciation and accuracy scores
7. **Continue**: Progress through the dialogue until completion

### For Admins
Create new scenarios directly in the database:

```sql
-- Insert new scenario
INSERT INTO conversation_scenarios (
  title_da, title, description_da, description,
  target_language, level, context_da, context
) VALUES (
  'Danish title', 'Spanish/Portuguese title',
  'Danish description', 'Spanish/Portuguese description',
  'es', -- or 'pt'
  'A1', -- or 'A2', 'B1'
  'Danish context', 'Spanish/Portuguese context'
);

-- Insert dialogues for the scenario
INSERT INTO conversation_dialogues (
  scenario_id, sequence_order, speaker_role,
  text, text_translation, is_user_turn, expected_response, hints_da
) VALUES (
  'scenario-uuid',
  1, -- sequence order
  'waiter', -- or 'student', 'teacher', etc.
  '¡Hola! ¿Qué deseas?',
  'Hej! Hvad ønsker du?',
  false, -- not user turn
  NULL,
  NULL
);
```

## API Endpoints

### Scenarios
- `GET /api/conversation/scenarios` - List scenarios
  - Query params: `language` (es/pt), `level` (A1/A2/B1)
- `GET /api/conversation/scenarios/[id]` - Get scenario with dialogues

### Sessions
- `POST /api/conversation/sessions` - Create new session
  - Body: `{ scenario_id: string }`
- `GET /api/conversation/sessions` - List user's sessions
  - Query params: `status` (in_progress/completed)
- `PATCH /api/conversation/sessions/[id]` - Update session progress

### Responses
- `POST /api/conversation/responses` - Save user response with scoring
  - Body: `{ session_id, dialogue_id, transcribed_text, pronunciation_score, ... }`

### TTS & Speech
- `POST /api/tts/openai` - Generate speech from text
- `POST /api/speech/whisper` - Transcribe audio

## Scoring System

### Pronunciation Score (0-100)
- Measures how well the user pronounced the words
- Based on word-level matching with levenshtein distance
- Gives partial credit for close matches

### Accuracy Score (0-100)
- Measures how closely the response matches the expected text
- More strict than pronunciation score
- Uses levenshtein distance on full text

### Feedback Generation
- Automatic feedback based on scores:
  - 80-100%: Excellent
  - 60-79%: Good effort
  - <60%: Keep practicing

## Future Enhancements

### MCP Server Integration
Currently uses direct API calls to OpenAI. Future versions will support connecting to MCP servers:

```typescript
// Enable MCP mode
NEXT_PUBLIC_MCP_TTS_ENABLED=true
NEXT_PUBLIC_MCP_SPEECH_ENABLED=true

// MCP will handle provider routing
await generateSpeech({ text, language, provider: 'elevenlabs' });
```

### Additional Features
- Role-play mode (user plays different roles)
- Conversation branching (multiple response paths)
- Group conversations (3+ participants)
- Custom scenarios (user-generated content)
- AI conversation partner (free-form dialogue)
- Progress analytics dashboard
- Vocabulary extraction from dialogues
- Spaced repetition for difficult phrases

## Troubleshooting

### Microphone Not Working
1. Check browser permissions: Settings → Privacy → Microphone
2. Use HTTPS (required for getUserMedia API)
3. Test with `navigator.mediaDevices.enumerateDevices()`

### Audio Not Playing
1. Check audio file format (should be MP3 from OpenAI TTS)
2. Verify CORS headers if using external audio hosting
3. Check browser console for errors

### Low Pronunciation Scores
1. Ensure clear audio recording (reduce background noise)
2. Speak clearly and at moderate pace
3. Check if Whisper is transcribing correctly
4. Consider using Azure Speech for more detailed word-level scoring

### Database Errors
1. Verify RLS policies are set correctly
2. Check user authentication status
3. Ensure foreign key relationships are valid
4. Review Supabase logs for detailed errors

## Performance Optimization

### Pre-generate Audio
Run this to pre-generate TTS audio for all dialogues:

```typescript
import { pregenerateScenarioAudio } from '@/lib/mcp/tts-client';

// Pre-generate for a scenario
await pregenerateScenarioAudio('scenario-id', 'es', 'openai');
```

### Caching
- Audio files should be cached in CDN
- Use Supabase storage for audio_url fields
- Consider edge functions for faster API responses

## Security Considerations

1. **RLS Policies**: Users can only access their own sessions and responses
2. **Audio Upload**: Sanitize and validate audio files
3. **Rate Limiting**: Implement rate limits on TTS/Speech APIs
4. **API Keys**: Never expose API keys in client-side code
5. **Content Moderation**: Monitor user-generated recordings

## Cost Estimation

### OpenAI TTS
- $15 per 1M characters
- Average dialogue: ~50 characters = $0.00075

### OpenAI Whisper
- $0.006 per minute
- Average recording: ~10 seconds = $0.001

### Total per session (10 dialogues)
- TTS: ~$0.0075
- Whisper: ~$0.01
- **Total: ~$0.02 per session**

## Support

For issues or questions:
1. Check console logs for errors
2. Review Supabase logs
3. Test with minimal scenario first
4. Create GitHub issue with reproduction steps
