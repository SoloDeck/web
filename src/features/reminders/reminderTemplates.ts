import type { ReminderType } from "@/services/remindersService";
import type { FollowUpTone } from "@/services/followupsService";

/**
 * Mẫu tin nhắc soạn sẵn — thứ freelancer mở lên rồi sửa theo ý (Phiếu SU26SE083, dòng 105:
 * "Tạo bản nháp tin nhắn phù hợp ngữ cảnh", "chọn được giọng trang trọng hoặc thân mật").
 *
 * Vì sao có mẫu tay bên cạnh nút AI: AI tốn một lượt hạn mức và mất vài giây, trong khi
 * phần lớn tin nhắc chỉ là vài câu quen thuộc. Có mẫu thì freelancer sửa hai chữ là gửi
 * được, để dành AI cho tình huống cần viết khéo.
 *
 * Vì sao mẫu cũng có HAI GIỌNG: bấm nút đổi giọng mà chữ trong ô không nhúc nhích thì
 * người dùng tưởng nút hỏng — đã bị báo đúng lỗi đó. Giọng phải đổi được ngay, không bắt
 * chờ gọi AI mới thấy khác biệt.
 *
 * Cố ý KHÔNG nhắc số tài khoản trong mẫu: khối thanh toán do server chèn tự động vào thư
 * nhắc tiền (kèm mã QR), viết tay vào đây là hai nguồn dễ lệch nhau.  #Huynh
 */
export function reminderTemplate(
  type: ReminderType,
  vars: { client: string; project: string },
  tone: FollowUpTone = "formal",
): string {
  const { client, project } = vars;
  const formal: Partial<Record<ReminderType, string>> = {
    proposal_follow_up: `Kính gửi ${client},\n\nChúng tôi đã gửi báo giá cho "${project}" và muốn hỏi thăm xem Anh/Chị đã có dịp xem qua chưa ạ.\n\nNếu cần điều chỉnh phạm vi công việc hoặc ngân sách cho phù hợp hơn, xin Anh/Chị cho chúng tôi biết.\n\nTrân trọng cảm ơn.`,
    contract_signing_nudge: `Kính gửi ${client},\n\nHợp đồng cho "${project}" đã được chuẩn bị xong và đang chờ chữ ký của Anh/Chị để chúng tôi bắt đầu triển khai.\n\nNếu có điều khoản nào cần trao đổi thêm, xin Anh/Chị phản hồi giúp.\n\nTrân trọng cảm ơn.`,
    payment_due: `Kính gửi ${client},\n\nChúng tôi xin trân trọng nhắc Anh/Chị về khoản thanh toán của "${project}" sắp đến hạn.\n\nThông tin chuyển khoản được đính kèm bên dưới. Xin cảm ơn Anh/Chị đã hợp tác.`,
    payment_overdue: `Kính gửi ${client},\n\nQua đối soát, chúng tôi ghi nhận khoản thanh toán của "${project}" đã quá hạn. Có thể do sơ suất trong quá trình xử lý.\n\nKính mong Anh/Chị hỗ trợ hoàn tất trong thời gian sớm nhất. Thông tin chuyển khoản được đính kèm bên dưới.\n\nTrân trọng cảm ơn.`,
    re_engagement: `Kính gửi ${client},\n\nĐã một thời gian kể từ lần hợp tác gần nhất, chúng tôi xin phép hỏi thăm tình hình công việc của Anh/Chị.\n\nNếu có dự án nào cần hỗ trợ, xin Anh/Chị liên hệ với chúng tôi.\n\nTrân trọng.`,
    custom: `Kính gửi ${client},\n\n`,
    follow_up: `Kính gửi ${client},\n\nChúng tôi xin phép hỏi thăm tiến độ của "${project}" và muốn biết Anh/Chị có cần hỗ trợ thêm điều gì không ạ.\n\nTrân trọng cảm ơn.`,
  };

  const friendly: Partial<Record<ReminderType, string>> = {
    proposal_follow_up: `Chào ${client},\n\nMình gửi lại báo giá cho "${project}" tuần trước. Anh/chị đã có dịp xem qua chưa ạ?\n\nNếu cần mình điều chỉnh phạm vi hay ngân sách cho phù hợp hơn, anh/chị cứ nhắn nhé.`,
    contract_signing_nudge: `Chào ${client},\n\nHợp đồng cho "${project}" đã sẵn sàng, chỉ còn chờ anh/chị ký là mình bắt tay vào làm ngay.\n\nAnh/chị xem giúp mình nhé, có chỗ nào cần sửa cứ báo.`,
    payment_due: `Chào ${client},\n\nMình xin nhắc nhẹ khoản thanh toán của "${project}" sắp tới hạn.\n\nAnh/chị xem giúp mình nhé. Thông tin chuyển khoản mình để bên dưới ạ.`,
    payment_overdue: `Chào ${client},\n\nMình kiểm tra thì khoản thanh toán của "${project}" đã quá hạn. Có thể do sơ suất trong lúc bận rộn.\n\nAnh/chị hỗ trợ mình xử lý sớm nhé. Thông tin chuyển khoản mình để bên dưới ạ.`,
    re_engagement: `Chào ${client},\n\nLâu rồi mình chưa có dịp làm việc cùng anh/chị. Dạo này công việc bên anh/chị thế nào ạ?\n\nNếu có dự án nào cần hỗ trợ, anh/chị cứ nhắn mình nhé.`,
    custom: `Chào ${client},\n\n`,
    follow_up: `Chào ${client},\n\nMình muốn hỏi thăm tiến độ của "${project}". Anh/chị có cần mình hỗ trợ thêm gì không ạ?`,
  };

  const table = tone === "friendly" ? friendly : formal;
  return table[type] ?? table.follow_up ?? "";
}

/**
 * Ô nội dung có phải mẫu chưa ai đụng tới không.
 *
 * Dùng để quyết định: đổi giọng thì có được phép thay chữ trong ô hay không. Người dùng đã
 * gõ tay rồi mà bấm đổi giọng lại xoá sạch công của họ thì tệ hơn hẳn việc nút "không làm
 * gì".  #Huynh
 */
export function isUntouchedTemplate(
  message: string,
  vars: { client: string; project: string },
): boolean {
  const current = message.trim();
  if (!current) return true;
  return (["formal", "friendly"] as const).some((tone) =>
    // So với mẫu của MỌI loại nhắc: người dùng có thể đã đổi loại nhắc trước đó.
    ALL_TYPES.some((candidate) => reminderTemplate(candidate, vars, tone).trim() === current),
  );
}

const ALL_TYPES: ReminderType[] = [
  "follow_up",
  "proposal_follow_up",
  "contract_signing_nudge",
  "payment_due",
  "payment_overdue",
  "re_engagement",
  "custom",
];
