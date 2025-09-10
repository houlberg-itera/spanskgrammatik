import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test the sample data loading by calling our own API
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    console.log('Testing sample data loading...');
    
    // First check current state
    const checkResponse = await fetch(`${baseUrl}/api/load-sample-data`);
    const currentState = await checkResponse.json();
    
    console.log('Current state:', currentState);
    
    // If we have fewer than 5 exercises, load sample data
    if (currentState.totalExercises < 5) {
      console.log('Loading sample data...');
      
      const loadResponse = await fetch(`${baseUrl}/api/load-sample-data-simple`, {
        method: 'POST'
      });
      
      const loadResult = await loadResponse.json();
      console.log('Load result:', loadResult);
      
      // Check final state
      const finalResponse = await fetch(`${baseUrl}/api/load-sample-data`);
      const finalState = await finalResponse.json();
      
      return NextResponse.json({
        action: 'loaded_sample_data',
        loadResult,
        before: currentState,
        after: finalState,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        action: 'sample_data_already_sufficient',
        currentState,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Auto-load error:', error);
    return NextResponse.json({
      error: 'Auto-load failed',
      message: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
