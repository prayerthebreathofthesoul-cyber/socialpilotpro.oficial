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
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { supabase } from "@/lib/supabase";

const platformSchema = z.enum(["instagram", "facebook", "tiktok"]);

const formSchema = z.object({
  title: z.string().min(3, "O título precisa ter pelo menos 3 caracteres"),
  caption: z.string().optional(),
  hashtags: z.string().optional(),
  type: z.enum(["feed", "story"]),
  platforms: z
    .array(platformSchema)
    .min(1, "Selecione pelo menos uma plataforma"),
  mediaUrl: z.string().optional().or(z.literal("")),
  scheduledAt: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;
type Platform = z.infer<typeof platformSchema>;
type SaveAction = "draft" | "schedule" | "publish-now";

interface PostFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const POST_MEDIA_BUCKET = "post-media";

export function PostForm({ initialData, onSuccess, onCancel }: PostFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isEditing = Boolean(initialData?.id);

  const [isPending, setIsPending] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      caption: initialData?.caption || "",
      hashtags: initialData?.hashtags || "",
      type: initialData?.type || "feed",
      platforms: initialData?.platforms || ["instagram"],
      mediaUrl: initialData?.mediaUrl || initialData?.media_url || "",
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

    const fileExtension = file.name.split(".").pop() || "png";
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
          "Erro ao enviar imagem. Verifique se o bucket post-media existe e está público."
      );
    }

    const { data } = supabase.storage
      .from(POST_MEDIA_BUCKET)
      .getPublicUrl(safeFileName);

    if (!data?.publicUrl) {
      throw new Error("Não foi possível gerar URL pública da imagem.");
    }

    return data.publicUrl;
  };

  const handleMediaFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem.");
      return;
    }

    const maxSizeInMB = 5;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      toast.error(`A imagem precisa ter no máximo ${maxSizeInMB}MB.`);
      return;
    }

    setIsUploadingMedia(true);

    try {
      const publicUrl = await uploadMediaToSupabase(file);

      form.setValue("mediaUrl", publicUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });

      toast.success("Imagem enviada e adicionada ao post.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Não foi possível enviar a imagem.");
    } finally {
      setIsUploadingMedia(false);

      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const buildPostPayload = async (values: FormValues, action: SaveAction) => {
    const companyId = await getCompanyId();

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
      media_url: values.mediaUrl || null,
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

  const onSubmit = async (values: FormValues, action: SaveAction) => {
    setIsPending(true);

    try {
      if (action === "publish-now") {
        if (values.platforms.includes("tiktok")) {
          throw new Error(
            "TikTok ainda não está disponível para publicação automática."
          );
        }

        if (!values.mediaUrl) {
          throw new Error("Adicione uma imagem antes de publicar.");
        }

        if (!values.mediaUrl.startsWith("https://")) {
          throw new Error(
            "Para publicar agora, a imagem precisa ser uma URL pública https. Escolha a imagem novamente para enviar ao Supabase."
          );
        }
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
        toast.info("Enviando publicação para Facebook/Instagram...");

        await publishPostNow(savedPostId);

        toast.success("Post publicado com sucesso nas redes conectadas.");
      } else if (action === "schedule") {
        toast.success("Postagem agendada com sucesso.");
      } else {
        toast.success(
          isEditing
            ? "Rascunho atualizado com sucesso."
            : "Rascunho salvo com sucesso."
        );
      }

      onSuccess();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || "Ocorreu um erro ao salvar a postagem.");
    } finally {
      setIsPending(false);
    }
  };

  const hasScheduleDate = Boolean(form.watch("scheduledAt"));
  const mediaPreview = form.watch("mediaUrl");
  const postType = form.watch("type");
  const isStory = postType === "story";

  return (
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
                          onValueChange={field.onChange}
                        >
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="feed">Feed</TabsTrigger>
                            <TabsTrigger value="story">Story</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </FormControl>

                      <FormDescription>
                        {field.value === "story"
                          ? "Stories usam formato vertical. Recomendado: imagem 1080x1920."
                          : "Feed usa formato quadrado ou horizontal. Recomendado: imagem 1080x1080 ou 1200x1200."}
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
                            Facebook
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagem ou URL da Mídia</FormLabel>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <FormControl>
                          <Input
                            placeholder="Cole uma URL direta https ou escolha uma imagem do computador"
                            {...field}
                          />
                        </FormControl>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
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
                          {isUploadingMedia ? "Enviando..." : "Escolher Imagem"}
                        </Button>
                      </div>

                      <FormDescription>
                        Para publicar agora, a imagem precisa estar em uma URL
                        pública https. Ao escolher uma imagem do computador, ela
                        será enviada para o Supabase Storage.
                      </FormDescription>

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
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription>
                        Preencha para agendar. Deixe em branco para publicar
                        agora ou salvar como rascunho.
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
                  onSubmit(data, hasScheduleDate ? "schedule" : "publish-now")
                )}
                disabled={isPending || isUploadingMedia}
              >
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {hasScheduleDate ? "Agendar Postagem" : "Publicar Agora"}
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
                Cancelar
              </Button>
            </div>

            <div className="mt-8">
              <h3 className="font-semibold text-sm text-muted-foreground mb-1 uppercase tracking-wider">
                Preview Visual
              </h3>

              <p className="text-xs text-muted-foreground mb-3">
                {isStory
                  ? "Formato Story vertical. Recomendado: imagem 1080x1920."
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
                      isStory
                        ? "mx-auto w-full max-w-[230px] aspect-[9/16] bg-muted flex items-center justify-center overflow-hidden p-2"
                        : "aspect-square bg-muted flex items-center justify-center overflow-hidden p-2"
                    }
                  >
                    <img
                      src={mediaPreview}
                      className="max-w-full max-h-full object-contain bg-white rounded-md"
                      alt="Preview da mídia"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        toast.error(
                          "Não foi possível carregar essa imagem. Use uma URL direta https ou escolha uma imagem do computador."
                        );
                      }}
                    />
                  </div>
                ) : (
                  <div
                    className={
                      isStory
                        ? "mx-auto w-full max-w-[230px] aspect-[9/16] bg-muted flex flex-col items-center justify-center text-muted-foreground text-xs"
                        : "aspect-square bg-muted flex flex-col items-center justify-center text-muted-foreground text-xs"
                    }
                  >
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    {isStory ? "Preview do Story" : "Preview da Mídia"}
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
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
