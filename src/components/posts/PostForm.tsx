import { useRef } from "react";
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
import {
  useCreatePost,
  useUpdatePost,
  usePublishPost,
  getListPostsQueryKey,
  type Post,
  type PostInputPlatformsItem,
  type PostInputStatus,
  type PostInputType,
  type PostUpdatePlatformsItem,
  type PostUpdateStatus,
  type PostUpdateType,
} from "@/lib/mock-api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Image as ImageIcon,
  Instagram,
  Facebook,
  Upload,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";

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
  initialData?: Post;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PostForm({ initialData, onSuccess, onCancel }: PostFormProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isEditing = Boolean(initialData);

  const createPost = useCreatePost();
  const updatePost = useUpdatePost();
  const publishPost = usePublishPost();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initialData?.title || "",
      caption: initialData?.caption || "",
      hashtags: initialData?.hashtags || "",
      type: (initialData?.type as FormValues["type"]) || "feed",
      platforms:
        (initialData?.platforms as Platform[] | undefined) || ["instagram"],
      mediaUrl: initialData?.mediaUrl || "",
      scheduledAt: initialData?.scheduledAt
        ? new Date(initialData.scheduledAt).toISOString().slice(0, 16)
        : "",
    },
  });

  const handlePlatformChange = (
    checked: boolean | "indeterminate",
    platform: Platform,
    currentValue: Platform[] = []
  ) => {
    if (checked === true) {
      return currentValue.includes(platform)
        ? currentValue
        : [...currentValue, platform];
    }

    return currentValue.filter((item) => item !== platform);
  };

  const handleMediaFileChange = (
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

    const reader = new FileReader();

    reader.onload = () => {
      const imageDataUrl = String(reader.result || "");
      form.setValue("mediaUrl", imageDataUrl, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast.success("Imagem adicionada ao post.");
    };

    reader.onerror = () => {
      toast.error("Não foi possível carregar a imagem.");
    };

    reader.readAsDataURL(file);
  };

  const buildBasePayload = (values: FormValues) => ({
    title: values.title,
    caption: values.caption || "",
    hashtags: values.hashtags || "",
    type: values.type as PostInputType,
    platforms: values.platforms as PostInputPlatformsItem[],
    mediaUrl: values.mediaUrl || null,
    scheduledAt: values.scheduledAt
      ? new Date(values.scheduledAt).toISOString()
      : null,
  });

  const onSubmit = async (values: FormValues, action: SaveAction) => {
    try {
      const basePayload = buildBasePayload(values);
      const status: PostInputStatus =
        action === "schedule" ? "scheduled" : "draft";

      if (isEditing && initialData) {
        await updatePost.mutateAsync({
          id: initialData.id,
          data: {
            ...basePayload,
            type: basePayload.type as PostUpdateType,
            platforms:
              basePayload.platforms as unknown as PostUpdatePlatformsItem[],
            status: status as PostUpdateStatus,
          },
        });

        if (action === "publish-now") {
          await publishPost.mutateAsync({ id: initialData.id });
          toast.success("Postagem publicada com sucesso!");
        } else if (action === "schedule") {
          toast.success("Postagem agendada com sucesso!");
        } else {
          toast.success("Rascunho atualizado com sucesso!");
        }
      } else {
        const created = await createPost.mutateAsync({
          data: {
            ...basePayload,
            status,
          },
        });

        if (action === "publish-now") {
          await publishPost.mutateAsync({ id: created.id });
          toast.success("Postagem publicada com sucesso!");
        } else if (action === "schedule") {
          toast.success("Postagem agendada com sucesso!");
        } else {
          toast.success("Rascunho salvo com sucesso!");
        }
      }

      queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error("Ocorreu um erro ao salvar a postagem.");
    }
  };

  const isPending =
    createPost.isPending || updatePost.isPending || publishPost.isPending;

  const hasScheduleDate = Boolean(form.watch("scheduledAt"));
  const mediaPreview = form.watch("mediaUrl");

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

                        <label className="flex flex-row items-center space-x-3 space-y-0 p-4 border rounded-md cursor-pointer">
                          <Checkbox
                            checked={field.value?.includes("tiktok")}
                            onCheckedChange={(checked) =>
                              field.onChange(
                                handlePlatformChange(
                                  checked,
                                  "tiktok",
                                  field.value || []
                                )
                              )
                            }
                          />
                          <span className="font-normal flex items-center gap-2">
                            <SiTiktok className="w-4 h-4" />
                            TikTok
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
                            placeholder="Cole uma URL direta de imagem ou escolha uma imagem do computador"
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
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Escolher Imagem
                        </Button>
                      </div>

                      <FormDescription>
                        Você pode colar uma URL direta de imagem ou selecionar
                        uma imagem do seu computador.
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
                        Preencha para agendar. Deixe em branco para salvar como
                        rascunho ou publicar agora.
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
                disabled={isPending}
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
                disabled={isPending}
              >
                Salvar como Rascunho
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={onCancel}
                disabled={isPending}
              >
                Cancelar
              </Button>
            </div>

            <div className="mt-8">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 uppercase tracking-wider">
                Preview Visual
              </h3>

              <div className="border rounded-md overflow-hidden bg-background">
                <div className="p-3 flex items-center gap-2 border-b">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    ME
                  </div>
                  <span className="font-medium text-sm">Minha Empresa</span>
                </div>

                {mediaPreview ? (
                  <div className="aspect-square bg-muted">
                    <img
                      src={mediaPreview}
                      className="w-full h-full object-cover"
                      alt="Preview da mídia"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                        toast.error(
                          "Não foi possível carregar essa imagem. Use uma URL direta ou escolha uma imagem do computador."
                        );
                      }}
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-muted flex flex-col items-center justify-center text-muted-foreground text-xs">
                    <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                    Preview da Mídia
                  </div>
                )}

                <div className="p-3 text-sm">
                  <p className="line-clamp-3 whitespace-pre-wrap">
                    {form.watch("caption") || "Sua legenda aparecerá aqui..."}
                  </p>
                  <p className="text-blue-600 mt-1">
                    {form.watch("hashtags")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
