import { AiStagesSection } from "@/features/marketing/components/AiStagesSection";
import { AudienceSection } from "@/features/marketing/components/AudienceSection";
import { FactsBand } from "@/features/marketing/components/FactsBand";
import { FeatureGridSection } from "@/features/marketing/components/FeatureGridSection";
import { HeroSection } from "@/features/marketing/components/HeroSection";
import { LandingFooter, LandingNavbar } from "@/features/marketing/components/LandingChrome";
import { PainPointsSection } from "@/features/marketing/components/PainPointsSection";
import { PipelineStagesSection } from "@/features/marketing/components/PipelineStagesSection";
import { PricingSection } from "@/features/marketing/components/PricingSection";

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
