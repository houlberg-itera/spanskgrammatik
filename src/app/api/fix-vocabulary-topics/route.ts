import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TOPIC_NAME_MAPPING: Record<string, string> = {
  'política': 'Politik og samfund',
  'educación': 'Uddannelse',
  'medioambiente': 'Miljø og natur',
  'tecnología': 'Teknologi',
  'familia': 'Familie',
  'colores': 'Farver',
  'números': 'Tal 1-20',
  'casa': 'Hus og møbler',
  'comida': 'Mad og drikke',
  'ropa': 'Tøj',
  'transporte': 'Transport og rejser',
  'profesiones': 'Arbejde og professioner',
  'cuerpo': 'Krop og sundhed',
  'tiempo': 'Vejr og årstider',
  'deportes': 'Sport og fritid'
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Find all topics with keys as name_da (vocabulary topics)
    const { data: topics, error: fetchError } = await supabase
      .from('topics')
      .select('*')
      .in('name_da', Object.keys(TOPIC_NAME_MAPPING));

    if (fetchError) {
      console.error('Error fetching topics:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch topics', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!topics || topics.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No vocabulary topics found to fix',
        updated: 0
      });
    }

    // Update each topic with proper Danish name
    const updates = [];
    for (const topic of topics) {
      const properName = TOPIC_NAME_MAPPING[topic.name_da];
      if (properName && properName !== topic.name_da) {
        const { error: updateError } = await supabase
          .from('topics')
          .update({
            name_da: properName,
            description_da: `AI-genererede ordforrådsøvelser for ${properName}`
          })
          .eq('id', topic.id);

        if (updateError) {
          console.error(`Error updating topic ${topic.id}:`, updateError);
        } else {
          updates.push({
            id: topic.id,
            old_name: topic.name_da,
            new_name: properName
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updates.length} vocabulary topics`,
      updates
    });

  } catch (error) {
    console.error('Error fixing vocabulary topics:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
