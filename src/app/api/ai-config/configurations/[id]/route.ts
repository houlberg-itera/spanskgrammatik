import { NextRequest, NextResponse } from 'next/server';
import { getConfigurationById, updateConfiguration, deleteConfiguration } from '@/lib/ai-config';

// GET /api/ai-config/configurations/[id] - Get specific configuration
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const configId = parseInt(id);
    if (isNaN(configId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid configuration ID' },
        { status: 400 }
      );
    }

    const configuration = await getConfigurationById(configId);
    if (!configuration) {
      return NextResponse.json(
        { success: false, error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: configuration 
    });
  } catch (error) {
    console.error('Failed to fetch configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/ai-config/configurations/[id] - Update configuration
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const configId = parseInt(id);
    if (isNaN(configId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid configuration ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updatedConfiguration = await updateConfiguration(configId, body);

    return NextResponse.json({ 
      success: true, 
      data: updatedConfiguration 
    });
  } catch (error) {
    console.error('Failed to update configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

// DELETE /api/ai-config/configurations/[id] - Delete configuration
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const configId = parseInt(id);
    if (isNaN(configId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid configuration ID' },
        { status: 400 }
      );
    }

    await deleteConfiguration(configId);

    return NextResponse.json({ 
      success: true, 
      message: 'Configuration deleted successfully' 
    });
  } catch (error) {
    console.error('Failed to delete configuration:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete configuration' },
      { status: 500 }
    );
  }
}