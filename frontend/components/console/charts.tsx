"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useText } from "@/components/marketing-language"
import { useLocale } from "./ui"

export type Line = { key: string; label: string; color: string }

export function TrendChart({ data, lines }: { data: Record<string, number | string>[]; lines: Line[] }) {
  const t = useText()
  const locale = useLocale()
  const day = (value: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${value}T00:00:00`))
  return (
    <>
      <div className="cx-legend">{lines.map((line) => <span key={line.key}><i style={{ background: line.color }} />{t(line.label)}</span>)}</div>
      <div className="cx-chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 16, right: 8, left: -18, bottom: 0 }}>
            <defs>
              {lines.map((line) => (
                <linearGradient key={line.key} id={`cx-fill-${line.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={line.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={line.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid stroke="#e2e8f5" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="date" tickFormatter={day} tick={{ fill: "#8a98b4", fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis allowDecimals={false} tick={{ fill: "#8a98b4", fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              labelFormatter={(value) => day(String(value))}
              formatter={(value, name) => [new Intl.NumberFormat(locale).format(Number(value)), t(lines.find((l) => l.key === name)?.label ?? String(name))]}
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f5", boxShadow: "0 12px 30px rgba(16,36,94,.12)" }}
            />
            {lines.map((line) => <Area key={line.key} type="monotone" dataKey={line.key} stroke={line.color} strokeWidth={2.5} fill={`url(#cx-fill-${line.key})`} animationDuration={900} />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

export function RankList({ rows, empty }: { rows: { id: string; name: string; value: number; suffix?: string }[]; empty: string }) {
  const t = useText()
  const locale = useLocale()
  if (!rows.length) return <p className="cx-muted">{t(empty)}</p>
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="cx-rank">
      {rows.map((row, i) => (
        <div key={row.id} className="cx-rank-row">
          <span className="cx-rank-index">{i + 1}</span>
          <span className="cx-rank-name" title={row.name}>{row.name}</span>
          <span className="cx-strong">{new Intl.NumberFormat(locale).format(row.value)}{row.suffix ? ` ${t(row.suffix)}` : ""}</span>
          <span className="cx-bar"><i style={{ width: `${(row.value / max) * 100}%`, animationDelay: `${i * 80}ms` }} /></span>
        </div>
      ))}
    </div>
  )
}
