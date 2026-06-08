import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Platform = "instagram" | "facebook" | "tiktok";
export type PostStatus = "draft" | "scheduled" | "published" | "failed";
export type PostType = "feed" | "story";
export type PostInputStatus = PostStatus;
export type PostInputType = PostType;
export type PostInputPlatformsItem = Platform;
export type PostUpdateStatus = PostStatus;
export type PostUpdateType = PostType;
export type PostUpdatePlatformsItem = Platform;

export interface Post {
  id: number;
  title: string;
  caption?: string;
  hashtags?: string;
  type: PostType;
  platforms: Platform[];
  status: PostStatus;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  engagement?: number;
  reach?: number;
}

export interface MediaFile {
  id: number;
  name: string;
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string | null;
  size: number;
  tags?: string | null;
  createdAt: string;
}

export interface StoreRecord {
  id: number;
  name: string;
  segment?: string | null;
  cnpj?: string | null;
  instagramConnected?: boolean;
  facebookConnected?: boolean;
  tiktokConnected?: boolean;
  plan?: "free" | "premium";
}

export interface DashboardAlert {
  id: number;
  severity: "info" | "warning" | "error";
  message: string;
}

export interface RecentActivity {
  id: number;
  action: string;
  postTitle: string;
  timestamp: string;
}

type QueryOptions = { query?: Record<string, unknown> } | undefined;

const POSTS_KEY = "socialpilot_demo_posts";
const MEDIA_KEY = "socialpilot_demo_media";
const STORES_KEY = "socialpilot_demo_stores";

/**
 * Essa chave serve para limpar automaticamente os 3 posts antigos de demonstração
 * apenas uma vez. Assim o usuário não precisa abrir o console do navegador.
 */
const POSTS_RESET_KEY = "socialpilot_demo_posts_reset_v3";

function nowMinus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function nowPlus(days: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const defaultPosts: Post[] = [
  {
    id: 1,
    title: "Oferta relâmpago de ferramentas",
    caption:
      "Promoção especial por tempo limitado. Confira as melhores ferramentas para facilitar seu trabalho.",
    hashtags: "#ferramentas #promoção #oferta",
    type: "feed",
    platforms: ["instagram", "facebook"],
    status: "scheduled",
    mediaUrl:
      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80",
    scheduledAt: nowPlus(1, 9),
    publishedAt: null,
    createdAt: nowMinus(3),
    engagement: 0,
    reach: 0,
  },
  {
    id: 2,
    title: "Story de novidades",
    caption: "Chegaram novidades para quem trabalha com manutenção e construção.",
    hashtags: "#novidades #construção #manutenção",
    type: "story",
    platforms: ["instagram", "tiktok"],
    status: "draft",
    mediaUrl:
      "https://images.unsplash.com/photo-1581147036324-c1c89c2c8b5c?auto=format&fit=crop&w=900&q=80",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1581147036324-c1c89c2c8b5c?auto=format&fit=crop&w=900&q=80",
    scheduledAt: null,
    publishedAt: null,
    createdAt: nowMinus(1),
    engagement: 0,
    reach: 0,
  },
  {
    id: 3,
    title: "Post publicado de demonstração",
    caption: "Exemplo de post publicado para mostrar os dados no painel.",
    hashtags: "#socialpilot #demo",
    type: "feed",
    platforms: ["facebook"],
    status: "published",
    mediaUrl:
      "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=900&q=80",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=900&q=80",
    scheduledAt: null,
    publishedAt: nowMinus(2),
    createdAt: nowMinus(4),
    engagement: 126,
    reach: 2400,
  },
];

const defaultMedia: MediaFile[] = [
  {
    id: 1,
    name: "ferramentas-oferta.jpg",
    type: "image",
    url:
      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80",
    size: 850000,
    tags: "ferramentas, oferta",
    createdAt: nowMinus(5),
  },
  {
    id: 2,
    name: "loja-post.jpg",
    type: "image",
    url:
      "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=900&q=80",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=900&q=80",
    size: 620000,
    tags: "loja, divulgação",
    createdAt: nowMinus(2),
  },
  {
    id: 3,
    name: "video-demo.mp4",
    type: "video",
    url:
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80",
    thumbnailUrl:
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80",
    size: 5400000,
    tags: "video, demonstração",
    createdAt: nowMinus(1),
  },
];

const defaultStores: StoreRecord[] = [
  {
    id: 1,
    name: "Minha Empresa",
    segment: "Ferramentas e utilidades",
    cnpj: "",
    instagramConnected: true,
    facebookConnected: false,
    tiktokConnected: false,
    plan: "free",
  },
];

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): T {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }

  return value;
}

function isValidStatus(status: unknown): status is PostStatus {
  return (
    status === "draft" ||
    status === "scheduled" ||
    status === "published" ||
    status === "failed"
  );
}

function normalizeStatus(status: unknown): PostStatus {
  if (isValidStatus(status)) return status;

  if (status === "rascunho") return "draft";
  if (status === "agendado") return "scheduled";
  if (status === "publicado") return "published";
  if (status === "erro") return "failed";

  return "draft";
}

function normalizePlatforms(value: unknown): Platform[] {
  const validPlatforms: Platform[] = ["instagram", "facebook", "tiktok"];

  if (Array.isArray(value)) {
    const platforms = value
      .map((item) => String(item).toLowerCase())
      .filter((item): item is Platform =>
        validPlatforms.includes(item as Platform)
      );

    return platforms.length > 0 ? platforms : ["instagram"];
  }

  if (typeof value === "string") {
    const platform = value.toLowerCase();

    if (validPlatforms.includes(platform as Platform)) {
      return [platform as Platform];
    }
  }

  return ["instagram"];
}

function isPostLike(value: unknown): value is Record<string, any> {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, any>;

  const hasText =
    typeof item.title === "string" ||
    typeof item.caption === "string" ||
    typeof item.content === "string" ||
    typeof item.description === "string";

  const hasPostSignal =
    item.status !== undefined ||
    item.platforms !== undefined ||
    item.platform !== undefined ||
    item.scheduledAt !== undefined ||
    item.scheduled_at !== undefined ||
    item.publishedAt !== undefined ||
    item.published_at !== undefined ||
    item.createdAt !== undefined ||
    item.created_at !== undefined;

  return hasText && hasPostSignal;
}

function extractPostsFromValue(value: unknown): Record<string, any>[] {
  if (Array.isArray(value)) {
    return value.filter(isPostLike);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const item = value as Record<string, any>;

  if (Array.isArray(item.posts)) {
    return item.posts.filter(isPostLike);
  }

  if (Array.isArray(item.data)) {
    return item.data.filter(isPostLike);
  }

  if (Array.isArray(item.items)) {
    return item.items.filter(isPostLike);
  }

  return [];
}

function normalizePost(item: Record<string, any>, fallbackId: number): Post {
  const status = normalizeStatus(item.status);
  const platforms = normalizePlatforms(item.platforms || item.platform);

  const scheduledAt = item.scheduledAt || item.scheduled_at || null;
  const publishedAt = item.publishedAt || item.published_at || null;

  const createdAt =
    item.createdAt ||
    item.created_at ||
    item.date ||
    item.updatedAt ||
    item.updated_at ||
    new Date().toISOString();

  const numericId = Number(item.id);

  return {
    id: Number.isFinite(numericId) && numericId > 0 ? numericId : fallbackId,
    title:
      item.title ||
      item.caption ||
      item.content ||
      item.description ||
      "Post sem título",
    caption: item.caption || item.content || item.description || "",
    hashtags: item.hashtags || "",
    type: item.type === "story" ? "story" : "feed",
    platforms,
    status,
    mediaUrl:
      item.mediaUrl ||
      item.media_url ||
      item.imageUrl ||
      item.image_url ||
      item.url ||
      null,
    thumbnailUrl:
      item.thumbnailUrl ||
      item.thumbnail_url ||
      item.mediaUrl ||
      item.media_url ||
      item.imageUrl ||
      item.image_url ||
      item.url ||
      null,
    scheduledAt,
    publishedAt,
    createdAt,
    engagement: Number(
      item.engagement ||
        item.engagementCount ||
        item.engagement_count ||
        item.likes ||
        0
    ),
    reach: Number(item.reach || item.reachCount || item.reach_count || 0),
  };
}

function isOnlyOldDemoPosts(posts: unknown): boolean {
  if (!Array.isArray(posts)) return false;

  return (
    posts.length === 3 &&
    posts.some((post) => post?.title === "Oferta relâmpago de ferramentas") &&
    posts.some((post) => post?.title === "Story de novidades") &&
    posts.some((post) => post?.title === "Post publicado de demonstração")
  );
}

/**
 * Limpa automaticamente os 3 posts antigos de demonstração apenas uma vez.
 * Isso evita o problema do Analytics ficar preso em "3 posts".
 */
function resetOldDemoPostsOnce() {
  if (typeof window === "undefined") return;

  try {
    const alreadyReset = localStorage.getItem(POSTS_RESET_KEY);

    if (alreadyReset) return;

    const raw = localStorage.getItem(POSTS_KEY);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);

        if (isOnlyOldDemoPosts(parsed)) {
          localStorage.removeItem(POSTS_KEY);
        }
      } catch {
        localStorage.removeItem(POSTS_KEY);
      }
    }

    localStorage.setItem(POSTS_RESET_KEY, "true");
  } catch {
    // Se o navegador bloquear localStorage, não quebra o sistema.
  }
}

function getPosts() {
  if (typeof window === "undefined") {
    return defaultPosts;
  }

  resetOldDemoPostsOnce();

  const savedPosts = readJson<Post[]>(POSTS_KEY, defaultPosts);

  const foundPosts: Post[] = [];
  let fallbackId =
    Math.max(0, ...savedPosts.map((post) => Number(post.id) || 0)) + 1;

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);

      if (!key) continue;

      const raw = localStorage.getItem(key);

      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        const extractedPosts = extractPostsFromValue(parsed);

        extractedPosts.forEach((item) => {
          const normalized = normalizePost(item, fallbackId);
          foundPosts.push(normalized);
          fallbackId += 1;
        });
      } catch {
        // Ignora chaves do localStorage que não são JSON.
      }
    }
  } catch {
    return savedPosts;
  }

  const allPosts = [...savedPosts, ...foundPosts];

  const uniquePostsMap = new Map<string, Post>();

  allPosts.forEach((post) => {
    const uniqueKey = [
      post.id,
      post.title,
      post.createdAt,
      post.scheduledAt,
      post.publishedAt,
    ].join("|");

    uniquePostsMap.set(uniqueKey, post);
  });

  const uniquePosts = Array.from(uniquePostsMap.values()).sort((a, b) => {
    const dateA = new Date(
      a.publishedAt || a.scheduledAt || a.createdAt || 0
    ).getTime();

    const dateB = new Date(
      b.publishedAt || b.scheduledAt || b.createdAt || 0
    ).getTime();

    return dateB - dateA;
  });

  writeJson(POSTS_KEY, uniquePosts);

  return uniquePosts;
}

function setPosts(posts: Post[]) {
  const normalizedPosts = posts.map((post, index) =>
    normalizePost(post as unknown as Record<string, any>, index + 1)
  );

  return writeJson(POSTS_KEY, normalizedPosts);
}

function getMedia() {
  return readJson<MediaFile[]>(MEDIA_KEY, defaultMedia);
}

function setMedia(media: MediaFile[]) {
  return writeJson(MEDIA_KEY, media);
}

function getStores() {
  return readJson<StoreRecord[]>(STORES_KEY, defaultStores);
}

function setStores(stores: StoreRecord[]) {
  return writeJson(STORES_KEY, stores);
}

function getPostDate(post: Post) {
  return post.publishedAt || post.scheduledAt || post.createdAt;
}

function generatePostMetrics(status: PostStatus) {
  if (status !== "published") {
    return {
      engagement: 0,
      reach: 0,
    };
  }

  return {
    engagement: 24,
    reach: 540,
  };
}

export const getListPostsQueryKey = () => ["posts"];
export const getGetPostQueryKey = (id?: number) => ["posts", id];
export const getListMediaQueryKey = () => ["media"];
export const getListStoresQueryKey = () => ["stores"];
export const getGetDashboardSummaryQueryKey = () => ["dashboard-summary"];
export const getGetAnalyticsOverviewQueryKey = () => ["analytics-overview"];

export function useListPosts(_params?: unknown, _options?: QueryOptions) {
  return useQuery({
    queryKey: getListPostsQueryKey(),
    queryFn: async () => getPosts(),
  });
}

export function useGetPost(id: number, _options?: QueryOptions) {
  return useQuery({
    queryKey: getGetPostQueryKey(id),
    queryFn: async () => getPosts().find((post) => post.id === id) || null,
    enabled: Boolean(id),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Post> }) => {
      const posts = getPosts();
      const status = normalizeStatus(data.status);
      const metrics = generatePostMetrics(status);

      const created: Post = {
        id: Math.max(0, ...posts.map((post) => Number(post.id) || 0)) + 1,
        title: data.title || "Nova postagem",
        caption: data.caption || "",
        hashtags: data.hashtags || "",
        type: data.type === "story" ? "story" : "feed",
        platforms: normalizePlatforms(data.platforms),
        status,
        mediaUrl: data.mediaUrl || null,
        thumbnailUrl: data.thumbnailUrl || data.mediaUrl || null,
        scheduledAt: data.scheduledAt || null,
        publishedAt: status === "published" ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        engagement:
          data.engagement !== undefined ? data.engagement : metrics.engagement,
        reach: data.reach !== undefined ? data.reach : metrics.reach,
      };

      setPosts([created, ...posts]);

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: getGetAnalyticsOverviewQueryKey(),
      });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Post> }) => {
      let updated: Post | null = null;

      const posts = getPosts().map((post) => {
        if (post.id !== id) return post;

        const nextStatus =
          data.status !== undefined ? normalizeStatus(data.status) : post.status;

        const becamePublished =
          nextStatus === "published" && post.status !== "published";

        updated = {
          ...post,
          ...data,
          status: nextStatus,
          platforms:
            data.platforms !== undefined
              ? normalizePlatforms(data.platforms)
              : post.platforms,
          thumbnailUrl:
            data.mediaUrl !== undefined
              ? data.mediaUrl
              : data.thumbnailUrl !== undefined
                ? data.thumbnailUrl
                : post.thumbnailUrl,
          publishedAt: becamePublished
            ? new Date().toISOString()
            : data.publishedAt !== undefined
              ? data.publishedAt
              : post.publishedAt,
          scheduledAt:
            data.scheduledAt !== undefined ? data.scheduledAt : post.scheduledAt,
          engagement: becamePublished
            ? post.engagement || 24
            : data.engagement !== undefined
              ? data.engagement
              : post.engagement,
          reach: becamePublished
            ? post.reach || 540
            : data.reach !== undefined
              ? data.reach
              : post.reach,
        } as Post;

        return updated;
      });

      setPosts(posts);

      return updated;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      queryClient.invalidateQueries({
        queryKey: getGetPostQueryKey(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: getGetAnalyticsOverviewQueryKey(),
      });
    },
  });
}

export function usePublishPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      let updated: Post | null = null;

      const posts = getPosts().map((post) => {
        if (post.id !== id) return post;

        updated = {
          ...post,
          status: "published",
          publishedAt: new Date().toISOString(),
          scheduledAt: null,
          engagement: post.engagement || 24,
          reach: post.reach || 540,
        };

        return updated;
      });

      setPosts(posts);

      return updated;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      queryClient.invalidateQueries({
        queryKey: getGetPostQueryKey(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: getGetDashboardSummaryQueryKey(),
      });
      queryClient.invalidateQueries({
        queryKey: getGetAnalyticsOverviewQueryKey(),
      });
    },
  });
}

export function useListMedia(_params?: unknown, _options?: QueryOptions) {
  return useQuery({
    queryKey: getListMediaQueryKey(),
    queryFn: async () => getMedia(),
  });
}

export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      setMedia(getMedia().filter((file) => file.id !== id));
      return { ok: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
    },
  });
}

export function useListStores(_options?: QueryOptions) {
  return useQuery({
    queryKey: getListStoresQueryKey(),
    queryFn: async () => getStores(),
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<StoreRecord>;
    }) => {
      let updated: StoreRecord | null = null;

      const stores = getStores().map((store) => {
        if (store.id !== id) return store;

        updated = { ...store, ...data };

        return updated;
      });

      setStores(stores);

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
    },
  });
}

export function useGetDashboardSummary(_options?: QueryOptions) {
  return useQuery({
    queryKey: getGetDashboardSummaryQueryKey(),
    queryFn: async () => {
      const posts = getPosts();

      const statusCounts = posts.reduce(
        (acc, post) => {
          acc[post.status] += 1;
          return acc;
        },
        {
          scheduled: 0,
          draft: 0,
          published: 0,
          failed: 0,
        } as Record<PostStatus, number>
      );

      const upcomingPosts = posts
        .filter((post) => post.status === "scheduled" || post.status === "draft")
        .slice(0, 4);

      const alerts: DashboardAlert[] = [
        {
          id: 1,
          severity: "info",
          message:
            "Bem-vindo ao painel. Aqui você acompanha seus posts, rascunhos e agendamentos.",
        },
      ];

      const recentActivity: RecentActivity[] = posts.slice(0, 3).map((post) => ({
        id: post.id,
        action:
          post.status === "published"
            ? "Post publicado"
            : post.status === "scheduled"
              ? "Post agendado"
              : post.status === "failed"
                ? "Falha na publicação"
                : "Rascunho criado",
        postTitle: post.title,
        timestamp: post.publishedAt || post.scheduledAt || post.createdAt,
      }));

      return {
        statusCounts,
        upcomingPosts,
        alerts,
        recentActivity,
      };
    },
  });
}

export function useGetAnalyticsOverview(_options?: QueryOptions) {
  return useQuery({
    queryKey: getGetAnalyticsOverviewQueryKey(),
    queryFn: async () => {
      const posts = getPosts();

      const totalEngagement = posts.reduce(
        (sum, post) => sum + (post.engagement || 0),
        0
      );

      const totalReach = posts.reduce(
        (sum, post) => sum + (post.reach || 0),
        0
      );

      const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

      const weeklyEngagement = Array.from({ length: 7 }).map((_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const postsOfDay = posts.filter((post) => {
          const rawDate = getPostDate(post);

          if (!rawDate) return false;

          const postDate = new Date(rawDate);

          if (Number.isNaN(postDate.getTime())) return false;

          return postDate >= date && postDate < nextDate;
        });

        return {
          day: days[date.getDay()],
          engagement: postsOfDay.reduce(
            (sum, post) => sum + (post.engagement || 0),
            0
          ),
          reach: postsOfDay.reduce((sum, post) => sum + (post.reach || 0), 0),
        };
      });

      const platformLabels: Record<Platform, string> = {
        instagram: "Instagram",
        facebook: "Facebook",
        tiktok: "TikTok",
      };

      const platformBreakdown = (
        ["instagram", "facebook", "tiktok"] as Platform[]
      ).map((platform) => {
        const platformPosts = posts.filter((post) =>
          post.platforms.includes(platform)
        );

        return {
          platform: platformLabels[platform],
          posts: platformPosts.length,
          engagement: platformPosts.reduce(
            (sum, post) => sum + (post.engagement || 0),
            0
          ),
        };
      });

      const hourMap = new Map<number, { posts: number; engagement: number }>();

      posts.forEach((post) => {
        const rawDate = getPostDate(post);

        if (!rawDate) return;

        const postDate = new Date(rawDate);

        if (Number.isNaN(postDate.getTime())) return;

        const hour = postDate.getHours();
        const current = hourMap.get(hour) || { posts: 0, engagement: 0 };

        hourMap.set(hour, {
          posts: current.posts + 1,
          engagement: current.engagement + (post.engagement || 0),
        });
      });

      const bestPostingHours = Array.from(hourMap.entries())
        .map(([hour, data]) => ({
          hour,
          engagementScore: data.engagement + data.posts * 10,
        }))
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 4);

      return {
        totalPosts: posts.length,
        totalEngagement,
        totalReach,
        avgEngagementRate: totalReach
          ? (totalEngagement / totalReach) * 100
          : 0,
        weeklyEngagement,
        platformBreakdown,
        bestPostingHours,
      };
    },
  });
}
