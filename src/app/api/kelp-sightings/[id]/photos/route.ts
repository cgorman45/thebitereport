import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/supabase/middleware';

export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'video/mp4',
  'video/quicktime',
]);

// POST /api/kelp-sightings/[id]/photos — auth required, multipart form data
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: sightingId } = await params;
  const { user, error, supabase } = await getAuthUser(req);
  if (error) return error;

  // Verify sighting exists
  const { data: sighting, error: sightingError } = await supabase!
    .from('kelp_sightings')
    .select('id')
    .eq('id', sightingId)
    .single();

  if (sightingError || !sighting) {
    return NextResponse.json({ error: 'Sighting not found' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File size must be 10MB or less' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: 'File type must be image/jpeg, image/png, image/heic, video/mp4, or video/quicktime' },
      { status: 400 },
    );
  }

  const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
  const ext = file.name.split('.').pop() ?? 'bin';
  const filename = `${Date.now()}.${ext}`;
  const storagePath = `${user!.id}/${sightingId}/${filename}`;

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase!.storage
    .from('kelp-photos')
    .upload(storagePath, fileBuffer, { contentType: file.type, upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = supabase!.storage
    .from('kelp-photos')
    .getPublicUrl(storagePath);

  const { data: photo, error: dbError } = await supabase!
    .from('sighting_photos')
    .insert({
      sighting_id: sightingId,
      user_id: user!.id,
      storage_path: storagePath,
      media_type: mediaType,
    })
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Update user contributions: +1 photos_count, +3 contribution_score
  await supabase!
    .from('user_contributions')
    .upsert(
      {
        user_id: user!.id,
        sightings_count: 0,
        verifications_count: 0,
        photos_count: 1,
        contribution_score: 3,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id', ignoreDuplicates: false },
    );

  return NextResponse.json({ ...photo, public_url: publicUrl }, { status: 201 });
}
