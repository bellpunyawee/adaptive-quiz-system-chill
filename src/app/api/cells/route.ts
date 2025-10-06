import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cells = await prisma.cell.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ cells });
  } catch (error) {
    console.error('[API] Error fetching cells:', error);
    return NextResponse.json({ error: 'Failed to fetch cells' }, { status: 500 });
  }
}