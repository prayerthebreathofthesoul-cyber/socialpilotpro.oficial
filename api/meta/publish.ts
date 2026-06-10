import type { VercelRequest, VercelResponse } from "@vercel/node";
import https from "https";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type HttpResult = {
  status: number;
  ok: boolean;
  data: any;
  text: string;
};

const META_API_VERSION = "v25.0";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestJson(
  urlString: string,
  options: {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);

    const body =
      options.body !== undefined ? JSON.stringify(options.body) : undefined;

    const req = https.request(
      {
        hostname: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(body
            ? { "Content-Length": Buffer.byteLength(body).toString() }
            : {}),
          ...(options.headers || {}),
        },
      },
      (response) => {
        let responseText = "";

        response.on("data", (chunk) => {
          responseText += chunk;
        });

        response.on("end", () => {
          let data: any = null;

          try {
            data = responseText ? JSON.parse(responseText) : null;
          } catch {
            data = responseText;
          }

          const status = response.statusCode || 500;

          resolve({
            status,
            ok: status >= 200 && status < 300,
            data,
            text: responseText,
          });
        });
      }
    );

    req.on("error", reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

function supabaseHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: "return=representation",
  };
}

function normalizePlatforms(value: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.toLowerCase());
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String).map((item) => item.toLowerCase());
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    }
  }

  return [];
}

function buildCaption(post: any) {
  const caption = post.caption || post.legenda || post.description || "";
  const hashtags = post.hashtags || "";

  return [caption, hashtags].filter(Boolean).join("\n\n").trim();
}

function getMediaUrls(post: any): string[] {
  const urls: string[] = [];

  if (Array.isArray(post.media_urls)) {
    urls.push(...post.media_urls.filter(Boolean));
  }

  if (typeof post.media_urls === "string") {
    try {
      const parsed = JSON.parse(post.media_urls);
      if (Array.isArray(parsed)) {
        urls.push(...parsed.filter(Boolean));
      }
    } catch {
      // Ignora string inválida
    }
  }

  const singleUrl =
    post.media_url ||
    post.image_url ||
    post.video_url ||
    post.mediaUrl ||
    post.imageUrl ||
    post.videoUrl ||
    post.media ||
    "";

  if (singleUrl && !urls.includes(singleUrl)) {
    urls.unshift(singleUrl);
  }

  return Array.from(new Set(urls)).filter(Boolean);
}

function isPublicHttpsUrl(url: string) {
  return /^https:\/\/.+/i.test(url);
}

function isVideoUrl(url: string) {
  const cleanUrl = url.split("?")[0].toLowerCase();

  return (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.endsWith(".m4v") ||
    cleanUrl.endsWith(".webm")
  );
}

function normalizePostType(post: any) {
  return String(post.type || post.post_type || "feed").toLowerCase();
}

function buildFacebookPostUrl(resultData: any) {
  const postId = resultData?.post_id || resultData?.id;
  const photoId = resultData?.id;

  if (postId) {
    return `https://www.facebook.com/${postId}`;
  }

  if (photoId) {
    return `https://www.facebook.com/photo.php?fbid=${photoId}`;
  }

  return null;
}

function buildFacebookVideoUrl(resultData: any) {
  const videoId = resultData?.id;

  if (videoId) {
    return `https://www.facebook.com/${videoId}`;
  }

  return null;
}

async function getInstagramPermalink(params: {
  mediaId: string;
  accessToken: string;
}) {
  const { mediaId, accessToken } = params;

  const url = new URL(
    `https://graph.facebook.com/${META_API_VERSION}/${mediaId}`
  );

  url.searchParams.set("fields", "permalink");
  url.searchParams.set("access_token", accessToken);

  const result = await requestJson(url.toString(), {
    method: "GET",
  });

  if (!result.ok) {
    console.error(
      "Erro ao buscar permalink do Instagram:",
      result.status,
      result.text
    );

    return null;
  }

  return result.data?.permalink || null;
}

async function waitInstagramContainer(params: {
  creationId: string;
  accessToken: string;
}) {
  const { creationId, accessToken } = params;

  for (let attempt = 1; attempt <= 12; attempt++) {
    const url = new URL(
      `https://graph.facebook.com/${META_API_VERSION}/${creationId}`
    );

    url.searchParams.set("fields", "status_code,status");
    url.searchParams.set("access_token", accessToken);

    const result = await requestJson(url.toString(), {
      method: "GET",
    });

    if (!result.ok) {
      return {
        ok: false,
        statusCode: null,
        result,
      };
    }

    const statusCode = result.data?.status_code;

    if (statusCode === "FINISHED") {
      return {
        ok: true,
        statusCode,
        result,
      };
    }

    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      return {
        ok: false,
        statusCode,
        result,
      };
    }

    await sleep(5000);
  }

  return {
    ok: false,
    statusCode: "TIMEOUT",
    result: {
      status: 408,
      ok: false,
      data: {
        error:
          "O vídeo ainda não terminou de processar no Instagram. Tente novamente em alguns instantes.",
      },
      text: "Timeout aguardando processamento do container do Instagram.",
    },
  };
}

async function updatePostStatus(params: {
  supabaseUrl: string;
  headers: Record<string, string>;
  postId: string;
  status: string;
  errorMessage?: string | null;
}) {
  const { supabaseUrl, headers, postId, status, errorMessage } = params;

  const updateUrl =
    `${supabaseUrl}/rest/v1/posts` + `?id=eq.${encodeURIComponent(postId)}`;

  const body: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "published") {
    body.published_at = new Date().toISOString();
    body.error_message = null;
  }

  if (status === "failed") {
    body.error_message = errorMessage || "Erro ao publicar.";
  }

  return requestJson(updateUrl, {
    method: "PATCH",
    headers,
    body,
  });
}

async function publishSinglePhotoToFacebook(params: {
  pageId: string;
  pageAccessToken: string;
  imageUrl: string;
  caption: string;
}) {
  const { pageId, pageAccessToken, imageUrl, caption } = params;

  const url = new URL(
    `https://graph.facebook.com/${META_API_VERSION}/${pageId}/photos`
  );

  url.searchParams.set("url", imageUrl);
  url.searchParams.set("caption", caption);
  url.searchParams.set("published", "true");
  url.searchParams.set("access_token", pageAccessToken);

  const result = await requestJson(url.toString(), {
    method: "POST",
  });

  return {
    ok: result.ok,
    step: "facebook_single_photo",
    result,
    url: buildFacebookPostUrl(result.data),
  };
}

async function publishVideoToFacebook(params: {
  pageId: string;
  pageAccessToken: string;
  videoUrl: string;
  caption: string;
}) {
  const { pageId, pageAccessToken, videoUrl, caption } = params;

  const url = new URL(
    `https://graph.facebook.com/${META_API_VERSION}/${pageId}/videos`
  );

  url.searchParams.set("file_url", videoUrl);
  url.searchParams.set("description", caption);
  url.searchParams.set("published", "true");
  url.searchParams.set("access_token", pageAccessToken);

  const result = await requestJson(url.toString(), {
    method: "POST",
  });

  return {
    ok: result.ok && Boolean(result.data?.id),
    step: "facebook_video",
    result,
    url: buildFacebookVideoUrl(result.data),
  };
}

async function publishCarouselToFacebook(params: {
  pageId: string;
  pageAccessToken: string;
  imageUrls: string[];
  caption: string;
}) {
  const { pageId, pageAccessToken, imageUrls, caption } = params;

  const uploadedPhotos: any[] = [];

  for (const imageUrl of imageUrls) {
    const uploadUrl = new URL(
      `https://graph.facebook.com/${META_API_VERSION}/${pageId}/photos`
    );

    uploadUrl.searchParams.set("url", imageUrl);
    uploadUrl.searchParams.set("published", "false");
    uploadUrl.searchParams.set("access_token", pageAccessToken);

    const uploadResult = await requestJson(uploadUrl.toString(), {
      method: "POST",
    });

    if (!uploadResult.ok || !uploadResult.data?.id) {
      return {
        ok: false,
        step: "facebook_upload_unpublished_photo",
        uploadedPhotos,
        result: uploadResult,
        url: null,
      };
    }

    uploadedPhotos.push(uploadResult.data);
  }

  const feedUrl = new URL(
    `https://graph.facebook.com/${META_API_VERSION}/${pageId}/feed`
  );

  feedUrl.searchParams.set("message", caption);
  feedUrl.searchParams.set("access_token", pageAccessToken);

  uploadedPhotos.forEach((photo, index) => {
    feedUrl.searchParams.set(
      `attached_media[${index}]`,
      JSON.stringify({
        media_fbid: photo.id,
      })
    );
  });

  const feedResult = await requestJson(feedUrl.toString(), {
    method: "POST",
  });

  return {
    ok: feedResult.ok && Boolean(feedResult.data?.id),
    step: "facebook_create_multi_photo_post",
    uploadedPhotos,
    result: feedResult,
    url: buildFacebookPostUrl(feedResult.data),
  };
}

async function createInstagramImageContainer(params: {
  instagramBusinessAccountId: string;
  pageAccessToken: string;
  imageUrl: string;
  caption?: string;
  isCarouselItem?: boolean;
}) {
  const {
    instagramBusinessAccountId,
    pageAccessToken,
    imageUrl,
    caption,
    isCarouselItem,
  } = params;

  const url = new URL(
    `https://graph.facebook.com/${META_API_VERSION}/${instagramBusinessAccountId}/media`
  );

  url.searchParams.set("image_url", imageUrl);
  url.searchParams.set("access_token", pageAccessToken);

  if (caption) {
    url.searchParams.set("caption", caption);
  }

  if (isCarouselItem) {
    url.searchParams.set("is_carousel_item", "true");
  }

  return requestJson(url.toString(), {
    method: "POST",
  });
}

async function createInstagramReelsContainer(params: {
  instagramBusinessAccountId: string;
  pageAccessToken: string;
  videoUrl: string;
  caption: string;
}) {
  const {
    instagramBusinessAccountId,
    pageAccessToken,
    videoUrl,
    caption,
  } = params;

  const url = new URL(
    `https://graph.facebook.com/${META_API_VERSION}/${instagramBusinessAccountId}/media`
  );

  url.searchParams.set("media_type", "REELS");
  url.searchParams.set("video_url", videoUrl);
  url.searchParams.set("caption", caption);
  url.searchParams.set("access_token", pageAccessToken);

  return requestJson(url.toString(), {
    method: "POST",
  });
}

async function publishInstagramCreation(params: {
  instagramBusinessAccountId: string;
  pageAccessToken: string;
  creationId: string;
}) {
  const { instagramBusinessAccountId, pageAccessToken, creationId } = params;

  const publishUrl = new URL(
    `https://graph.facebook.com/${META_API_VERSION}/${instagramBusinessAccountId}/media_publish`
  );

  publishUrl.searchParams.set("creation_id", creationId);
  publishUrl.searchParams.set("access_token", pageAccessToken);

  return requestJson(publishUrl.toString(), {
    method: "POST",
  });
}

async function publishSingleImageToInstagram(params: {
  instagramBusinessAccountId: string;
  pageAccessToken: string;
  imageUrl: string;
  caption: string;
}) {
  const { instagramBusinessAccountId, pageAccessToken, imageUrl, caption } =
    params;

  const containerResult = await createInstagramImageContainer({
    instagramBusinessAccountId,
    pageAccessToken,
    imageUrl,
    caption,
  });

  if (!containerResult.ok || !containerResult.data?.id) {
    return {
      ok: false,
      step: "instagram_create_single_image_container",
      creationId: null,
      result: containerResult,
      permalink: null,
    };
  }

  const creationId = containerResult.data.id;

  const publishResult = await publishInstagramCreation({
    instagramBusinessAccountId,
    pageAccessToken,
    creationId,
  });

  let permalink: string | null = null;

  if (publishResult.ok && publishResult.data?.id) {
    permalink = await getInstagramPermalink({
      mediaId: publishResult.data.id,
      accessToken: pageAccessToken,
    });
  }

  return {
    ok: publishResult.ok && Boolean(publishResult.data?.id),
    step: "instagram_publish_single_image",
    creationId,
    result: publishResult,
    permalink,
  };
}

async function publishReelsToInstagram(params: {
  instagramBusinessAccountId: string;
  pageAccessToken: string;
  videoUrl: string;
  caption: string;
}) {
  const { instagramBusinessAccountId, pageAccessToken, videoUrl, caption } =
    params;

  const containerResult = await createInstagramReelsContainer({
    instagramBusinessAccountId,
    pageAccessToken,
    videoUrl,
    caption,
  });

  if (!containerResult.ok || !containerResult.data?.id) {
    return {
      ok: false,
      step: "instagram_create_reels_container",
      creationId: null,
      waitResult: null,
      result: containerResult,
      permalink: null,
    };
  }

  const creationId = containerResult.data.id;

  const waitResult = await waitInstagramContainer({
    creationId,
    accessToken: pageAccessToken,
  });

  if (!waitResult.ok) {
    return {
      ok: false,
      step: "instagram_wait_reels_container",
      creationId,
      waitResult,
      result: waitResult.result,
      permalink: null,
    };
  }

  const publishResult = await publishInstagramCreation({
    instagramBusinessAccountId,
    pageAccessToken,
    creationId,
  });

  let permalink: string | null = null;

  if (publishResult.ok && publishResult.data?.id) {
    permalink = await getInstagramPermalink({
      mediaId: publishResult.data.id,
      accessToken: pageAccessToken,
    });
  }

  return {
    ok: publishResult.ok && Boolean(publishResult.data?.id),
    step: "instagram_publish_reels",
    creationId,
    waitResult,
    result: publishResult,
    permalink,
  };
}

async function publishCarouselToInstagram(params: {
  instagramBusinessAccountId: string;
  pageAccessToken: string;
  imageUrls: string[];
  caption: string;
}) {
  const { instagramBusinessAccountId, pageAccessToken, imageUrls, caption } =
    params;

  const childCreationIds: string[] = [];

  for (const imageUrl of imageUrls) {
    const childResult = await createInstagramImageContainer({
      instagramBusinessAccountId,
      pageAccessToken,
      imageUrl,
      isCarouselItem: true,
    });

    if (!childResult.ok || !childResult.data?.id) {
      return {
        ok: false,
        step: "instagram_create_carousel_child",
        childCreationIds,
        creationId: null,
        result: childResult,
        permalink: null,
      };
    }

    childCreationIds.push(childResult.data.id);
  }

  const carouselUrl = new URL(
    `https://graph.facebook.com/${META_API_VERSION}/${instagramBusinessAccountId}/media`
  );

  carouselUrl.searchParams.set("media_type", "CAROUSEL");
  carouselUrl.searchParams.set("children", childCreationIds.join(","));
  carouselUrl.searchParams.set("caption", caption);
  carouselUrl.searchParams.set("access_token", pageAccessToken);

  const carouselResult = await requestJson(carouselUrl.toString(), {
    method: "POST",
  });

  if (!carouselResult.ok || !carouselResult.data?.id) {
    return {
      ok: false,
      step: "instagram_create_carousel_container",
      childCreationIds,
      creationId: null,
      result: carouselResult,
      permalink: null,
    };
  }

  const creationId = carouselResult.data.id;

  const publishResult = await publishInstagramCreation({
    instagramBusinessAccountId,
    pageAccessToken,
    creationId,
  });

  let permalink: string | null = null;

  if (publishResult.ok && publishResult.data?.id) {
    permalink = await getInstagramPermalink({
      mediaId: publishResult.data.id,
      accessToken: pageAccessToken,
    });
  }

  return {
    ok: publishResult.ok && Boolean(publishResult.data?.id),
    step: "instagram_publish_carousel",
    childCreationIds,
    creationId,
    result: publishResult,
    permalink,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Método não permitido. Use POST.",
      });
    }

    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Configuração do Supabase ausente.",
      });
    }

    const headers = supabaseHeaders(serviceRoleKey);

    const body =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;

    const postId = String(body?.postId || body?.id || "");

    if (!postId) {
      return res.status(400).json({
        error: "postId é obrigatório.",
      });
    }

    console.log("Publicação Meta iniciada para post:", postId);

    const postUrl =
      `${supabaseUrl}/rest/v1/posts` +
      `?id=eq.${encodeURIComponent(postId)}` +
      `&select=*`;

    const postResult = await requestJson(postUrl, {
      method: "GET",
      headers,
    });

    if (!postResult.ok) {
      console.error("Erro ao buscar post:", postResult.status, postResult.text);

      return res.status(500).json({
        error: "Erro ao buscar post.",
        details: postResult.text,
      });
    }

    const post = Array.isArray(postResult.data) ? postResult.data[0] : null;

    if (!post) {
      return res.status(404).json({
        error: "Post não encontrado.",
      });
    }

    const companyId = post.company_id;

    if (!companyId) {
      return res.status(400).json({
        error: "Post sem company_id.",
      });
    }

    const mediaUrls = getMediaUrls(post);
    const caption = buildCaption(post);
    const platforms = normalizePlatforms(post.platforms);
    const postType = normalizePostType(post);

    if (mediaUrls.length === 0) {
      await updatePostStatus({
        supabaseUrl,
        headers,
        postId,
        status: "failed",
        errorMessage: "Post sem mídia.",
      });

      return res.status(400).json({
        error: "Post sem mídia.",
      });
    }

    if (mediaUrls.length > 10) {
      await updatePostStatus({
        supabaseUrl,
        headers,
        postId,
        status: "failed",
        errorMessage: "O carrossel pode ter no máximo 10 mídias.",
      });

      return res.status(400).json({
        error: "O carrossel pode ter no máximo 10 mídias.",
      });
    }

    const invalidMediaUrl = mediaUrls.find((url) => !isPublicHttpsUrl(url));

    if (invalidMediaUrl) {
      await updatePostStatus({
        supabaseUrl,
        headers,
        postId,
        status: "failed",
        errorMessage:
          "Todas as mídias precisam ser URLs públicas https. Base64/data:image não funciona na API da Meta.",
      });

      return res.status(400).json({
        error:
          "Todas as mídias precisam ser URLs públicas https. Base64/data:image não funciona na API da Meta.",
        invalidMediaUrlStartsWith: invalidMediaUrl.slice(0, 40),
      });
    }

    const hasVideo = mediaUrls.some((url) => isVideoUrl(url));
    const isCarousel = !hasVideo && mediaUrls.length > 1;
    const isVideoPost = hasVideo || postType === "video" || postType === "reels";

    if (hasVideo && mediaUrls.length > 1) {
      await updatePostStatus({
        supabaseUrl,
        headers,
        postId,
        status: "failed",
        errorMessage: "Vídeo/Reels aceita apenas uma mídia por publicação.",
      });

      return res.status(400).json({
        error: "Vídeo/Reels aceita apenas uma mídia por publicação.",
      });
    }

    if ((postType === "video" || postType === "reels") && !hasVideo) {
      await updatePostStatus({
        supabaseUrl,
        headers,
        postId,
        status: "failed",
        errorMessage:
          "O tipo escolhido é vídeo/Reels, mas a mídia enviada não parece ser vídeo.",
      });

      return res.status(400).json({
        error:
          "O tipo escolhido é vídeo/Reels, mas a mídia enviada não parece ser vídeo.",
      });
    }

    const accountsUrl =
      `${supabaseUrl}/rest/v1/social_accounts` +
      `?company_id=eq.${encodeURIComponent(companyId)}` +
      `&status=eq.connected` +
      `&is_connected=eq.true` +
      `&select=*`;

    const accountsResult = await requestJson(accountsUrl, {
      method: "GET",
      headers,
    });

    if (!accountsResult.ok) {
      console.error(
        "Erro ao buscar contas sociais:",
        accountsResult.status,
        accountsResult.text
      );

      return res.status(500).json({
        error: "Erro ao buscar contas sociais.",
        details: accountsResult.text,
      });
    }

    const accounts = Array.isArray(accountsResult.data)
      ? accountsResult.data
      : [];

    const facebookAccount = accounts.find(
      (account: any) => account.platform === "facebook"
    );

    const instagramAccount = accounts.find(
      (account: any) => account.platform === "instagram"
    );

    const selectedPlatforms =
      platforms.length > 0 ? platforms : ["facebook", "instagram"];

    const results: Record<string, any> = {};
    const postUrls: Record<string, string | null> = {};

    if (selectedPlatforms.includes("facebook")) {
      if (!facebookAccount?.page_id || !facebookAccount?.access_token) {
        postUrls.facebook = null;

        results.facebook = {
          ok: false,
          error: "Página do Facebook não conectada corretamente.",
          url: null,
        };
      } else if (isVideoPost) {
        console.log(`Publicando vídeo no Facebook: ${facebookAccount.page_id}`);

        const facebookVideoResult = await publishVideoToFacebook({
          pageId: facebookAccount.page_id,
          pageAccessToken: facebookAccount.access_token,
          videoUrl: mediaUrls[0],
          caption,
        });

        postUrls.facebook = facebookVideoResult.url;

        results.facebook = {
          ok: facebookVideoResult.ok,
          step: facebookVideoResult.step,
          status: facebookVideoResult.result.status,
          data: facebookVideoResult.result.data,
          text: facebookVideoResult.result.text,
          url: facebookVideoResult.url,
        };
      } else {
        console.log(
          isCarousel
            ? `Publicando carrossel/múltiplas fotos no Facebook: ${facebookAccount.page_id}`
            : `Publicando imagem única no Facebook: ${facebookAccount.page_id}`
        );

        const facebookResult = isCarousel
          ? await publishCarouselToFacebook({
              pageId: facebookAccount.page_id,
              pageAccessToken: facebookAccount.access_token,
              imageUrls: mediaUrls,
              caption,
            })
          : await publishSinglePhotoToFacebook({
              pageId: facebookAccount.page_id,
              pageAccessToken: facebookAccount.access_token,
              imageUrl: mediaUrls[0],
              caption,
            });

        postUrls.facebook = facebookResult.url;

        results.facebook = {
          ok: facebookResult.ok,
          step: facebookResult.step,
          status: facebookResult.result.status,
          data: facebookResult.result.data,
          text: facebookResult.result.text,
          url: facebookResult.url,
        };
      }
    }

    if (selectedPlatforms.includes("instagram")) {
      const instagramBusinessAccountId =
        instagramAccount?.instagram_business_account_id ||
        facebookAccount?.instagram_business_account_id;

      const instagramAccessToken =
        instagramAccount?.access_token || facebookAccount?.access_token;

      if (!instagramBusinessAccountId || !instagramAccessToken) {
        postUrls.instagram = null;

        results.instagram = {
          ok: false,
          error: "Instagram não conectado corretamente.",
          url: null,
        };
      } else if (isVideoPost) {
        console.log(
          `Publicando Reels no Instagram: ${instagramBusinessAccountId}`
        );

        const instagramReelsResult = await publishReelsToInstagram({
          instagramBusinessAccountId,
          pageAccessToken: instagramAccessToken,
          videoUrl: mediaUrls[0],
          caption,
        });

        postUrls.instagram = instagramReelsResult.permalink;

        results.instagram = {
          ok: instagramReelsResult.ok,
          step: instagramReelsResult.step,
          creationId: instagramReelsResult.creationId,
          waitResult: instagramReelsResult.waitResult || null,
          status: instagramReelsResult.result.status,
          data: instagramReelsResult.result.data,
          text: instagramReelsResult.result.text,
          url: instagramReelsResult.permalink,
        };
      } else {
        console.log(
          isCarousel
            ? `Publicando carrossel no Instagram: ${instagramBusinessAccountId}`
            : `Publicando imagem única no Instagram: ${instagramBusinessAccountId}`
        );

        const instagramResult = isCarousel
          ? await publishCarouselToInstagram({
              instagramBusinessAccountId,
              pageAccessToken: instagramAccessToken,
              imageUrls: mediaUrls,
              caption,
            })
          : await publishSingleImageToInstagram({
              instagramBusinessAccountId,
              pageAccessToken: instagramAccessToken,
              imageUrl: mediaUrls[0],
              caption,
            });

        postUrls.instagram = instagramResult.permalink;

        results.instagram = {
          ok: instagramResult.ok,
          step: instagramResult.step,
          creationId: instagramResult.creationId,
          childCreationIds: instagramResult.childCreationIds || [],
          status: instagramResult.result.status,
          data: instagramResult.result.data,
          text: instagramResult.result.text,
          url: instagramResult.permalink,
        };
      }
    }

    const hasFailure = Object.values(results).some(
      (result: any) => !result?.ok
    );

    if (hasFailure) {
      console.error(
        "Falha em uma ou mais plataformas:",
        JSON.stringify(results)
      );

      await updatePostStatus({
        supabaseUrl,
        headers,
        postId,
        status: "failed",
        errorMessage: JSON.stringify(results),
      });

      return res.status(400).json({
        error: "Falha ao publicar em uma ou mais plataformas.",
        results,
        postUrls,
      });
    }

    await updatePostStatus({
      supabaseUrl,
      headers,
      postId,
      status: "published",
    });

    console.log("Post publicado com sucesso:", JSON.stringify(results));

    return res.status(200).json({
      success: true,
      message: isVideoPost
        ? "Vídeo/Reels publicado com sucesso."
        : isCarousel
          ? "Carrossel publicado com sucesso."
          : "Post publicado com sucesso.",
      isCarousel,
      isVideoPost,
      results,
      postUrls,
    });
  } catch (error: any) {
    console.error("Erro inesperado ao publicar:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: "Erro inesperado ao publicar.",
      details: error?.message || String(error),
    });
  }
}
