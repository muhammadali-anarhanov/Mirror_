"use client"

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis,
} from "recharts"
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  PLATFORM_ACTIVITY, PRODUCT_ACTIVITY, SUBSCRIPTION_DISTRIBUTION,
} from "@/lib/admin/demo-data"

type ChartKind = "platform" | "store" | "subscriptions" | "growth" | "categories"

const platformConfig = {
  sessions: { label: "Try-on sessions", color: "var(--chart-1)" },
} satisfies ChartConfig

const storeConfig = {
  sessions: { label: "Try-on sessions", color: "var(--chart-1)" },
  carts: { label: "Cart additions", color: "var(--chart-2)" },
} satisfies ChartConfig

const growthConfig = {
  brands: { label: "New brands", color: "var(--chart-1)" },
  stores: { label: "New stores", color: "var(--chart-2)" },
} satisfies ChartConfig

const subscriptionConfig = {
  count: { label: "Subscriptions", color: "var(--chart-3)" },
} satisfies ChartConfig

const categoryConfig = {
  sessions: { label: "Try-on sessions", color: "var(--chart-1)" },
} satisfies ChartConfig

const categoryActivity = [
  { category: "Dresses", sessions: 1420 },
  { category: "Tops", sessions: 1284 },
  { category: "Footwear", sessions: 930 },
  { category: "Accessories", sessions: 824 },
]

export function AdminChart({ kind }: { kind: ChartKind }) {
  if (kind === "platform") {
    return (
      <Card className="mirror-admin-chart-card">
        <CardHeader>
          <CardTitle>Virtual try-on activity</CardTitle>
          <CardDescription>Session volume over the last six months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={platformConfig} className="mirror-admin-chart h-[250px] w-full aspect-auto">
            <AreaChart accessibilityLayer data={PLATFORM_ACTIVITY} margin={{ left: 8, right: 8, top: 8 }}>
              <defs><linearGradient id="adminSessionsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--color-sessions)" stopOpacity={0.22} /><stop offset="95%" stopColor="var(--color-sessions)" stopOpacity={0.01} /></linearGradient></defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area type="monotone" dataKey="sessions" isAnimationActive={false} stroke="var(--color-sessions)" fill="url(#adminSessionsFill)" strokeWidth={2.5} />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    )
  }

  if (kind === "growth") {
    return (
      <Card className="mirror-admin-chart-card">
        <CardHeader>
          <CardTitle>Platform growth</CardTitle>
          <CardDescription>New brand and store registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={growthConfig} className="mirror-admin-chart h-[250px] w-full aspect-auto">
            <BarChart accessibilityLayer data={PLATFORM_ACTIVITY} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="brands" isAnimationActive={false} fill="var(--color-brands)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="stores" isAnimationActive={false} fill="var(--color-stores)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    )
  }

  if (kind === "categories") {
    return (
      <Card className="mirror-admin-chart-card">
        <CardHeader><CardTitle>Most popular categories</CardTitle><CardDescription>Sample virtual try-on sessions by category</CardDescription></CardHeader>
        <CardContent>
          <ChartContainer config={categoryConfig} className="mirror-admin-chart h-[250px] w-full aspect-auto">
            <BarChart accessibilityLayer data={categoryActivity} layout="vertical" margin={{ left: 12, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis dataKey="category" type="category" width={88} axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="sessions" isAnimationActive={false} fill="var(--color-sessions)" radius={[0, 5, 5, 0]} barSize={18} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    )
  }

  if (kind === "subscriptions") {
    return (
      <Card className="mirror-admin-chart-card">
        <CardHeader>
          <CardTitle>Subscription distribution</CardTitle>
          <CardDescription>Illustrative status breakdown, not billing data</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={subscriptionConfig} className="mirror-admin-chart h-[250px] w-full aspect-auto">
            <BarChart accessibilityLayer data={SUBSCRIPTION_DISTRIBUTION} layout="vertical" margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" hide />
              <YAxis dataKey="status" type="category" width={76} axisLine={false} tickLine={false} tick={{ fill: "#6b7280", fontSize: 10 }} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Bar dataKey="count" isAnimationActive={false} fill="var(--color-count)" radius={[0, 5, 5, 0]} barSize={18} />
            </BarChart>
          </ChartContainer>
          <div className="mirror-admin-chart-legend">
            {SUBSCRIPTION_DISTRIBUTION.map((item, index) => <span key={item.status}><i className={`is-color-${index + 1}`} />{item.status}<strong>{item.count}</strong></span>)}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mirror-admin-chart-card">
      <CardHeader>
        <CardTitle>Weekly store activity</CardTitle>
        <CardDescription>Try-on sessions and cart additions</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={storeConfig} className="mirror-admin-chart h-[250px] w-full aspect-auto">
          <AreaChart accessibilityLayer data={PRODUCT_ACTIVITY} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="sessions" isAnimationActive={false} stroke="var(--color-sessions)" fill="var(--color-sessions)" fillOpacity={0.12} strokeWidth={2.5} />
            <Area type="monotone" dataKey="carts" isAnimationActive={false} stroke="var(--color-carts)" fill="var(--color-carts)" fillOpacity={0.08} strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
