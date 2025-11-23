import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;

const META_KEYS = [
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "twitter:image",
  "twitter:image:src",
];

const parseMetaImage = (html: string) => {
  const metaMatches = [
    ...html.matchAll(
      /<meta\s+(?:[^>]*?)(?:property|name)=["']([^"']+)["'][^>]*content=["']([^"']+)["'][^>]*>/gi
    ),
  ];

  const metaMap = new Map<string, string>();
  metaMatches.forEach((match) => {
    const key = match[1]?.toLowerCase();
    const value = match[2];
    if (key && value) {
      metaMap.set(key, value);
    }
  });

  for (const candidate of META_KEYS) {
    const found = metaMap.get(candidate);
    if (found) return found;
  }

  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  return imgMatch ? imgMatch[1] : null;
};

const absolutize = (src: string, baseUrl: string) => {
  try {
    return new URL(src, baseUrl).toString();
  } catch {
    return null;
  }
};

export async function GET(request: NextRequest) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url manquant", imageUrl: null }, { status: 400 });
  }

  try {
    const target = new URL(url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(target.toString(), {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; WishlistBot/1.0; +https://family-wishlist)",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({ imageUrl: null }, { status: 200 });
    }

    const rawHtml = await response.text();
    const html = rawHtml.slice(0, 200_000);
    const found = parseMetaImage(html);
    const imageUrl = found ? absolutize(found, target.toString()) : null;

    return NextResponse.json({ imageUrl: imageUrl ?? null });
  } catch (error) {
    console.error("link-preview error", error);
    return NextResponse.json({ imageUrl: null }, { status: 200 });
  }
}
