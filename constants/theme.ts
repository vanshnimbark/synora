export const Colors = {
  void: "#08060F",
  obsidian: "#100E1A",
  dusk: "#1A1728",
  ash: "#2D2940",
  mist: "#252238",
  cream: "#F2EEE8",
  fog: "#9B93B8",
  smoke: "#5C5478",
  ember: "#E8572A",
  bloom: "#C23B8A",
  haze: "#8B68D4",
  mutual: "#1FBFA0",
} as const;

export const Gradients = {
  primaryCta: [Colors.ember, Colors.bloom],
  venueMode: [Colors.haze, Colors.mutual],
  matchMoment: [Colors.bloom, Colors.ember],
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  pill: 999,
} as const;

export const Space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
} as const;

export const Font = {
  headings: {
    fontFamily: "serif",
    fontWeight: "300",
  },
  body: {
    fontFamily: undefined,
    fontWeightRegular: "400",
    fontWeightMedium: "500",
    fontWeightSemibold: "600",
  },
} as const;
