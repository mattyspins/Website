import { Bebas_Neue, Manrope } from "next/font/google";

// Loaded once here and imported wherever the tournament theme is applied
// (public pages, admin tournament pages, the draw-animation page, the OBS
// widget) so next/font only registers each font a single time.
export const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-tournament-display",
  display: "swap",
});

export const manrope = Manrope({
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  variable: "--font-tournament-body",
  display: "swap",
});
