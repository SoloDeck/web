import { ConfirmDialog } from "@/components/solodesk/ConfirmDialog";

type ConfirmSendContractDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Email khách nếu đã biết — nêu thẳng trong câu hỏi để freelancer thấy thư sẽ đi đâu. */
  clientEmail?: string | null;
  isLoading?: boolean;
  onConfirm: () => void;
  /** Chỉ ghi nhận hợp đồng ĐÃ GỬI (freelancer đã tự gửi bằng kênh khác), không gửi email. */
  onRecordOnly?: () => void;
};

/**
 * Hỏi lần cuối trước khi GỬI hợp đồng cho khách.
 *
 * Gửi hợp đồng giờ gửi EMAIL THẬT kèm file PDF tới khách (trước đây chỉ đổi trạng thái), mà thư
 * đã đi thì không thu hồi được. Báo giá đã có hộp thoại xác nhận tương tự (`ProposalModal`); hợp
 * đồng — thứ khách sẽ ký — lại để bấm một phát là gửi, nên ba nút "Gửi cho khách ký" ở trang deal
 * đều đi qua hộp thoại này.  #Huynh
 */
export function ConfirmSendContractDialog({
  open,
  onOpenChange,
  clientEmail,
  isLoading = false,
  onConfirm,
  onRecordOnly,
}: ConfirmSendContractDialogProps) {
  const email = (clientEmail ?? "").trim();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gửi hợp đồng cho khách ký?"
      description={
        `Hệ thống sẽ gửi email kèm file PDF hợp đồng tới ${email || "email của khách hàng"}. ` +
        "Thư đã gửi thì không rút lại được — hãy kiểm tra kỹ nội dung hợp đồng trước khi gửi. " +
        "Nếu bạn đã tự gửi bằng kênh khác (Zalo, tin nhắn...), chọn \"chỉ ghi nhận\"."
      }
      confirmLabel="Gửi hợp đồng"
      cancelLabel="Để tôi xem lại"
      isLoading={isLoading}
      onConfirm={onConfirm}
      secondaryLabel={onRecordOnly ? "Tôi đã gửi cách khác — chỉ ghi nhận" : undefined}
      onSecondary={onRecordOnly}
    />
  );
}
