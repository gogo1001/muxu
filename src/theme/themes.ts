// 主题定义
export interface Theme {
  id: string;
  name: string;
  group: "flavor" | "simple";
  // 颜色变量
  bg: string;         // 页面背景
  bgDeep: string;   // 深层背景
  text: string;     // 主文字
  textSoft: string; // 次要文字
  accent: string;   // 强调色（印章/按钮）
  card: string;     // 卡片/气泡背景
  cardBorder: string;
  myBubble: string;   // 我气泡
  herCard: string;   // 他字卡底
  phoneShell: string;
  phoneScreen: string;
  // 渐变/装饰
  bgGradient?: string;
}

// ============ 风味主题 ============
export const FLAVOR_THEMES: Theme[] = [
  {
    id: "seasalt-tea",
    name: "海盐冰茶",
    group: "flavor",
    bg: "#E8F0F2",
    bgDeep: "#D8E6E8",
    text: "#2A3B47",
    textSoft: "#6B7F8B",
    accent: "#3A7CA5",
    card: "#F2F7F8",
    cardBorder: "rgba(58,124,165,0.18)",
    myBubble: "#B8D8E0",
    herCard: "#F2F7F8",
    phoneShell: "#2A3B47",
    phoneScreen: "#E8F0F2",
    bgGradient: "radial-gradient(circle at 30% 20%, rgba(58,124,165,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(107,127,139,0.1) 0%, transparent 50%)",
  },
  {
    id: "orange-soda",
    name: "橘子汽水",
    group: "flavor",
    bg: "#FFF1DC",
    bgDeep: "#FFE3BC",
    text: "#5D2E0E",
    textSoft: "#9A6B4A",
    accent: "#E8751A",
    card: "#FFF8EC",
    cardBorder: "rgba(232,117,26,0.2)",
    myBubble: "#FFC07A",
    herCard: "#FFF8EC",
    phoneShell: "#5D2E0E",
    phoneScreen: "#FFF1DC",
    bgGradient: "radial-gradient(circle at 20% 30%, rgba(232,117,26,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,160,90,0.15) 0%, transparent 50%)",
  },
  {
    id: "strawberry-milk",
    name: "草莓奶霜",
    group: "flavor",
    bg: "#FFECF0",
    bgDeep: "#FFD9E3",
    text: "#5B2C3E",
    textSoft: "#9A6575",
    accent: "#E85C8B",
    card: "#FFF5F7",
    cardBorder: "rgba(232,92,139,0.2)",
    myBubble: "#FFB8CC",
    herCard: "#FFF5F7",
    phoneShell: "#5B2C3E",
    phoneScreen: "#FFECF0",
    bgGradient: "radial-gradient(circle at 30% 20%, rgba(232,92,139,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,180,200,0.2) 0%, transparent 50%)",
  },
  {
    id: "rice-pudding",
    name: "糯米雪糕",
    group: "flavor",
    bg: "#F5F1EA",
    bgDeep: "#E8E2D5",
    text: "#4A4238",
    textSoft: "#8B8070",
    accent: "#C4A77D",
    card: "#FBF8F2",
    cardBorder: "rgba(196,167,125,0.25)",
    myBubble: "#E8DCC4",
    herCard: "#FBF8F2",
    phoneShell: "#4A4238",
    phoneScreen: "#F5F1EA",
    bgGradient: "radial-gradient(circle at 25% 30%, rgba(196,167,125,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 70%, rgba(210,190,160,0.12) 0%, transparent 50%)",
  },
  {
    id: "taro-bobo",
    name: "芋泥波波",
    group: "flavor",
    bg: "#F0EAF5",
    bgDeep: "#E1D4EC",
    text: "#3F2B52",
    textSoft: "#7A6590",
    accent: "#8B6DB8",
    card: "#F7F2FB",
    cardBorder: "rgba(139,109,184,0.25)",
    myBubble: "#C9B5E0",
    herCard: "#F7F2FB",
    phoneShell: "#3F2B52",
    phoneScreen: "#F0EAF5",
    bgGradient: "radial-gradient(circle at 30% 20%, rgba(139,109,184,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(180,150,210,0.18) 0%, transparent 50%)",
  },
  {
    id: "lime-soda",
    name: "鲜柠汽水",
    group: "flavor",
    bg: "#EFF8E8",
    bgDeep: "#DBEEC9",
    text: "#2D4A24",
    textSoft: "#6A8560",
    accent: "#7CB342",
    card: "#F4FBED",
    cardBorder: "rgba(124,179,66,0.2)",
    myBubble: "#C8E0A8",
    herCard: "#F4FBED",
    phoneShell: "#2D4A24",
    phoneScreen: "#EFF8E8",
    bgGradient: "radial-gradient(circle at 25% 30%, rgba(124,179,66,0.12) 0%, transparent 50%), radial-gradient(circle at 75% 70%, rgba(170,200,130,0.15) 0%, transparent 50%)",
  },
];

// ============ 简约单色主题（低饱和）============
const SIMPLE_COLORS = [
  { id: "simple-red", name: "简约·红", color: "#B85450" },
  { id: "simple-orange", name: "简约·橙", color: "#C97B3A" },
  { id: "simple-yellow", name: "简约·黄", color: "#C9A93A" },
  { id: "simple-green", name: "简约·绿", color: "#5F9B5F" },
  { id: "simple-cyan", name: "简约·青", color: "#4A9A9A" },
  { id: "simple-blue", name: "简约·蓝", color: "#5A7BB0" },
  { id: "simple-purple", name: "简约·紫", color: "#8B6DB8" },
];

function makeSimpleTheme(id: string, name: string, accent: string): Theme {
  const dark = adjustBrightness(accent, -0.5);
  const soft = adjustBrightness(accent, 0.1);
  return {
    id,
    name,
    group: "simple",
    bg: "#FAFAF7",
    bgDeep: "#EFEFEA",
    text: "#2A2A28",
    textSoft: "#7A7A75",
    accent,
    card: "#FFFFFF",
    cardBorder: `${accent}22`,
    myBubble: adjustBrightness(accent, 0.55),
    herCard: "#FFFFFF",
    phoneShell: dark,
    phoneScreen: "#FAFAF7",
    bgGradient: `radial-gradient(circle at 30% 20%, ${accent}15 0%, transparent 55%)`,
  };
}

function adjustBrightness(hex: string, factor: number): string {
  // factor: -1 到 1，负值变暗，正值变亮
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const adj = (c: number) =>
    Math.max(0, Math.min(255, Math.round(factor >= 0 ? c + (255 - c) * factor : c * (1 + factor))));
  const toHex = (c: number) => c.toString(16).padStart(2, "0");
  return `#${toHex(adj(r))}${toHex(adj(g))}${toHex(adj(b))}`;
}

export const SIMPLE_THEMES: Theme[] = SIMPLE_COLORS.map((c) =>
  makeSimpleTheme(c.id, c.name, c.color),
);

export const ALL_THEMES: Theme[] = [...FLAVOR_THEMES, ...SIMPLE_THEMES];

export function getTheme(id: string): Theme {
  return ALL_THEMES.find((t) => t.id === id) ?? FLAVOR_THEMES[3];
}
