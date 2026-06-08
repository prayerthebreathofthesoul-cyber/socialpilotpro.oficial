import type { VercelRequest, VercelResponse } from "@vercel/node";

type PexelsPhoto = {
  id: number;
  alt: string;
  photographer: string;
  photographer_url: string;
  url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método não permitido",
    });
  }

  try {
    const apiKey = process.env.PEXELS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "PEXELS_API_KEY não configurada no servidor.",
      });
    }

    const query = String(req.query.query || "").trim();
    const page = String(req.query.page || "1");
    const perPage = String(req.query.per_page || "12");

    if (!query) {
      return res.status(400).json({
        error: "Digite uma palavra-chave para buscar imagens.",
      });
    }

    const params = new URLSearchParams({
      query,
      page,
      per_page: perPage,
      locale: "pt-BR",
    });

    const pexelsResponse = await fetch(
      `https://api.pexels.com/v1/search?${params.toString()}`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!pexelsResponse.ok) {
      return res.status(pexelsResponse.status).json({
        error: "Erro ao buscar imagens no Pexels.",
      });
    }

    const data = await pexelsResponse.json();

    const photos = (data.photos || []).map((photo: PexelsPhoto) => ({
      id: photo.id,
      alt: photo.alt || "Imagem do Pexels",
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
      pexelsUrl: photo.url,
      imageUrl: photo.src.large,
      previewUrl: photo.src.medium,
      originalUrl: photo.src.original,
    }));

    return res.status(200).json({
      page: data.page,
      perPage: data.per_page,
      totalResults: data.total_results,
      nextPage: data.next_page,
      photos,
    });
  } catch (error) {
    console.error("Erro na rota /api/pexels/search:", error);

    return res.status(500).json({
      error: "Erro interno ao buscar imagens grátis.",
    });
  }
}
