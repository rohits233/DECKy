import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch file_path before deleting so we can remove from storage too
    const { data: doc } = await supabase
      .from('documents')
      .select('file_path, file_type')
      .eq('id', params.id)
      .single();

    if (doc?.file_path) {
      await supabase.storage.from('documents').remove([doc.file_path]);
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', params.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Delete failed' },
      { status: 500 },
    );
  }
}
