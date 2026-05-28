// supabase/functions/scan-recipe/index.ts
//
// Deno edge function: ontvangt een base64 foto van een kookboekpagina en vraagt
// Claude Vision om het recept te herkennen. Geeft gestructureerde JSON terug
// die `services/cookbookScanner.ts` direct naar een RecipeFormState kan mappen.
//
// Vereist Supabase secret: ANTHROPIC_API_KEY
// Instellen via: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import Anthropic from 'npm:@anthropic-ai/sdk@^0.24';

const SYSTEM_PROMPT = `Je bent een recept-herkenningstool. De gebruiker geeft je een foto van een kookboekpagina.
Extraheer het recept en geef enkel geldige JSON terug in dit formaat (geen uitleg, geen markdown codeblok):
{
  "title": "string",
  "ingredients": [{ "name": "string", "quantity": number, "unit": "string" }],
  "steps": ["string"],
  "duration": number (minuten, optioneel),
  "servings": number (optioneel)
}
Als er meerdere recepten op de pagina staan, neem het meest prominente.
Ingrediënten zonder hoeveelheid krijgen quantity 1 en unit "".`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY niet geconfigureerd.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: { image: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ongeldige request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!body.image) {
    return new Response(JSON.stringify({ error: 'image veld ontbreekt.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const mimeType = (body.mimeType ?? 'image/jpeg') as
    | 'image/jpeg'
    | 'image/png'
    | 'image/gif'
    | 'image/webp';

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: body.image },
          },
          { type: 'text', text: 'Extraheer het recept van deze kookboekpagina.' },
        ],
      },
    ],
  });

  const rawText =
    response.content[0].type === 'text' ? response.content[0].text : '{}';

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return new Response(
      JSON.stringify({ error: 'Claude gaf geen geldig JSON terug.', raw: rawText }),
      { status: 422, headers: { 'Content-Type': 'application/json' } },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return new Response(
      JSON.stringify({ error: 'JSON-parse mislukt.', raw: rawText }),
      { status: 422, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify(parsed), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
