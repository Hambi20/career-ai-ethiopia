import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

const RECEIPT_EXTRACTION_PROMPT = `You are an expert receipt and invoice data extraction assistant. Analyze the provided receipt/invoice image and extract all relevant information.

Return your response as a valid JSON object with exactly these fields (use null if a field cannot be determined):
{
  "amount": number (total amount as a number, e.g. 45.99),
  "currency": string (e.g. "ETB", "USD", "EUR"),
  "date": string (date in YYYY-MM-DD format, or best guess),
  "merchantName": string (name of the store/merchant/business),
  "category": string (e.g. "Food & Dining", "Groceries", "Transport", "Shopping", "Healthcare", "Utilities", "Entertainment", "Other"),
  "items": [
    {
      "name": string,
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number
    }
  ],
  "tax": number | null,
  "subtotal": number | null,
  "paymentMethod": string | null (e.g. "Cash", "Card", "Mobile Money"),
  "notes": string | null (any additional observations)
}

Important:
- Only return the JSON object, no markdown formatting, no code blocks, no explanation.
- Be as accurate as possible with the numbers.
- If the currency symbol is unclear, infer from context or default to "ETB" for Ethiopian receipts.
- Extract all individual line items if visible.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, userId } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Base64-encoded image is required. Provide it as the "image" field.' },
        { status: 400 }
      );
    }

    // Strip data URI prefix if already included
    let base64Image = image;
    if (base64Image.startsWith('data:')) {
      base64Image = base64Image;
    } else {
      base64Image = `data:image/jpeg;base64,${base64Image}`;
    }

    const zai = await ZAI.create();

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: RECEIPT_EXTRACTION_PROMPT },
            { type: 'image_url', image_url: { url: base64Image } }
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
      // Remove ```json and ``` wrappers if present
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

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error('Receipt analysis error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze receipt. Please try again.' },
      { status: 500 }
    );
  }
}