import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: 'file and projectId required' },
        { status: 400 }
      );
    }

    const filePath = `${user.id}/${projectId}/${file.name}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: doc, error: insertError } = await supabase
      .from('documents')
      .insert({
        project_id: projectId,
        filename: file.name,
        file_path: filePath,
        file_type: file.type,
        status: 'pending',
        type: file.name.toLowerCase().includes('transcript') ? 'transcript' : 'research',
      })
      .select('id, filename, status, type')
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    return NextResponse.json({
      document: doc,
      message: 'Document uploaded. Run the pipeline to process.',
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}
