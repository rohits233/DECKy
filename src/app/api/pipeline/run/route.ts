import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { runPipeline } from '@/lib/pipeline';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, documentIds, prompt, projectTitle, generateScripts = true } = body;

    if (!projectId || !documentIds || !Array.isArray(documentIds)) {
      return NextResponse.json(
        { error: 'projectId and documentIds (array) required' },
        { status: 400 }
      );
    }

    const result = await runPipeline({
      documentIds,
      projectId,
      projectTitle,
      userId: user.id,
      prompt,
      generateScripts,
      supabase,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Pipeline error:', error);
    return NextResponse.json(
      { error: error.message || 'Pipeline failed' },
      { status: 500 }
    );
  }
}
