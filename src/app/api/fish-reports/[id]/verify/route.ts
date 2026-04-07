import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

// POST /api/fish-reports/[id]/verify — auth required, toggles verification
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await params;
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  // Check if user already verified this report
  const { data: existing, error: checkError } = await supabase!
    .from('fish_report_verifications')
    .select('id')
    .eq('report_id', reportId)
    .eq('user_id', user!.id)
    .maybeSingle();

  if (checkError) return NextResponse.json({ error: checkError.message }, { status: 500 });

  let verified: boolean;

  if (existing) {
    // Toggle off — remove verification
    const { error: deleteError } = await supabase!
      .from('fish_report_verifications')
      .delete()
      .eq('id', existing.id);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    verified = false;
  } else {
    // Toggle on — insert verification (trigger handles count + auto-verify)
    const { error: insertError } = await supabase!
      .from('fish_report_verifications')
      .insert({ report_id: reportId, user_id: user!.id });

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    verified = true;
  }

  // Fetch current verification count (trigger may have updated it)
  const { data: report, error: fetchError } = await supabase!
    .from('fish_reports')
    .select('verification_count')
    .eq('id', reportId)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });

  return NextResponse.json({
    verified,
    verification_count: report.verification_count,
  });
}
