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
      const status = (data.status as PostStatus) || "draft";
      const metrics = generatePostMetrics(status);

      const created: Post = {
        id: Math.max(0, ...posts.map((post) => post.id)) + 1,
        title: data.title || "Nova postagem",
        caption: data.caption || "",
        hashtags: data.hashtags || "",
        type: (data.type as PostType) || "feed",
        platforms: (data.platforms as Platform[]) || ["instagram"],
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

        const becamePublished =
          data.status === "published" && post.status !== "published";

        updated = {
          ...post,
          ...data,
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

        const hour = new Date(rawDate).getHours();
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
