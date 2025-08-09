// API route pour analyser la qualité des pages produits live

interface RequestLike {
  query?: Record<string, string | string[]>;
}

interface ResponseLike {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
}

// Handler compatible Vercel
export default async function handler(req: RequestLike, res: ResponseLike) {
  const url = typeof req.query?.url === 'string' ? req.query.url : undefined;

  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  try {
    const response = await fetch(url);
    const html = await response.text();

    const checks = {
      hasTitle: /<title>.*<\/title>/i.test(html),
      hasMetaDescription: /<meta[^>]+name=["']description["'][^>]*>/i.test(html),
      hasProductSchema: /"@type"\s*:\s*"Product"/i.test(html),
    };

    res.status(200).json({ url, checks });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
