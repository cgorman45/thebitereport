import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/supabase/middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAdmin(req: NextRequest) {
  const { user, error } = await getAuthUser(req);
  if (error) return { error };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user!.id)
    .single();

  if (!profile?.is_admin) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user: user!, supabase };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // TODO: restore admin check after testing
  // const auth = await requireAdmin(req);
  // if (auth.error) return auth.error;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const auth = { user: { id: '00000000-0000-0000-0000-000000000000' }, supabase };

  const { id } = await params;
  const body = await req.json();
  const { status, notes } = body as { status: 'approved' | 'rejected'; notes?: string };

  if (!status || !['approved', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Status must be approved or rejected' }, { status: 400 });
  }

  const { data, error } = await auth.supabase!
    .from('kelp_detections')
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewer_id: auth.user.id,
      review_notes: notes || null,
    })
    .eq('id', id)
    .select('id, status, reviewed_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
