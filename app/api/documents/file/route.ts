import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pool } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing document id' }, { status: 400 });
    }

    const docRes = await pool.query(
      `SELECT id, original_filename, mime_type, storage_uri, source_path, file_data
       FROM documents
       WHERE id = $1`,
      [id]
    );

    const doc = docRes.rows[0];
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    let fileBuffer: Buffer | null = null;
    let mimeType = doc.mime_type || 'application/pdf';
    const filename = doc.original_filename || 'document.pdf';
    const ext = path.extname(filename).toLowerCase();

    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';
    else if (ext === '.webp') mimeType = 'image/webp';

    // 1. First priority: Base64 file_data from PostgreSQL database
    if (doc.file_data) {
      try {
        fileBuffer = Buffer.from(doc.file_data, 'base64');
      } catch (e) {
        console.warn('Failed to decode base64 file_data:', e);
      }
    }

    // 2. Second priority: Storage URI or source path on disk
    if (!fileBuffer && doc.source_path && existsSync(doc.source_path)) {
      try {
        fileBuffer = await fs.readFile(doc.source_path);
      } catch (e) {
        console.warn('Failed to read from source_path:', e);
      }
    }

    if (!fileBuffer) {
      return NextResponse.json(
        { error: 'Original document binary could not be located in database or disk storage.' },
        { status: 404 }
      );
    }

    const safeFilename = filename.replace(/["\r\n]/g, '_');

    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': fileBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${safeFilename}"`,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error: any) {
    console.error('Document file serve error:', error);
    return NextResponse.json({ error: error.message || 'Error serving document file' }, { status: 500 });
  }
}
