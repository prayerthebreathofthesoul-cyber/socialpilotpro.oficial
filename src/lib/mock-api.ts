import { useMutation, useQuery } from "@tanstack/react-query";

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
}

type QueryOptions = { query?: Record<string, unknown> } | undefined;

const POSTS_KEY = "socialpilot_demo_posts";
const MEDIA_KEY = "socialpilot_demo_media";
const STORES_KEY = "socialpilot_demo_stores";

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
    caption: "Promoção especial por tempo limitado. Confira as melhores ferramentas para facilitar seu trabalho.",
    hashtags: "#ferramentas #promoção #oferta",
    type: "feed",
    platforms: ["instagram", "facebook"],
    status: "scheduled",
    mediaUrl: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80",
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
    mediaUrl: "https://images.unsplash.com/photo-1581147036324-c1c89c2c8b5c?auto=format&fit=crop&w=900&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1581147036324-c1c89c2c8b5c?auto=format&fit=crop&w=900&q=80",
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
    mediaUrl: "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=900&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=900&q=80",
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
    url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=80",
    size: 850000,
    tags: "ferramentas, oferta",
    createdAt: nowMinus(5),
  },
  {
    id: 2,
    name: "loja-post.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=900&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?auto=format&fit=crop&w=900&q=80",
    size: 620000,
    tags: "loja, divulgação",
    createdAt: nowMinus(2),
  },
  {
    id: 3,
    name: "video-demo.mp4",
    type: "video",
    url: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80",
    size: 5400000,
    tags: "video, demonstração",
    createdAt: nowMinus(1),
  },
];

const defaultStores: StoreRecord[] = [
  {
    id: 1,
    name: "Sua Loja",
    segment: "Ferramentas e utilidades",
    cnpj: "",
    instagramConnected: true,
    facebookConnected: false,
    tiktokConnected: false,
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

function getPosts() {
  return readJson<Post[]>(POSTS_KEY, defaultPosts);
}

function setPosts(posts: Post[]) {
  return writeJson(POSTS_KEY, posts);
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
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Post> }) => {
      const posts = getPosts();
      const created: Post = {
        id: Math.max(0, ...posts.map((post) => post.id)) + 1,
        title: data.title || "Nova postagem",
        caption: data.caption || "",
        hashtags: data.hashtags || "",
        type: (data.type as PostType) || "feed",
        platforms: (data.platforms as Platform[]) || ["instagram"],
        status: (data.status as PostStatus) || "draft",
        mediaUrl: data.mediaUrl || null,
        thumbnailUrl: data.mediaUrl || null,
        scheduledAt: data.scheduledAt || null,
        publishedAt: data.status === "published" ? new Date().toISOString() : null,
        createdAt: new Date().toISOString(),
        engagement: 0,
        reach: 0,
      };
      setPosts([created, ...posts]);
      return created;
    },
  });
}

export function useUpdatePost() {
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Post> }) => {
      let updated: Post | null = null;
      const posts = getPosts().map((post) => {
        if (post.id !== id) return post;
        updated = {
          ...post,
          ...data,
          thumbnailUrl: data.mediaUrl !== undefined ? data.mediaUrl : post.thumbnailUrl,
        } as Post;
        return updated;
      });
      setPosts(posts);
      return updated;
    },
  });
}

export function usePublishPost() {
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
  });
}

export function useListMedia(_params?: unknown, _options?: QueryOptions) {
  return useQuery({
    queryKey: getListMediaQueryKey(),
    queryFn: async () => getMedia(),
  });
}

export function useDeleteMedia() {
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      setMedia(getMedia().filter((file) => file.id !== id));
      return { ok: true };
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
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<StoreRecord> }) => {
      let updated: StoreRecord | null = null;
      const stores = getStores().map((store) => {
        if (store.id !== id) return store;
        updated = { ...store, ...data };
        return updated;
      });
      setStores(stores);
      return updated;
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
        { scheduled: 0, draft: 0, published: 0, failed: 0 } as Record<PostStatus, number>,
      );

      return {
        statusCounts,
        upcomingPosts: posts
          .filter((post) => post.status === "scheduled" || post.status === "draft")
          .slice(0, 4),
        alerts: [
          { id: 1, severity: "info", message: "Projeto em modo demonstração usando dados locais." },
          { id: 2, severity: "warning", message: "Conecte uma API real antes de vender o sistema." },
        ],
      };
    },
  });
}

export function useGetAnalyticsOverview(_options?: QueryOptions) {
  return useQuery({
    queryKey: getGetAnalyticsOverviewQueryKey(),
    queryFn: async () => {
      const posts = getPosts();
      const totalEngagement = posts.reduce((sum, post) => sum + (post.engagement || 0), 0);
      const totalReach = posts.reduce((sum, post) => sum + (post.reach || 0), 0);
      return {
        totalPosts: posts.length,
        totalEngagement,
        totalReach,
        avgEngagementRate: totalReach ? (totalEngagement / totalReach) * 100 : 0,
        weeklyEngagement: [
          { day: "Seg", engagement: 80, reach: 900 },
          { day: "Ter", engagement: 120, reach: 1200 },
          { day: "Qua", engagement: 95, reach: 1000 },
          { day: "Qui", engagement: 180, reach: 1600 },
          { day: "Sex", engagement: 210, reach: 2200 },
          { day: "Sáb", engagement: 150, reach: 1800 },
          { day: "Dom", engagement: 130, reach: 1400 },
        ],
        platformBreakdown: [
          { platform: "Instagram", posts: posts.filter((p) => p.platforms.includes("instagram")).length, engagement: 220 },
          { platform: "Facebook", posts: posts.filter((p) => p.platforms.includes("facebook")).length, engagement: 160 },
          { platform: "TikTok", posts: posts.filter((p) => p.platforms.includes("tiktok")).length, engagement: 300 },
        ],
        bestPostingHours: [
          { hour: 9, engagementScore: 82 },
          { hour: 12, engagementScore: 74 },
          { hour: 18, engagementScore: 91 },
          { hour: 20, engagementScore: 88 },
        ],
      };
    },
  });
}
