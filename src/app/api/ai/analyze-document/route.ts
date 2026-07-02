import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';
import ZAI from 'z-ai-web-dev-sdk';

const DOCUMENT_ANALYSIS_PROMPT = `You are an expert document analysis assistant. Analyze the provided document (PDF, image, or text document) and extract structured information.

Return your response as a valid JSON object with exactly these fields:
{
  "summary": string (a concise 2-4 sentence summary of the document's content and purpose),
  "keyPoints": [string] (list of 3-8 key points, each a concise sentence),
  "entities": {
    "people": [string] (names of people mentioned),
    "organizations": [string] (organizations/companies mentioned),
    "dates": [string] (significant dates mentioned),
    "locations": [string] (places/locations referenced),
    "amounts": [string] (monetary amounts or quantities mentioned)
  },
  "sentiment": string (one of: "positive", "negative", "neutral", "mixed"),
  "language": string (primary language of the document, e.g. "English", "Amharic"),
  "documentType": string (e.g. "Invoice", "Contract", "Letter", "Report", "Resume", "Certificate", "Form", "Other"),
  "keywords": [string] (5-10 relevant keywords/tags),
  "confidence": number (0-1 confidence score of the analysis)
}

Important:
- Only return the JSON object, no markdown formatting, no code blocks, no explanation.
- Be thorough but concise.
- If a section cannot be determined, use empty arrays or null.`;

// ============================================================
// DYNAMIC TABLE CREATION
// ============================================================

async function ensureTable(): Promise<void> {
  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "DocumentAnalysis" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL DEFAULT '',
        "fileName" TEXT NOT NULL DEFAULT '',
        "mimeType" TEXT NOT NULL DEFAULT '',
        "summary" TEXT,
        "keyPoints" TEXT,
        "entities" TEXT,
        "sentiment" TEXT NOT NULL DEFAULT 'neutral',
        "language" TEXT,
        "documentType" TEXT,
        "keywords" TEXT,
        "confidence" REAL NOT NULL DEFAULT 0,
        "rawContent" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('already exists')) {
      console.error('ensureTable error:', msg);
    }
  }
}

// ============================================================
// POST — Analyze a document using VLM
// ============================================================

export async function POST(request: NextRequest) {
  try {
    await ensureTable();

    const body = await request.json();
    const { file, fileName, mimeType, userId } = body;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Base64-encoded file is required. Provide it as the "file" field.' },
        { status: 400 }
      );
    }

    const detectedMimeType = mimeType || 'application/pdf';
    const safeFileName = fileName || 'uploaded-document';

    // Build data URI based on file type
    let dataUri: string;
    if (file.startsWith('data:')) {
      dataUri = file;
    } else if (detectedMimeType === 'application/pdf') {
      dataUri = `data:application/pdf;base64,${file}`;
    } else if (detectedMimeType.startsWith('image/')) {
      dataUri = `data:${detectedMimeType};base64,${file}`;
    } else {
      // Default to image/jpeg for unknown image types
      dataUri = `data:image/jpeg;base64,${file}`;
    }

    const zai = await ZAI.create();

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: DOCUMENT_ANALYSIS_PROMPT },
            { type: 'file_url', file_url: { url: dataUri } }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    });

    const rawContent = response.choices?.[0]?.message?.content;

    if (!rawContent) {
      return NextResponse.json(
        { success: false, error: 'No content returned from vision model.' },
        { status: 500 }
      );
    }

    // Parse the JSON response — handle potential markdown code block wrapping
    let parsed: Record<string, unknown>;
    try {
      let cleaned = rawContent.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If parsing fails, return raw content for the client to handle
      return NextResponse.json({
        success: true,
        raw: rawContent,
        warning: 'Failed to parse AI response as JSON. Raw content returned.',
      });
    }

    // Store analysis result in the database
    const id = randomUUID();
    const safeUserId = userId || '';
    const summary = (parsed.summary as string) || null;
    const keyPoints = parsed.keyPoints ? JSON.stringify(parsed.keyPoints) : null;
    const entities = parsed.entities ? JSON.stringify(parsed.entities) : null;
    const sentiment = (parsed.sentiment as string) || 'neutral';
    const language = (parsed.language as string) || null;
    const documentType = (parsed.documentType as string) || null;
    const keywords = parsed.keywords ? JSON.stringify(parsed.keywords) : null;
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;

    try {
      await db.$executeRawUnsafe(`
        INSERT INTO "DocumentAnalysis" ("id", "userId", "fileName", "mimeType", "summary", "keyPoints", "entities", "sentiment", "language", "documentType", "keywords", "confidence", "rawContent", "createdAt")
        VALUES ('${id.replace(/'/g, "''")}', '${safeUserId.replace(/'/g, "''")}', '${safeFileName.replace(/'/g, "''")}', '${detectedMimeType.replace(/'/g, "''")}', ${summary ? `'${summary.replace(/'/g, "''")}'` : 'NULL'}, ${keyPoints ? `'${keyPoints.replace(/'/g, "''")}'` : 'NULL'}, ${entities ? `'${entities.replace(/'/g, "''")}'` : 'NULL'}, '${sentiment.replace(/'/g, "''")}', ${language ? `'${language.replace(/'/g, "''")}'` : 'NULL'}, ${documentType ? `'${documentType.replace(/'/g, "''")}'` : 'NULL'}, ${keywords ? `'${keywords.replace(/'/g, "''")}'` : 'NULL'}, ${confidence}, '${rawContent.replace(/'/g, "''")}', CURRENT_TIMESTAMP)
      `);
    } catch (dbErr) {
      console.error('Failed to store document analysis:', dbErr);
      // Don't fail the request — the analysis was successful, just the storage failed
    }

    return NextResponse.json({
      success: true,
      data: parsed,
      analysisId: id,
    });
  } catch (error) {
    console.error('Document analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze document. Please try again.' },
      { status: 500 }
    );
  }
}