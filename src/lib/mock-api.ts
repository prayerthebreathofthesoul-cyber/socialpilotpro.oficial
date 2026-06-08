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

export type StorePlan = "free" | "premium";
export type StorePlanStatus = "active" | "blocked" | "cancelled";
export type StoreDocumentType = "cpf" | "cnpj";

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
  email?: string | null;
  ownerName?: string | null;
  segment?: string | null;
  cnpj?: string | null;
  cpf?: string | null;
  documentType?: StoreDocumentType | null;
  documentNumber?: string | null;
  instagramConnected?: boolean;
  facebookConnected?: boolean;
  tiktokConnected?: boolean;
  plan?: StorePlan;
  planStatus?: StorePlanStatus;
  postsLimit?: number | null;
  postsUsed?: number;
  createdAt?: string;
  isMaster?: boolean;
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

const DEMO_POST_TITLES = [
  "Oferta relâmpago de ferramentas",
  "Story de novidades",
  "Post publicado de demonstração",
];

function nowMinus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function onlyNumbers(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function normalizeEmail(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDocument(value: unknown) {
  return onlyNumbers(value);
}

/**
 * IMPORTANTE:
 * Não usamos mais posts fixos.
 * Isso evita Dashboard e Analytics ficarem presos em 3 posts.
 */
const defaultPosts: Post[] = [];

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
    email: "cliente@socialpilotpro.com",
    ownerName: "Cliente Demo",
    segment: "Ferramentas e utilidades",
    cnpj: "",
    cpf: "",
    documentType: "cnpj",
    documentNumber: "",
    instagramConnected: true,
    facebookConnected: false,
    tiktokConnected: false,
    plan: "free",
    planStatus: "active",
    postsLimit: 15,
    postsUsed: 0,
    createdAt: nowMinus(1),
    isMaster: false,
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
    localStorage.setItem(key, JSON.stringify(fallback));
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

function normalizeStore(
  item: Record<string, any>,
  fallbackId: number
): StoreRecord {
  const numericId = Number(item.id);

  const plan: StorePlan = item.plan === "premium" ? "premium" : "free";

  const planStatus: StorePlanStatus =
    item.planStatus === "blocked" || item.plan_status === "blocked"
      ? "blocked"
      : item.planStatus === "cancelled" || item.plan_status === "cancelled"
        ? "cancelled"
        : "active";

  const rawDocumentType =
    item.documentType || item.document_type || item.tipoDocumento;

  const cnpjDocument = normalizeDocument(
    item.cnpj || item.companyDocument || item.company_document
  );

  const cpfDocument = normalizeDocument(item.cpf);

  const genericDocument = normalizeDocument(
    item.documentNumber ||
      item.document_number ||
      item.document ||
      item.documento ||
      item.cpfCnpj ||
      item.cpf_cnpj ||
      cnpjDocument ||
      cpfDocument
  );

  const documentType: StoreDocumentType =
    rawDocumentType === "cpf" || genericDocument.length === 11
      ? "cpf"
      : "cnpj";

  const documentNumber = genericDocument;

  return {
    id: Number.isFinite(numericId) && numericId > 0 ? numericId : fallbackId,
    name: item.name || item.companyName || item.company_name || "Minha Empresa",
    email: item.email || item.ownerEmail || item.owner_email || null,
    ownerName: item.ownerName || item.owner_name || item.name || null,
    segment: item.segment || null,
    cnpj:
      documentType === "cnpj"
        ? documentNumber
        : cnpjDocument || item.cnpj || null,
    cpf:
      documentType === "cpf"
        ? documentNumber
        : cpfDocument || item.cpf || null,
    documentType,
    documentNumber,
    instagramConnected: Boolean(item.instagramConnected),
    facebookConnected: Boolean(item.facebookConnected),
    tiktokConnected: Boolean(item.tiktokConnected),
    plan,
    planStatus,
    postsLimit:
      plan === "premium"
        ? null
        : Number.isFinite(Number(item.postsLimit || item.posts_limit))
          ? Number(item.postsLimit || item.posts_limit)
          : 15,
    postsUsed: Number.isFinite(Number(item.postsUsed || item.posts_used))
      ? Number(item.postsUsed || item.posts_used)
      : 0,
    createdAt:
      item.createdAt ||
      item.created_at ||
      item.updatedAt ||
      item.updated_at ||
      new Date().toISOString(),
    isMaster: Boolean(item.isMaster || item.is_master),
  };
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

function isDemoPost(post: Post) {
  return DEMO_POST_TITLES.includes(post.title);
}

function getPosts() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(POSTS_KEY);

    if (!raw) {
      localStorage.setItem(POSTS_KEY, JSON.stringify(defaultPosts));
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      localStorage.setItem(POSTS_KEY, JSON.stringify([]));
      return [];
    }

    const normalizedPosts = parsed.map((post, index) =>
      normalizePost(post as unknown as Record<string, any>, index + 1)
    );

    const realPosts = normalizedPosts.filter((post) => !isDemoPost(post));

    const uniquePostsMap = new Map<string, Post>();

    realPosts.forEach((post) => {
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
  } catch {
    localStorage.setItem(POSTS_KEY, JSON.stringify([]));
    return [];
  }
}

function setPosts(posts: Post[]) {
  const normalizedPosts = posts
    .map((post, index) =>
      normalizePost(post as unknown as Record<string, any>, index + 1)
    )
    .filter((post) => !isDemoPost(post));

  syncCurrentStoreUsage(normalizedPosts.length);

  return writeJson(POSTS_KEY, normalizedPosts);
}

function getMedia() {
  return readJson<MediaFile[]>(MEDIA_KEY, defaultMedia);
}

function setMedia(media: MediaFile[]) {
  return writeJson(MEDIA_KEY, media);
}

function getStores() {
  if (typeof window === "undefined") {
    return defaultStores;
  }

  try {
    const raw = localStorage.getItem(STORES_KEY);

    if (!raw) {
      localStorage.setItem(STORES_KEY, JSON.stringify(defaultStores));
      return defaultStores;
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      localStorage.setItem(STORES_KEY, JSON.stringify(defaultStores));
      return defaultStores;
    }

    const normalizedStores = parsed.map((store, index) =>
      normalizeStore(store as unknown as Record<string, any>, index + 1)
    );

    const stores = normalizedStores.length > 0 ? normalizedStores : defaultStores;

    writeJson(STORES_KEY, stores);

    return stores;
  } catch {
    localStorage.setItem(STORES_KEY, JSON.stringify(defaultStores));
    return defaultStores;
  }
}

function setStores(stores: StoreRecord[]) {
  const normalizedStores = stores.map((store, index) =>
    normalizeStore(store as unknown as Record<string, any>, index + 1)
  );

  return writeJson(STORES_KEY, normalizedStores);
}

function getCurrentStore() {
  const stores = getStores();

  if (!stores.length) {
    setStores(defaultStores);
    return defaultStores[0];
  }

  const currentEmail =
    typeof window !== "undefined"
      ? normalizeEmail(localStorage.getItem("socialpilot_user_email"))
      : "";

  if (currentEmail) {
    const storeByEmail = stores.find(
      (store) => normalizeEmail(store.email) === currentEmail
    );

    if (storeByEmail) return storeByEmail;
  }

  return stores[0];
}

function syncCurrentStoreUsage(postsCount: number) {
  if (typeof window === "undefined") return;

  try {
    const stores = getStores();

    if (!stores.length) return;

    const currentEmail = normalizeEmail(
      localStorage.getItem("socialpilot_user_email")
    );

    const updatedStores = stores.map((store, index) => {
      const isCurrentStore = currentEmail
        ? normalizeEmail(store.email) === currentEmail
        : index === 0;

      if (!isCurrentStore) return store;

      return {
        ...store,
        postsUsed: postsCount,
      };
    });

    writeJson(STORES_KEY, updatedStores);
  } catch {
    // Não quebra o app caso o localStorage esteja indisponível.
  }
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
      const currentStore = getCurrentStore();

      if (currentStore.planStatus === "blocked") {
        throw new Error(
          "Esta conta está bloqueada. Entre em contato com o suporte."
        );
      }

      if (currentStore.planStatus === "cancelled") {
        throw new Error(
          "Esta conta está cancelada. Entre em contato com o suporte."
        );
      }

      if (currentStore.plan !== "premium") {
        const postsLimit = currentStore.postsLimit ?? 15;
        const postsUsed = currentStore.postsUsed ?? posts.length;

        if (postsUsed >= postsLimit) {
          throw new Error(
            `Limite do plano gratuito atingido. Seu plano permite até ${postsLimit} posts por mês.`
          );
        }
      }

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

      const stores = getStores();
      const currentEmail =
        typeof window !== "undefined"
          ? normalizeEmail(localStorage.getItem("socialpilot_user_email"))
          : "";

      const updatedStores = stores.map((store, index) => {
        const isCurrentStore = currentEmail
          ? normalizeEmail(store.email) === currentEmail
          : index === 0;

        if (!isCurrentStore) return store;

        return {
          ...store,
          postsUsed: (store.postsUsed ?? 0) + 1,
        };
      });

      setStores(updatedStores);

      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
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
      queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
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
      queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
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
    queryFn: async () => {
      const stores = getStores();
      return stores;
    },
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

        updated = normalizeStore(
          {
            ...store,
            ...data,
          },
          id
        );

        return updated;
      });

      setStores(stores);

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
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

export function useDeleteStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const stores = getStores();

      const storeToDelete = stores.find((store) => store.id === id);

      if (!storeToDelete) {
        throw new Error("Empresa não encontrada.");
      }

      const updatedStores = stores.filter((store) => store.id !== id);

      setStores(updatedStores);

      return {
        ok: true,
        deletedStore: storeToDelete,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListStoresQueryKey() });
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

export function useGetDashboardSummary(_options?: QueryOptions) {
  return useQuery({
    queryKey: getGetDashboardSummaryQueryKey(),
    queryFn: async () => {
      const posts = getPosts();
      const currentStore = getCurrentStore();

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

      if (currentStore.planStatus === "blocked") {
        alerts.push({
          id: 2,
          severity: "error",
          message:
            "Sua conta está bloqueada. Entre em contato com o suporte para reativação.",
        });
      }

      if (currentStore.plan !== "premium") {
        const limit = currentStore.postsLimit ?? 15;
        const used = currentStore.postsUsed ?? posts.length;

        if (used >= limit) {
          alerts.push({
            id: 3,
            severity: "warning",
            message:
              "Você atingiu o limite do plano gratuito. Faça upgrade para continuar criando posts.",
          });
        } else if (used >= limit - 3) {
          alerts.push({
            id: 4,
            severity: "warning",
            message: `Atenção: você já usou ${used} de ${limit} posts do plano gratuito.`,
          });
        }
      }

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
        plan: currentStore.plan ?? "free",
        planStatus: currentStore.planStatus ?? "active",
        postsLimit:
          currentStore.plan === "premium" ? null : currentStore.postsLimit ?? 15,
        postsUsed: currentStore.postsUsed ?? posts.length,
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
