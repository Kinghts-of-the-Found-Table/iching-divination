/**
 * Landing 首页
 *
 * 组合四个区域构成完整的首屏体验：
 * Hero → CultureIntro → HexagramWall → CTA
 */

import HeroSection from "@/components/landing/HeroSection";
import CultureIntro from "@/components/landing/CultureIntro";
import HexagramWall from "@/components/landing/HexagramWall";
import CTASection from "@/components/landing/CTASection";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CultureIntro />
      <HexagramWall />
      <CTASection />
    </>
  );
}
