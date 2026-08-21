import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getPublicProfile } from "@/services/intakeService";
import { PublicSharePageView } from "@/features/intake/components/PublicSharePageView";
import { ProfileSeoHead } from "@/seo/ProfileSeoHead";

/**
 * Trang công khai của freelancer — thứ DUY NHẤT khách hàng nhìn thấy.
 *
 * Một trang, hai phần: hồ sơ ở trên (bìa, avatar, giới thiệu, kỹ năng) rồi biểu mẫu tiếp
 * nhận ngay dưới. Trước đây là hai trang tách rời, khách phải bấm thêm một lần mới điền
 * được — mỗi lần bấm là một chỗ để rơi rụng.
 *
 * Ba đường đều dẫn tới đây: `/{slug}`, `/ho-so/{token}`, `/bieu-mau/{token}` và
 * `/intake/{token}`. Backend tra một truy vấn cho cả slug lẫn token nên component không cần
 * biết mình đang nhận cái nào.
 *
 * Component này CHỈ lo nạp dữ liệu; phần trình bày nằm ở `PublicSharePageView` để màn cấu
 * hình dùng lại được y nguyên làm khung xem trước.
 *
 * Query hồ sơ đặt Ở ĐÂY chứ không nhét vào `IntakeForm`: giữ `IntakeForm` chỉ phụ thuộc
 * đúng ba hàm service như cũ, nhờ vậy bộ test 285 dòng của nó không phải sửa dòng nào.  #Huynh
 */
export function PublicSharePage({
  shareToken,
  seoSlug,
}: {
  shareToken: string;
  /**
   * Chỉ `/{slug}` truyền vào. Có giá trị = trang được phép lên chỉ mục, nên dựng đủ bộ thẻ
   * canonical/OG theo hồ sơ; ba đường link token thì bỏ trống và tự gắn `noindex` ở route.
   */
  seoSlug?: string;
}) {
  const {
    data: profile,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["public-profile", shareToken],
    queryFn: () => getPublicProfile(shareToken),
    staleTime: 30_000,
    retry: false,
  });

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  // Backend dùng CHUNG một câu 404 cho token sai lẫn không tồn tại — phân biệt hai trường
  // hợp là biến trang này thành máy dò xem đường dẫn nào có thật. Nhánh này cố ý trả về
  // sớm, không dựng header/footer: không có link nào để đi lang thang tìm người khác.
  if (isError || !profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">Không tìm thấy hồ sơ này</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Đường dẫn có thể không đúng hoặc đã hết hiệu lực. Bạn hãy hỏi lại người đã gửi
            link cho bạn nhé.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {seoSlug ? <ProfileSeoHead profile={profile} slug={seoSlug} /> : null}
      <PublicSharePageView profile={profile} shareToken={shareToken} />
    </>
  );
}
