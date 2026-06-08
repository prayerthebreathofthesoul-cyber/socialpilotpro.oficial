import { Layout } from "@/components/layout/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useGetAnalyticsOverview } from "@/lib/mock-api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Heart, Share2, TrendingUp, Users, Clock } from "lucide-react";

type WeeklyEngagementItem = {
  day: string;
  engagement: number;
  reach: number;
};

type PlatformBreakdownItem = {
  platform: string;
  posts: number;
  engagement: number;
};

type BestPostingHourItem = {
  hour: number;
  engagementScore: number;
};

export default function Analytics() {
  const { data: analytics, isLoading } = useGetAnalyticsOverview();

  const totalPosts = analytics?.totalPosts ?? 0;
  const totalEngagement = analytics?.totalEngagement ?? 0;
  const totalReach = analytics?.totalReach ?? 0;
  const avgEngagementRate = analytics?.avgEngagementRate ?? 0;

  const weeklyEngagement: WeeklyEngagementItem[] =
    analytics?.weeklyEngagement ?? [];

  const platformBreakdown: PlatformBreakdownItem[] =
    analytics?.platformBreakdown ?? [];

  const bestPostingHours: BestPostingHourItem[] =
    analytics?.bestPostingHours ?? [];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Acompanhe o desempenho e engajamento das suas redes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-blue-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                Total de Posts
              </CardTitle>
              <div className="rounded-full bg-blue-100 p-2">
                <Share2 className="h-4 w-4 text-blue-700" />
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold">
                  {totalPosts.toLocaleString("pt-BR")}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-pink-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                Engajamento Total
              </CardTitle>
              <div className="rounded-full bg-pink-100 p-2">
                <Heart className="h-4 w-4 text-pink-600" />
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold">
                  {totalEngagement.toLocaleString("pt-BR")}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-indigo-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                Alcance Total
              </CardTitle>
              <div className="rounded-full bg-indigo-100 p-2">
                <Users className="h-4 w-4 text-indigo-700" />
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold">
                  {totalReach.toLocaleString("pt-BR")}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-emerald-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold">
                Taxa Média
              </CardTitle>
              <div className="rounded-full bg-emerald-100 p-2">
                <TrendingUp className="h-4 w-4 text-emerald-700" />
              </div>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold">
                  {avgEngagementRate.toFixed(1)}%
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="col-span-1 shadow-sm">
            <CardHeader>
              <CardTitle>Engajamento Semanal</CardTitle>
              <CardDescription>
                Evolução de interações nos últimos 7 dias
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : weeklyEngagement.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed text-center text-sm text-muted-foreground">
                  Ainda não há dados suficientes para mostrar o engajamento semanal.
                </div>
              ) : (
                <div className="mt-4 h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={weeklyEngagement}
                      margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e5e7eb"
                      />

                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        dy={10}
                      />

                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                      />

                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />

                      <Line
                        type="monotone"
                        dataKey="engagement"
                        stroke="#f97316"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#f97316" }}
                        activeDot={{ r: 6 }}
                        name="Engajamento"
                      />

                      <Line
                        type="monotone"
                        dataKey="reach"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#3b82f6" }}
                        activeDot={{ r: 6 }}
                        name="Alcance"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-1 shadow-sm">
            <CardHeader>
              <CardTitle>Desempenho por Plataforma</CardTitle>
              <CardDescription>
                Volume de posts e engajamento por rede
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : platformBreakdown.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed text-center text-sm text-muted-foreground">
                  Ainda não há dados suficientes para mostrar o desempenho por plataforma.
                </div>
              ) : (
                <div className="mt-4 h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={platformBreakdown}
                      margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e5e7eb"
                      />

                      <XAxis
                        dataKey="platform"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                        dy={10}
                      />

                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                      />

                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                      />

                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      />

                      <Bar
                        yAxisId="left"
                        dataKey="posts"
                        fill="#1e3a8a"
                        radius={[4, 4, 0, 0]}
                        name="Qtd. Posts"
                        maxBarSize={40}
                      />

                      <Bar
                        yAxisId="right"
                        dataKey="engagement"
                        fill="#f43f5e"
                        radius={[4, 4, 0, 0]}
                        name="Engajamento"
                        maxBarSize={40}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Melhores Horários para Postar</CardTitle>
            <CardDescription>
              Baseado no engajamento histórico do seu público.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : bestPostingHours.length === 0 ? (
              <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed text-center text-sm text-muted-foreground">
                Ainda não há dados suficientes para sugerir melhores horários.
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-4">
                {bestPostingHours.map((item) => (
                  <div
                    key={item.hour}
                    className="flex min-w-[120px] flex-1 flex-col items-center justify-center rounded-xl border bg-gradient-to-b from-card to-muted/30 p-4"
                  >
                    <div className="mb-2 rounded-full bg-orange-100 p-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                    </div>

                    <span className="text-2xl font-bold text-primary">
                      {String(item.hour).padStart(2, "0")}:00
                    </span>

                    <div className="mt-2 flex items-center gap-1 text-sm font-medium text-orange-600">
                      <TrendingUp className="h-3 w-3" />
                      Score: {item.engagementScore}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
