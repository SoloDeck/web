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
 * Trang giới thiệu công khai — SRS gọi là màn hình "Landing Page", nhóm chức năng
 * "Marketing(Giới thiệu)", với vai trò "điểm vào để đăng nhập hoặc xem danh bạ
 * freelancer".
 *
 * Thứ tự dải nội dung kể đúng câu chuyện trong phiếu đề tài: vấn đề → sáu giai đoạn
 * pipeline → ba giai đoạn AI → mười phân hệ → hai nhóm người dùng → giá.
 *
 * Không có dải kêu gọi riêng ở cuối: nút "Bắt đầu miễn phí" đã có ở navbar, hero,
 * thẻ nhóm người dùng và cả ba thẻ giá — thêm một dải nữa chỉ là nói lại lần thứ năm.
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
