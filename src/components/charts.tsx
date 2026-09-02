import React, { useState } from 'react';
import { View, Text, LayoutChangeEvent } from 'react-native';
import Svg, {
  Circle, Path, Line, G, Text as SvgText, Defs, LinearGradient, Stop,
} from 'react-native-svg';
import { colors, font, spacing } from '@/theme';

// ─────────────────────────────────────────────────────────────────────────
// Shared, lightweight chart primitives for the app.
//
// Deliberately built on raw react-native-svg rather than a charting library:
// these are simple enough (a ring, a line, a bar) that a dependency buys
// nothing but bundle size and an API to learn, and every shape here is
// themed straight from the app's own design tokens rather than a library's
// default palette.
// ─────────────────────────────────────────────────────────────────────────

// ── Donut ────────────────────────────────────────────────────────────────
export type DonutSlice = { label: string; value: number; color: string };

export function Donut({
  data, size = 132, thickness = 22, centerLabel, centerSub, legend = true,
}: {
  data: DonutSlice[]; size?: number; thickness?: number;
  centerLabel?: string; centerSub?: string; legend?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;

  // A report with genuinely zero of everything (a brand-new class, nothing
  // marked yet) would divide by zero building the dasharray — fall back to
  // a flat neutral ring so the chart still renders something legible
  // instead of a NaN-shaped one.
  let cursor = 0;
  const segments = total > 0
    ? data.filter(d => d.value > 0).map(d => {
        const len = (d.value / total) * c;
        const seg = { ...d, len, offset: -cursor };
        cursor += len;
        return seg;
      })
    : [];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
      <Svg width={size} height={size}>
        <G transform={`rotate(-90 ${center} ${center})`}>
          {total <= 0 ? (
            <Circle cx={center} cy={center} r={r} stroke={colors.surfaceAlt} strokeWidth={thickness} fill="none" />
          ) : segments.map((s, i) => (
            <Circle key={i} cx={center} cy={center} r={r} stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${s.len} ${c - s.len}`} strokeDashoffset={s.offset}
              strokeLinecap={segments.length > 1 ? 'butt' : 'round'} fill="none" />
          ))}
        </G>
        {centerLabel ? (
          <>
            <SvgText x={center} y={centerSub ? center - 2 : center + 7} fontSize={centerSub ? 20 : 22}
              fontWeight="700" fill={colors.ink} textAnchor="middle">{centerLabel}</SvgText>
            {centerSub ? (
              <SvgText x={center} y={center + 17} fontSize={11} fill={colors.muted} textAnchor="middle">{centerSub}</SvgText>
            ) : null}
          </>
        ) : null}
      </Svg>
      {legend && (
        <View style={{ gap: 9, flex: 1 }}>
          {data.map((d, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: d.color }} />
              <Text style={{ ...font.label, color: colors.slate, flex: 1 }} numberOfLines={1}>{d.label}</Text>
              <Text style={{ ...font.label, color: colors.ink, fontWeight: '700' }}>{d.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Progress ring — a single value against its own track, for a hero
//    percentage (today's attendance, fee collection rate) ──────────────────
export function ProgressRing({
  value, size = 96, thickness = 10, color, label,
}: { value: number; size?: number; thickness?: number; color: string; label?: string }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const filled = (pct / 100) * c;
  const center = size / 2;
  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={r} stroke={colors.surfaceAlt} strokeWidth={thickness} fill="none" />
        <G transform={`rotate(-90 ${center} ${center})`}>
          <Circle cx={center} cy={center} r={r} stroke={color} strokeWidth={thickness}
            strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round" fill="none" />
        </G>
        <SvgText x={center} y={center + size * 0.07} fontSize={size * 0.19} fontWeight="700"
          fill={colors.ink} textAnchor="middle">{Math.round(pct)}%</SvgText>
      </Svg>
      {label ? <Text style={{ ...font.label, color: colors.muted, marginTop: 6, textTransform: 'none', letterSpacing: 0 }}>{label}</Text> : null}
    </View>
  );
}

// ── Trend chart — smooth-ish area/line for a continuous series (a daily
//    or monthly run of values), with the min and max called out ───────────
export function TrendChart({
  data, height = 150, color = colors.primary, unit = '%', showGrid = true,
}: {
  data: { label: string; value: number }[]; height?: number; color?: string;
  unit?: string; showGrid?: boolean;
}) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  if (!data || data.length === 0) return <View style={{ height }} onLayout={onLayout} />;

  const values = data.map(d => d.value);
  const min = Math.min(...values), max = Math.max(...values);
  // Headroom so the line doesn't touch the top/bottom edge. A flat run of
  // identical values (a perfect week) would otherwise make range === 0.
  const pad = (max - min) * 0.2 || Math.max(Math.abs(max) * 0.1, 1);
  const lo = Math.max(0, min - pad), hi = max + pad;
  const range = hi - lo || 1;

  const PAD_X = 6;
  const topPad = 18, bottomPad = 20;
  const plotW = Math.max(w - PAD_X * 2, 1);
  const plotH = Math.max(height - topPad - bottomPad, 1);

  const pts = data.map((d, i) => ({
    x: PAD_X + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW),
    y: topPad + plotH - ((d.value - lo) / range) * plotH,
    v: d.value,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const baseY = (topPad + plotH).toFixed(1);
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${baseY} L${pts[0].x.toFixed(1)},${baseY} Z`;

  let maxI = 0, minI = 0;
  pts.forEach((p, i) => { if (p.v > pts[maxI].v) maxI = i; if (p.v < pts[minI].v) minI = i; });
  const gradId = `trendFade${Math.round(color.charCodeAt(1) || 0)}`; // cheap per-instance id, avoids id clashes if two charts render at once

  return (
    <View style={{ height }} onLayout={onLayout}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {showGrid && [0.25, 0.5, 0.75].map(f => (
            <Line key={f} x1={PAD_X} x2={w - PAD_X} y1={topPad + plotH * f} y2={topPad + plotH * f}
              stroke={colors.line} strokeWidth={1} />
          ))}
          <Path d={areaPath} fill={`url(#${gradId})`} />
          <Path d={linePath} stroke={color} strokeWidth={2.25} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => {
            const isFirst = i === 0, isLast = i === pts.length - 1;
            const isExtreme = i === maxI || i === minI;
            if (!isExtreme && !isFirst && !isLast) return null;
            const tint = i === maxI ? colors.emerald : i === minI ? colors.danger : color;
            return (
              <G key={i}>
                <Circle cx={p.x} cy={p.y} r={3} fill={tint} stroke={colors.surface} strokeWidth={1.5} />
                {isExtreme && (
                  <SvgText x={Math.min(Math.max(p.x, 18), w - 18)} y={Math.max(p.y - 9, 12)}
                    fontSize={10} fontWeight="700" fill={tint} textAnchor="middle">
                    {Math.round(p.v)}{unit}
                  </SvgText>
                )}
              </G>
            );
          })}
          <SvgText x={PAD_X} y={height - 5} fontSize={10} fill={colors.muted}>{data[0].label}</SvgText>
          <SvgText x={w - PAD_X} y={height - 5} fontSize={10} fill={colors.muted} textAnchor="end">
            {data[data.length - 1].label}
          </SvgText>
        </Svg>
      )}
    </View>
  );
}

// ── Sparkline — tiny inline trend, no axes/labels, for a stat card ─────────
export function Sparkline({ data, width = 64, height = 26, color = colors.primary }: {
  data: number[]; width?: number; height?: number; color?: string;
}) {
  if (!data || data.length < 2) return <View style={{ width, height }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - ((v - min) / range) * (height - 4) - 2]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={1.75} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last[0]} cy={last[1]} r={2.25} fill={color} />
    </Svg>
  );
}

// ── Horizontal bar chart — magnitude comparison across a handful of
//    categories (collection by method, period breakdown) ──────────────────
export function BarChart({
  data, color = colors.primary, formatValue,
}: { data: { label: string; value: number }[]; color?: string; formatValue?: (v: number) => string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={{ gap: 12 }}>
      {data.map((d, i) => (
        <View key={i} style={{ gap: 5 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ ...font.label, color: colors.slate }} numberOfLines={1}>{d.label}</Text>
            <Text style={{ ...font.label, color: colors.ink, fontWeight: '700' }}>
              {formatValue ? formatValue(d.value) : d.value}
            </Text>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
            <View style={{ height: 8, borderRadius: 4, width: `${Math.max(2, (d.value / max) * 100)}%`, backgroundColor: color }} />
          </View>
        </View>
      ))}
    </View>
  );
}
