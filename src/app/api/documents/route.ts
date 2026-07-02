import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// ============================================================
// DYNAMIC TABLE CREATION
// ============================================================

async function ensureTables(): Promise<void> {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Document" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "businessId" TEXT NOT NULL DEFAULT '',
        "title" TEXT NOT NULL DEFAULT '',
        "type" TEXT NOT NULL DEFAULT 'general',
        "category" TEXT NOT NULL DEFAULT 'general',
        "fileUrl" TEXT,
        "fileName" TEXT,
        "fileSize" INTEGER NOT NULL DEFAULT 0,
        "mimeType" TEXT,
        "description" TEXT,
        "content" TEXT,
        "tags" TEXT,
        "chatId" INTEGER NOT NULL DEFAULT 0,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err: any) {
    console.error('[ensureTables:Document]', err?.message);
  }
}

// ============================================================
// SQL ESCAPE HELPER
// ============================================================

const esc = (s: string) => (s || '').replace(/'/g, "''");

// ============================================================
// TYPES
// ============================================================

interface DocumentRow {
  id: string;
  businessId: string;
  title: string;
  type: string;
  category: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number;
  mimeType: string | null;
  description: string | null;
  content: string | null;
  tags: string | null;
  chatId: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// GET — List documents with filters + stats
// ============================================================

export async function GET(request: NextRequest) {
  try {
    await ensureTables();

    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('businessId') || '';
    const type = searchParams.get('type') || '';
    const category = searchParams.get('category') || '';
    const search = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Build dynamic WHERE clause
    const conditions: string[] = ['1=1'];
    if (businessId) conditions.push(`"businessId" = '${esc(businessId)}'`);
    if (type) conditions.push(`"type" = '${esc(type)}'`);
    if (category) conditions.push(`"category" = '${esc(category)}'`);
    if (search) {
      conditions.push(`("title" LIKE '%${esc(search)}%' OR "description" LIKE '%${esc(search)}%' OR "tags" LIKE '%${esc(search)}%')`);
    }

    const whereClause = conditions.join(' AND ');

    const documents = await db.$queryRawUnsafe<DocumentRow[]>(
      `SELECT * FROM "Document" WHERE ${whereClause} ORDER BY "createdAt" DESC LIMIT ${limit}`
    );

    // Calculate stats
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalFileSize = 0;

    for (const d of documents) {
      byType[d.type] = (byType[d.type] || 0) + 1;
      byCategory[d.category] = (byCategory[d.category] || 0) + 1;
      totalFileSize += Number(d.fileSize) || 0;
    }

    const stats = {
      total: documents.length,
      totalFileSize,
      byType,
      byCategory,
    };

    return NextResponse.json({ success: true, documents, stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ============================================================
// POST — Create a new document
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const id = randomUUID();
    const now = new Date().toISOString();

    const businessId = body.businessId || '';
    const title = body.title || 'Untitled Document';
    const type = body.type || 'general';
    const category = body.category || 'general';
    const fileUrl = body.fileUrl || '';
    const fileName = body.fileName || '';
    const fileSize = parseInt(body.fileSize, 10) || 0;
    const mimeType = body.mimeType || '';
    const description = body.description || '';
    const content = body.content || '';
    const tags = body.tags || '';
    const chatId = parseInt(body.chatId, 10) || 0;

    await ensureTables();

    await db.$executeRawUnsafe(
      `INSERT INTO "Document" ("id","businessId","title","type","category","fileUrl","fileName","fileSize","mimeType","description","content","tags","chatId","createdAt","updatedAt")
       VALUES ('${esc(id)}','${esc(businessId)}','${esc(title)}','${esc(type)}','${esc(category)}','${esc(fileUrl)}','${esc(fileName)}',${fileSize},'${esc(mimeType)}','${esc(description)}','${esc(content)}','${esc(tags)}',${chatId},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`
    );

    const document = {
      id,
      businessId,
      title,
      type,
      category,
      fileUrl,
      fileName,
      fileSize,
      mimeType,
      description,
      content,
      tags,
      chatId,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({ success: true, document });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}