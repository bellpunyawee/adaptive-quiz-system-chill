import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

// Max file size: 10MB for datasets
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed file types for datasets
const ALLOWED_TYPES = [
  'text/csv',
  'application/csv',
  'application/json',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
];

const ALLOWED_EXTENSIONS = ['.csv', '.json', '.xlsx', '.xls'];

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
}

function isValidFileType(file: File): boolean {
  // Check MIME type
  if (ALLOWED_TYPES.includes(file.type)) {
    return true;
  }

  // Fallback to extension check (some browsers may not set correct MIME type)
  const extension = getFileExtension(file.name);
  return ALLOWED_EXTENSIONS.includes(extension);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Check admin/instructor role
    const userRole = (session.user as any).role;
    if (userRole !== 'admin' && userRole !== 'instructor') {
      return NextResponse.json(
        { error: 'Forbidden: Admin or instructor access required' },
        { status: 403 }
      );
    }

    // 3. Check BLOB token is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error('BLOB_READ_WRITE_TOKEN not configured');
      return NextResponse.json(
        { error: 'Server configuration error: Blob storage not configured' },
        { status: 500 }
      );
    }

    // 4. Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // 5. Validate file type
    if (!isValidFileType(file)) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Allowed types: CSV, JSON, Excel (.xlsx, .xls)',
          allowedTypes: ALLOWED_EXTENSIONS
        },
        { status: 400 }
      );
    }

    // 6. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          maxSize: MAX_FILE_SIZE
        },
        { status: 400 }
      );
    }

    // 7. Generate unique filename
    const extension = getFileExtension(file.name);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `question-datasets/${timestamp}-${random}${extension}`;

    // 8. Upload to Vercel Blob
    const blob = await put(filename, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // 9. Return success with URL and original filename
    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: file.name, // Original filename for display
      pathname: blob.pathname,
      size: file.size,
    });

  } catch (error) {
    console.error('Dataset upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload dataset file' },
      { status: 500 }
    );
  }
}
