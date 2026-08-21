import { Helmet } from "react-helmet-async";

import { AiStagesSection } from "@/features/marketing/components/AiStagesSection";
import { AudienceSection } from "@/features/marketing/components/AudienceSection";
import { FactsBand } from "@/features/marketing/components/FactsBand";
import { FeatureGridSection } from "@/features/marketing/components/FeatureGridSection";
import { HeroSection } from "@/features/marketing/components/HeroSection";
import { LandingFooter, LandingNavbar } from "@/features/marketing/components/LandingChrome";
import { PainPointsSection } from "@/features/marketing/components/PainPointsSection";
import { PipelineStagesSection } from "@/features/marketing/components/PipelineStagesSection";
import { PricingSection } from "@/features/marketing/components/PricingSection";
import { OFFICIAL_TITLE_VI, SEO_HOME } from "@/features/marketing/content";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl } from "@/seo/config";

const HOME_URL = absoluteUrl("/home");

/**
 * JSON-LD: dựng ở cấp module và chuỗi hoá MỘT lần.
 *
 * `<script type="application/ld+json">` chỉ nhận đúng một node chữ làm con, nên phải tự
 * `JSON.stringify` chứ không xuống dòng JSX được.  #Huynh
 */
const HOME_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  alternateName: OFFICIAL_TITLE_VI,
  url: HOME_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  inLanguage: "vi-VN",
  description: SEO_HOME.description,
  image: DEFAULT_OG_IMAGE,
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.svg`,
  },
});

/**
 * Trang giới thiệu công khai — điểm vào DUY NHẤT là đăng nhập cho freelancer.
 *
 * Bản trước mô tả trang này là "điểm vào để đăng nhập hoặc xem danh bạ freelancer" và
 * dựng hẳn hai lối vào tương ứng. Đó là hình dạng của một cái sàn: khách vào duyệt, chọn
 * người, gửi yêu cầu. SoloDesk là CRM độc lập cho từng freelancer — khách hàng không có
 * tài khoản và chỉ tới được qua link riêng do chính freelancer gửi.
 *
 * Thứ tự dải nội dung kể đúng câu chuyện trong phiếu đề tài: vấn đề → sáu giai đoạn
 * pipeline → ba giai đoạn AI → mười phân hệ → cách khách gửi yêu cầu → giá.
 *
 * Không có dải kêu gọi riêng ở cuối, và hero cũng không có nút: "Bắt đầu miễn phí" đã
 * nằm ở navbar dính trên đầu trang, cộng ba thẻ giá — thêm nữa chỉ là nói lại.
 *
 * `overflow-x-hidden` để ở <body> (index.css) chứ KHÔNG để ở div này: `overflow-x`
 * khác `visible` sẽ biến div thành khối cuộn, khiến navbar `sticky` neo vào nó thay
 * vì neo vào khung nhìn — trang mới dài hơn bản cũ nhiều nên lỗi đó sẽ lộ ra.  #Huynh
 */
export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{SEO_HOME.title}</title>
        <meta name="description" content={SEO_HOME.description} />
        <link rel="canonical" href={HOME_URL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:locale" content="vi_VN" />
        <meta property="og:url" content={HOME_URL} />
        <meta property="og:title" content={SEO_HOME.title} />
        <meta property="og:description" content={SEO_HOME.description} />
        <meta property="og:image" content={DEFAULT_OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO_HOME.title} />
        <meta name="twitter:description" content={SEO_HOME.description} />
        <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
        <script type="application/ld+json">{HOME_JSON_LD}</script>
      </Helmet>

      <LandingNavbar />
      <HeroSection />
      <FactsBand />
      <PainPointsSection />
      <PipelineStagesSection />
      <AiStagesSection />
      <FeatureGridSection />
      <AudienceSection />
      <PricingSection />
      <LandingFooter />
    </div>
  );
}
