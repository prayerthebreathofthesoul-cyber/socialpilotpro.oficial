import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  Image as ImageIcon,
  Instagram,
  Facebook,
  Upload,
  CheckCircle2,
  ExternalLink,
  X,
  GripVertical,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Video,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { supabase } from "@/lib/supabase";

const platformSchema = z.enum(["instagram", "facebook", "tiktok"]);

const postTypeSchema = z.enum(["feed", "story", "reels", "video"]);

const formSchema = z.object({
  title: z.string().min(3, "O título precisa ter pelo menos 3 caracteres"),
  caption: z.string().optional(),
  hashtags: z.string().optional(),
  type: postTypeSchema,
  platforms: z
    .array(platformSchema)
    .min(1, "Selecione pelo menos uma plataforma"),
  mediaUrl: z.string().optional().or(z.literal("")),
  mediaUrls: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type Platform = z.infer<typeof platformSchema>;
type PostType = z.infer<typeof postTypeSchema>;
type SaveAction = "draft" | "schedule" | "publish-now";
type MediaKind = "image" | "video" | null;

interface PostFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const POST_MEDIA_BUCKET = "post-media";

const isVideoUrl = (url?: string | null) => {
  if (!url) return false;

  const cleanUrl = url.split("?")[0].toLowerCase();

  return (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.endsWith(".m4v") ||
    cleanUrl.endsWith(".webm")
  );
};

const getFileKind = (file: File): MediaKind => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";

  const name = file.name.toLowerCase();

  if (
    name.endsWith(".mp4") ||
    name.endsWith(".mov") ||
    name.endsWith(".m4v") ||
    name.endsWith(".webm")
  ) {
    return "video";
  }

  if (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp")
  ) {
    return "image";
  }

  return null;
};

export function PostForm({ initialData, onSuccess, onCancel }: PostFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isEditing = Boolean(initialData?.id);

  const [isPending, setIsPending] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [draggedMediaIndex, setDraggedMediaIndex] = useState<number | null>(
    null
  );

  const getInitialMediaUrls = () => {
    if (Array.isArray(initialData?.media_urls)) {
      return initialData.media_urls.filter(Boolean);
    }

    if (Array.isArray(initialData?.mediaUrls)) {
      return initialData.mediaUrls.filter(Boolean);
    }

    if (initialData?.media_url) {
      return [initialData.media_url];
    }

    if (initialData?.mediaUrl) {
      return [initialData.mediaUrl];
    }

    return [];
  };

  const initialMediaUrls = getInitialMediaUrls();

  const [mediaKind, setMediaKind] = useState<MediaKind>(
    initialMediaUrls.some((url: string) => isVideoUrl(url)) ? "video" : "image"
  );

  const [publishSuccess, setPublishSuccess] = useState<{
    postUrl: string | null;
    facebookShareUrl: string | null;
    platforms: string[];
  } | null>(null);

  const [publishingOverlay, setPublishingOverlay] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      caption: initialData?.caption || "",
      hashtags: initialData?.hashtags || "",
      type: initialData?.type || "feed",
      platforms: initialData?.platforms || ["instagram"],
      mediaUrl: initialMediaUrls[0] || "",
      mediaUrls: initialMediaUrls,
      scheduledAt:
        initialData?.scheduledAt || initialData?.scheduled_at
          ? new Date(initialData.scheduledAt || initialData.scheduled_at)
              .toISOString()
              .slice(0, 16)
          : "",
    },
  });

  const getCompanyId = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Usuário não autenticado.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.company_id) {
      throw new Error("Empresa do usuário não encontrada.");
    }

    return profile.company_id as string;
  };

  const handlePlatformChange = (
    checked: boolean | "indeterminate",
    platform: Platform,
    currentValue: Platform[] = []
  ) => {
    if (platform === "tiktok") {
      toast.info("TikTok ainda está em desenvolvimento.");
      return currentValue;
    }

    if (checked === true) {
      return currentValue.includes(platform)
        ? currentValue
        : [...currentValue, platform];
    }

    return currentValue.filter((item) => item !== platform);
  };

  const uploadMediaToSupabase = async (file: File) => {
    const companyId = await getCompanyId();

    const fileExtension = file.name.split(".").pop() || "bin";
    const safeFileName = `${companyId}/${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from(POST_MEDIA_BUCKET)
      .upload(safeFileName, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(
        uploadError.message ||
          "Erro ao enviar mídia. Verifique se o bucket post-media existe e está público."
      );
    }

    const { data } = supabase.storage
      .from(POST_MEDIA_BUCKET)
      .getPublicUrl(safeFileName);

    if (!data?.publicUrl) {
      throw new Error("Não foi possível gerar URL pública da mídia.");
    }

    return data.publicUrl;
  };

  const handlePostTypeChange = (value: string) => {
    const nextType = value as PostType;

    const currentMediaUrls = form.getValues("mediaUrls") || [];
    const hasVideo = mediaKind === "video";

    if (
      (nextType === "reels" || nextType === "video") &&
      currentMediaUrls.length > 1
    ) {
      toast.error(
        "Reels e vídeo aceitam apenas uma mídia. Remova o carrossel antes de mudar o tipo."
      );
      return;
    }

    if (
      nextType === "reels" &&
      form.getValues("platforms").includes("facebook")
    ) {
      toast.info(
        "Reels será usado principalmente para Instagram. Para Facebook, use o tipo Vídeo."
      );
    }

    if (hasVideo && nextType === "story") {
      toast.info(
        "Vídeo em Story pode depender da sua API de publicação. Para Instagram, prefira Reels."
      );
    }

    form.setValue("type", nextType, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const handleMediaFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    setPublishSuccess(null);

    const fileKinds = files.map((file) => getFileKind(file));
    const invalidFile = fileKinds.find((kind) => kind === null);

    if (invalidFile === null) {
      toast.error("Selecione apenas imagens ou vídeos nos formatos aceitos.");
      return;
    }

    const hasImage = fileKinds.includes("image");
    const hasVideo = fileKinds.includes("video");

    if (hasImage && hasVideo) {
      toast.error("Não misture imagem e vídeo na mesma postagem.");
      return;
    }

    if (hasVideo && files.length > 1) {
      toast.error("Postagem em vídeo aceita apenas um arquivo por vez.");
      return;
    }

    const currentMediaUrls = form.getValues("mediaUrls") || [];

    if (hasVideo && currentMediaUrls.length > 0) {
      toast.error(
        "Para enviar vídeo, remova primeiro as imagens já adicionadas."
      );
      return;
    }

    if (hasImage && mediaKind === "video" && currentMediaUrls.length > 0) {
      toast.error("Para enviar imagens, remova primeiro o vídeo já adicionado.");
      return;
    }

    if (hasImage && currentMediaUrls.length + files.length > 10) {
      toast.error("O carrossel pode ter no máximo 10 imagens.");
      return;
    }

    const maxImageSizeInMB = 10;
    const maxVideoSizeInMB = 200;

    const maxImageSizeInBytes = maxImageSizeInMB * 1024 * 1024;
    const maxVideoSizeInBytes = maxVideoSizeInMB * 1024 * 1024;

    const oversizedImage = files.find(
      (file) => getFileKind(file) === "image" && file.size > maxImageSizeInBytes
    );

    if (oversizedImage) {
      toast.error(`Cada imagem precisa ter no máximo ${maxImageSizeInMB}MB.`);
      return;
    }

    const oversizedVideo = files.find(
      (file) => getFileKind(file) === "video" && file.size > maxVideoSizeInBytes
    );

    if (oversizedVideo) {
      toast.error(`O vídeo precisa ter no máximo ${maxVideoSizeInMB}MB.`);
      return;
    }

    setIsUploadingMedia(true);

    try {
      toast.info(
        hasVideo
          ? "Enviando vídeo..."
          : files.length > 1
            ? "Enviando imagens do carrossel..."
            : "Enviando imagem..."
      );

      const uploadedUrls = await Promise.all(
        files.map((file) => uploadMediaToSupabase(file))
      );

      const nextMediaUrls = hasVideo
        ? uploadedUrls
        : [...currentMediaUrls, ...uploadedUrls];

      form.setValue("mediaUrls", nextMediaUrls, {
        shouldDirty: true,
        shouldValidate: true,
      });

      form.setValue("mediaUrl", nextMediaUrls[0] || "", {
        shouldDirty: true,
        shouldValidate: true,
      });

      setMediaKind(hasVideo ? "video" : "image");

      if (hasVideo) {
        const currentType = form.getValues("type");

        if (currentType === "feed" || currentType === "story") {
          form.setValue("type", "reels", {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }

      toast.success(
        hasVideo
          ? "Vídeo enviado e adicionado ao post."
          : files.length > 1
            ? "Imagens adicionadas ao carrossel."
            : "Imagem enviada e adicionada ao post."
      );
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Não foi possível enviar a mídia.");
    } finally {
      setIsUploadingMedia(false);

      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const removeMediaUrl = (urlToRemove: string) => {
    setPublishSuccess(null);

    const currentMediaUrls = form.getValues("mediaUrls") || [];
    const nextMediaUrls = currentMediaUrls.filter((url) => url !== urlToRemove);

    form.setValue("mediaUrls", nextMediaUrls, {
      shouldDirty: true,
      shouldValidate: true,
    });

    form.setValue("mediaUrl", nextMediaUrls[0] || "", {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (nextMediaUrls.length === 0) {
      setMediaKind(null);
    } else {
      setMediaKind(
        nextMediaUrls.some((url) => isVideoUrl(url)) ? "video" : "image"
      );
    }

    toast.success("Mídia removida.");
  };

  const reorderMediaUrls = (fromIndex: number, toIndex: number) => {
    if (mediaKind === "video") return;
    if (fromIndex === toIndex) return;

    const currentMediaUrls = form.getValues("mediaUrls") || [];

    if (
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= currentMediaUrls.length ||
      toIndex >= currentMediaUrls.length
    ) {
      return;
    }

    const nextMediaUrls = [...currentMediaUrls];
    const [movedItem] = nextMediaUrls.splice(fromIndex, 1);

    nextMediaUrls.splice(toIndex, 0, movedItem);

    form.setValue("mediaUrls", nextMediaUrls, {
      shouldDirty: true,
      shouldValidate: true,
    });

    form.setValue("mediaUrl", nextMediaUrls[0] || "", {
      shouldDirty: true,
      shouldValidate: true,
    });

    setPublishSuccess(null);
  };

  const moveMediaLeft = (index: number) => {
    if (index <= 0) return;
    reorderMediaUrls(index, index - 1);
  };

  const moveMediaRight = (index: number) => {
    const currentMediaUrls = form.getValues("mediaUrls") || [];
    if (index >= currentMediaUrls.length - 1) return;
    reorderMediaUrls(index, index + 1);
  };

  const buildPostPayload = async (values: FormValues, action: SaveAction) => {
    const companyId = await getCompanyId();

    const mediaUrls = (values.mediaUrls || []).filter(Boolean);
    const primaryMediaUrl = mediaUrls[0] || values.mediaUrl || null;

    const status =
      action === "schedule"
        ? "scheduled"
        : action === "publish-now"
          ? "publishing"
          : "draft";

    return {
      company_id: companyId,
      title: values.title,
      caption: values.caption || "",
      hashtags: values.hashtags || "",
      type: values.type,
      platforms: values.platforms,
      media_url: primaryMediaUrl,
      media_urls: mediaUrls,
      status,
      scheduled_at:
        action === "schedule" && values.scheduledAt
          ? new Date(values.scheduledAt).toISOString()
          : null,
      published_at: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    };
  };

  const publishPostNow = async (postId: string | number) => {
    const response = await fetch("/api/meta/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        postId,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Erro ao publicar na Meta:", result);

      const message =
        result?.error ||
        result?.details ||
        "Erro ao publicar nas redes sociais.";

      throw new Error(message);
    }

    return result;
  };

  const getPublishedPostUrl = (publishResult: any) => {
    const instagramUrl = publishResult?.postUrls?.instagram;
    const facebookUrl = publishResult?.postUrls?.facebook;

    if (instagramUrl) return instagramUrl;
    if (facebookUrl) return facebookUrl;

    const instagramResultUrl = publishResult?.results?.instagram?.url;
    const facebookResultUrl = publishResult?.results?.facebook?.url;

    if (instagramResultUrl) return instagramResultUrl;
    if (facebookResultUrl) return facebookResultUrl;

    return null;
  };

  const getFacebookShareUrl = (publishResult: any, fallbackUrl: string | null) => {
    const facebookUrl = publishResult?.postUrls?.facebook;
    const facebookResultUrl = publishResult?.results?.facebook?.url;

    if (facebookUrl) return facebookUrl;
    if (facebookResultUrl) return facebookResultUrl;

    return fallbackUrl;
  };

  const formatPlatformName = (platform: string) => {
    if (platform === "instagram") return "Instagram";
    if (platform === "facebook") return "Página do Facebook";
    if (platform === "tiktok") return "TikTok";
    return platform;
  };

  const formatSelectedPlatforms = (platforms: string[]) => {
    const names = platforms.map((platform) => formatPlatformName(platform));

    if (names.length === 0) {
      return "as redes sociais";
    }

    if (names.length === 1) {
      return names[0];
    }

    if (names.length === 2) {
      return `${names[0]} e ${names[1]}`;
    }

    return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
  };

  const getPublishingMessage = (
    platforms: string[],
    isCarouselPost: boolean,
    isVideoPost: boolean
  ) => {
    const platformText = formatSelectedPlatforms(platforms);

    if (isVideoPost) {
      return `Publicando vídeo no ${platformText}...`;
    }

    if (isCarouselPost) {
      return `Publicando carrossel no ${platformText}...`;
    }

    return `Publicando no ${platformText}...`;
  };

  const getPublishedSuccessTitle = (platforms: string[]) => {
    if (platforms.length === 1) {
      return `Publicação feita com sucesso no ${formatSelectedPlatforms(
        platforms
      )}!`;
    }

    if (platforms.includes("instagram") && platforms.includes("facebook")) {
      return "Publicação feita com sucesso no Instagram e na Página do Facebook!";
    }

    return `Publicação feita com sucesso em ${formatSelectedPlatforms(
      platforms
    )}!`;
  };

  const getPublishedSuccessDescription = (platforms: string[]) => {
    if (platforms.length === 1) {
      return `Seu post foi enviado para o ${formatSelectedPlatforms(
        platforms
      )}.`;
    }

    return `Seu post foi enviado para ${formatSelectedPlatforms(platforms)}.`;
  };

  const onSubmit = async (values: FormValues, action: SaveAction) => {
    setIsPending(true);

    try {
      const mediaUrls = (values.mediaUrls || []).filter(Boolean);
      const isPublishingOrScheduling =
        action === "publish-now" || action === "schedule";

      const hasVideo = mediaKind === "video";
      const hasCarousel = mediaUrls.length > 1;

      if (isPublishingOrScheduling) {
        setPublishSuccess(null);

        if (values.platforms.includes("tiktok")) {
          throw new Error(
            "TikTok ainda não está disponível para publicação automática."
          );
        }

        if (mediaUrls.length === 0) {
          throw new Error(
            action === "schedule"
              ? "Adicione pelo menos uma mídia antes de agendar."
              : "Adicione pelo menos uma mídia antes de publicar."
          );
        }

        const invalidMediaUrl = mediaUrls.find(
          (url) => !url.startsWith("https://")
        );

        if (invalidMediaUrl) {
          throw new Error(
            "Todas as mídias precisam ser URLs públicas https. Escolha os arquivos novamente para enviar ao Supabase."
          );
        }

        if (hasVideo && hasCarousel) {
          throw new Error("Vídeo não pode ser publicado como carrossel.");
        }

        if (hasVideo && values.type === "feed") {
          throw new Error(
            "Para publicar vídeo, escolha o tipo Reels ou Vídeo."
          );
        }

        if (values.type === "reels" && !values.platforms.includes("instagram")) {
          throw new Error(
            "Para Reels, selecione Instagram. Para Facebook, use o tipo Vídeo."
          );
        }

        if (values.type === "reels" && !hasVideo) {
          toast.info(
            "Você escolheu Reels, mas a mídia enviada parece ser imagem. Para Reels, envie um vídeo."
          );
        }

        if (values.type === "video" && !hasVideo) {
          throw new Error("Para o tipo Vídeo, envie um arquivo de vídeo.");
        }
      }

      if (action === "schedule" && !values.scheduledAt) {
        throw new Error("Escolha a data e hora para agendar a postagem.");
      }

      const payload = await buildPostPayload(values, action);

      let savedPostId = initialData?.id;

      if (isEditing && initialData?.id) {
        const { data, error } = await supabase
          .from("posts")
          .update(payload)
          .eq("id", initialData.id)
          .select("id")
          .single();

        if (error) throw error;

        savedPostId = data?.id || initialData.id;
      } else {
        const { data, error } = await supabase
          .from("posts")
          .insert({
            ...payload,
            created_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (error) throw error;

        savedPostId = data?.id;
      }

      if (!savedPostId) {
        throw new Error("Não foi possível identificar o post salvo.");
      }

      if (action === "publish-now") {
        setPublishingOverlay(true);

        const loadingToast = toast.loading(
          getPublishingMessage(values.platforms, hasCarousel, hasVideo)
        );

        const publishResult = await publishPostNow(savedPostId);

        toast.dismiss(loadingToast);
        setPublishingOverlay(false);

        const postUrl = getPublishedPostUrl(publishResult);
        const facebookShareUrl = getFacebookShareUrl(publishResult, postUrl);

        setPublishSuccess({
          postUrl,
          facebookShareUrl,
          platforms: values.platforms,
        });

        toast.success(getPublishedSuccessTitle(values.platforms), {
          description: postUrl
            ? `${getPublishedSuccessDescription(
                values.platforms
              )} Clique em Ver post para abrir a publicação.`
            : getPublishedSuccessDescription(values.platforms),
          duration: 10000,
          action: postUrl
            ? {
                label: "Ver post",
                onClick: () => {
                  window.open(postUrl, "_blank", "noopener,noreferrer");
                },
              }
            : undefined,
        });

        return;
      } else if (action === "schedule") {
        toast.success("Postagem agendada com sucesso.", {
          description:
            "Sua postagem foi salva no calendário para a data e hora escolhidas.",
          duration: 5000,
        });
      } else {
        toast.success(
          isEditing
            ? "Rascunho atualizado com sucesso."
            : "Rascunho salvo com sucesso.",
          {
            duration: 3500,
          }
        );
      }

      onSuccess();
    } catch (error: any) {
      console.error(error);
      setPublishingOverlay(false);
      toast.error(error?.message || "Ocorreu um erro ao salvar a postagem.");
    } finally {
      setIsPending(false);
    }
  };

  const mediaUrls = form.watch("mediaUrls") || [];
  const mediaPreview = mediaUrls[0] || form.watch("mediaUrl");
  const postType = form.watch("type");
  const selectedPlatforms = form.watch("platforms") || [];

  const isStory = postType === "story";
  const isReels = postType === "reels";
  const isVideoPost = postType === "video" || mediaKind === "video";
  const isCarousel = mediaKind !== "video" && mediaUrls.length > 1;
  const hasMedia = mediaUrls.length > 0;

  return (
    <div className="space-y-6">
      {publishingOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-2xl border animate-in fade-in zoom-in-95 slide-in-from-top-6 duration-500">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-5">
                <Loader2 className="w-10 h-10 text-blue-700 animate-spin" />
              </div>

              <h2 className="text-3xl font-bold text-slate-900">
                {getPublishingMessage(selectedPlatforms, isCarousel, isVideoPost)}
              </h2>

              <p className="text-lg text-slate-600 mt-3">
                Aguarde um instante. Estamos enviando sua publicação para{" "}
                {formatSelectedPlatforms(selectedPlatforms)}.
              </p>

              <div className="mt-6 w-full rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm font-medium text-blue-800">
                  Não feche esta tela enquanto a publicação está sendo enviada.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {publishSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl border border-green-300 animate-in fade-in zoom-in-95 slide-in-from-top-6 duration-500">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-green-600 flex items-center justify-center mb-5 shadow-lg animate-in zoom-in duration-700">
                <CheckCircle2 className="w-14 h-14 text-white" />
              </div>

              <h2 className="text-4xl font-extrabold text-green-800">
                {getPublishedSuccessTitle(publishSuccess.platforms)}
              </h2>

              <p className="text-xl text-green-700 mt-4">
                {getPublishedSuccessDescription(publishSuccess.platforms)}
              </p>

              <p className="text-base text-slate-600 mt-3">
                Agora você pode abrir o post publicado, compartilhar no seu
                perfil pessoal do Facebook ou voltar ao calendário.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                {publishSuccess.postUrl && (
                  <>
                    <Button
                      type="button"
                      size="lg"
                      className="bg-green-700 hover:bg-green-800 text-white text-base px-6 py-6"
                      onClick={() =>
                        window.open(
                          publishSuccess.postUrl!,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Ver post publicado
                    </Button>

                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      className="text-base px-6 py-6 border-blue-600 text-blue-700 hover:bg-blue-50"
                      onClick={() => {
                        const urlToShare =
                          publishSuccess.facebookShareUrl ||
                          publishSuccess.postUrl ||
                          "";

                        const shareUrl = encodeURIComponent(urlToShare);

                        window.open(
                          `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }}
                    >
                      <Facebook className="w-5 h-5 mr-2" />
                      Compartilhar no meu perfil
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="text-base px-6 py-6"
                  onClick={onSuccess}
                >
                  Voltar ao calendário
                </Button>

                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  className="text-base px-6 py-6"
                  onClick={() => setPublishSuccess(null)}
                >
                  Continuar nesta tela
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <Form {...form}>
                <form className="space-y-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Tipo de Postagem</FormLabel>
                        <FormControl>
                          <Tabs
                            value={field.value}
                            onValueChange={handlePostTypeChange}
                          >
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="feed">Feed</TabsTrigger>
                              <TabsTrigger value="story">Story</TabsTrigger>
                              <TabsTrigger value="reels">Reels</TabsTrigger>
                              <TabsTrigger value="video">Vídeo</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </FormControl>

                        <FormDescription>
                          {field.value === "story"
                            ? "Stories usam formato vertical. Recomendado: 1080x1920."
                            : field.value === "reels"
                              ? "Reels usa vídeo vertical. Recomendado: MP4 1080x1920."
                              : field.value === "video"
                                ? "Vídeo para Página do Facebook ou Instagram. Recomendado: MP4."
                                : "Feed usa imagem quadrada ou horizontal. Recomendado: 1080x1080 ou 1200x1200."}
                        </FormDescription>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="platforms"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormLabel>Plataformas</FormLabel>

                        <div className="flex flex-wrap gap-4">
                          <label className="flex flex-row items-center space-x-3 space-y-0 p-4 border rounded-md cursor-pointer">
                            <Checkbox
                              checked={field.value?.includes("instagram")}
                              onCheckedChange={(checked) =>
                                field.onChange(
                                  handlePlatformChange(
                                    checked,
                                    "instagram",
                                    field.value || []
                                  )
                                )
                              }
                            />
                            <span className="font-normal flex items-center gap-2">
                              <Instagram className="w-4 h-4 text-pink-600" />
                              Instagram
                            </span>
                          </label>

                          <label className="flex flex-row items-center space-x-3 space-y-0 p-4 border rounded-md cursor-pointer">
                            <Checkbox
                              checked={field.value?.includes("facebook")}
                              onCheckedChange={(checked) =>
                                field.onChange(
                                  handlePlatformChange(
                                    checked,
                                    "facebook",
                                    field.value || []
                                  )
                                )
                              }
                            />
                            <span className="font-normal flex items-center gap-2">
                              <Facebook className="w-4 h-4 text-blue-600" />
                              Página do Facebook
                            </span>
                          </label>

                          <label className="flex flex-row items-center space-x-3 space-y-0 p-4 border rounded-md opacity-60 cursor-not-allowed">
                            <Checkbox
                              checked={field.value?.includes("tiktok")}
                              disabled
                            />
                            <span className="font-normal flex items-center gap-2">
                              <SiTiktok className="w-4 h-4" />
                              TikTok em breve
                            </span>
                          </label>
                        </div>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título Interno</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Furadeira em promoção"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Usado apenas para identificação no sistema.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mediaUrl"
                    render={() => (
                      <FormItem>
                        <FormLabel>
                          Mídia da Postagem{" "}
                          {isCarousel && (
                            <span className="text-xs text-muted-foreground">
                              ({mediaUrls.length} imagens no carrossel)
                            </span>
                          )}
                          {mediaKind === "video" && (
                            <span className="text-xs text-muted-foreground">
                              {" "}
                              (vídeo selecionado)
                            </span>
                          )}
                        </FormLabel>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/mp4,video/quicktime,video/x-m4v,video/webm"
                            multiple={mediaKind !== "video"}
                            className="hidden"
                            onChange={handleMediaFileChange}
                          />

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingMedia || isPending}
                          >
                            {isUploadingMedia ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            {isUploadingMedia
                              ? "Enviando..."
                              : "Escolher Mídia"}
                          </Button>
                        </div>

                        <FormDescription>
                          Você pode selecionar imagens ou vídeo. Imagens podem
                          formar carrossel com até 10 itens. Vídeo/Reels aceita
                          apenas 1 arquivo por postagem.
                        </FormDescription>

                        {mediaUrls.length > 0 && (
                          <div className="space-y-3 mt-4">
                            {mediaKind === "image" && mediaUrls.length > 1 && (
                              <p className="text-xs text-muted-foreground">
                                Arraste as imagens para mudar a ordem. A primeira
                                imagem será a capa da postagem.
                              </p>
                            )}

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {mediaUrls.map((url, index) => {
                                const itemIsVideo =
                                  isVideoUrl(url) || mediaKind === "video";

                                return (
                                  <div
                                    key={`${url}-${index}`}
                                    draggable={
                                      !itemIsVideo &&
                                      !isPending &&
                                      !isUploadingMedia
                                    }
                                    onDragStart={() =>
                                      !itemIsVideo &&
                                      setDraggedMediaIndex(index)
                                    }
                                    onDragOver={(event) =>
                                      event.preventDefault()
                                    }
                                    onDrop={() => {
                                      if (itemIsVideo) return;
                                      if (draggedMediaIndex === null) return;
                                      reorderMediaUrls(draggedMediaIndex, index);
                                      setDraggedMediaIndex(null);
                                    }}
                                    onDragEnd={() => setDraggedMediaIndex(null)}
                                    className={`relative border rounded-md overflow-hidden bg-muted transition ${
                                      itemIsVideo
                                        ? ""
                                        : "cursor-move hover:ring-2 hover:ring-primary/50"
                                    } ${
                                      draggedMediaIndex === index
                                        ? "opacity-50 ring-2 ring-primary"
                                        : ""
                                    }`}
                                  >
                                    {itemIsVideo ? (
                                      <video
                                        src={url}
                                        className="w-full aspect-square object-cover"
                                        controls
                                      />
                                    ) : (
                                      <img
                                        src={url}
                                        alt={`Imagem ${index + 1}`}
                                        className="w-full aspect-square object-cover"
                                      />
                                    )}

                                    {!itemIsVideo && (
                                      <div className="absolute top-2 left-2 h-7 px-2 rounded-md bg-black/60 text-white flex items-center gap-1 text-xs">
                                        <GripVertical className="w-4 h-4" />
                                        Arrastar
                                      </div>
                                    )}

                                    {itemIsVideo && (
                                      <div className="absolute top-2 left-2 h-7 px-2 rounded-md bg-black/60 text-white flex items-center gap-1 text-xs">
                                        <Video className="w-4 h-4" />
                                        Vídeo
                                      </div>
                                    )}

                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="destructive"
                                      className="absolute top-2 right-2 h-7 w-7"
                                      onClick={() => removeMediaUrl(url)}
                                      disabled={isPending || isUploadingMedia}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>

                                    {!itemIsVideo && (
                                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-2 py-2 space-y-2">
                                        <div className="font-medium">
                                          {index === 0
                                            ? "Capa / Imagem 1"
                                            : `Imagem ${index + 1}`}
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            className="h-7 w-7"
                                            onClick={() => moveMediaLeft(index)}
                                            disabled={
                                              index === 0 ||
                                              isPending ||
                                              isUploadingMedia
                                            }
                                          >
                                            <ArrowLeft className="w-4 h-4" />
                                          </Button>

                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="secondary"
                                            className="h-7 w-7"
                                            onClick={() => moveMediaRight(index)}
                                            disabled={
                                              index === mediaUrls.length - 1 ||
                                              isPending ||
                                              isUploadingMedia
                                            }
                                          >
                                            <ArrowRight className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="caption"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legenda</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Escreva a legenda do seu post..."
                            className="min-h-[120px] resize-y"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hashtags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hashtags</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="#promoção #novidade #oferta"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scheduledAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data e Hora de Agendamento</FormLabel>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <FormControl>
                            <Input type="datetime-local" {...field} />
                          </FormControl>

                          <Button
                            type="button"
                            className="sm:w-auto whitespace-nowrap"
                            onClick={form.handleSubmit((data) =>
                              onSubmit(data, "schedule")
                            )}
                            disabled={
                              isPending || isUploadingMedia || !field.value
                            }
                          >
                            {isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CalendarClock className="mr-2 h-4 w-4" />
                            )}
                            Agendar Postagem
                          </Button>
                        </div>

                        <FormDescription>
                          Escolha a data e hora e clique em Agendar Postagem.
                          Assim você não perde a mídia, título, legenda e
                          hashtags já preenchidos.
                        </FormDescription>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-6">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Ações</h3>

              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  variant="default"
                  className="w-full"
                  onClick={form.handleSubmit((data) =>
                    onSubmit(data, "publish-now")
                  )}
                  disabled={isPending || isUploadingMedia}
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Publicar Agora
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={form.handleSubmit((data) => onSubmit(data, "draft"))}
                  disabled={isPending || isUploadingMedia}
                >
                  Salvar como Rascunho
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={onCancel}
                  disabled={isPending || isUploadingMedia}
                >
                  Voltar ao calendário
                </Button>
              </div>

              <div className="mt-8">
                <h3 className="font-semibold text-sm text-muted-foreground mb-1 uppercase tracking-wider">
                  Preview Visual
                </h3>

                <p className="text-xs text-muted-foreground mb-3">
                  {postType === "story"
                    ? "Formato Story vertical. Recomendado: 1080x1920."
                    : postType === "reels"
                      ? "Formato Reels vertical. Recomendado: vídeo 1080x1920."
                      : postType === "video"
                        ? "Preview de vídeo."
                        : isCarousel
                          ? `Carrossel com ${mediaUrls.length} imagens.`
                          : "Formato Feed. Recomendado: imagem quadrada ou horizontal."}
                </p>

                <div className="border rounded-md overflow-hidden bg-background">
                  <div className="p-3 flex items-center gap-2 border-b">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      SP
                    </div>
                    <span className="font-medium text-sm">SocialPilot Pro</span>
                  </div>

                  {mediaPreview ? (
                    <div
                      className={
                        isStory || isReels
                          ? "mx-auto w-full max-w-[230px] aspect-[9/16] bg-muted flex items-center justify-center overflow-hidden p-2"
                          : "aspect-square bg-muted flex items-center justify-center overflow-hidden p-2"
                      }
                    >
                      {mediaKind === "video" || isVideoUrl(mediaPreview) ? (
                        <video
                          src={mediaPreview}
                          className="max-w-full max-h-full object-contain bg-black rounded-md"
                          controls
                          onError={() => {
                            toast.error(
                              "Não foi possível carregar esse vídeo. Escolha novamente um vídeo do computador."
                            );
                          }}
                        />
                      ) : (
                        <img
                          src={mediaPreview}
                          className="max-w-full max-h-full object-contain bg-white rounded-md"
                          alt="Preview da mídia"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                            toast.error(
                              "Não foi possível carregar essa imagem. Escolha novamente uma imagem do computador."
                            );
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      className={
                        isStory || isReels
                          ? "mx-auto w-full max-w-[230px] aspect-[9/16] bg-muted flex flex-col items-center justify-center text-muted-foreground text-xs"
                          : "aspect-square bg-muted flex flex-col items-center justify-center text-muted-foreground text-xs"
                      }
                    >
                      {postType === "reels" || postType === "video" ? (
                        <Video className="w-8 h-8 mb-2 opacity-50" />
                      ) : (
                        <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                      )}
                      {postType === "story"
                        ? "Preview do Story"
                        : postType === "reels"
                          ? "Preview do Reels"
                          : postType === "video"
                            ? "Preview do Vídeo"
                            : "Preview da Mídia"}
                    </div>
                  )}

                  {isCarousel && (
                    <div className="px-3 pt-3">
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {mediaUrls.map((url, index) => (
                          <img
                            key={`${url}-thumb-${index}`}
                            src={url}
                            alt={`Miniatura ${index + 1}`}
                            className="w-12 h-12 rounded-md object-cover border"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-3 text-sm space-y-2">
                    <p className="font-semibold text-sm line-clamp-2">
                      {form.watch("title") || "Título do post"}
                    </p>

                    <p className="line-clamp-3 whitespace-pre-wrap text-muted-foreground">
                      {form.watch("caption") || "Sua legenda aparecerá aqui..."}
                    </p>

                    {form.watch("hashtags") && (
                      <p className="text-blue-600 mt-1 line-clamp-2">
                        {form.watch("hashtags")}
                      </p>
                    )}

                    {hasMedia && (
                      <p className="text-xs text-muted-foreground pt-1">
                        Tipo:{" "}
                        {mediaKind === "video"
                          ? postType === "reels"
                            ? "Reels / Vídeo"
                            : "Vídeo"
                          : isCarousel
                            ? "Carrossel de imagens"
                            : "Imagem"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
