import { ConfirmDialog } from "@/components/solodesk/ConfirmDialog";
import { formatVND } from "@/utils/format";

type ConfirmSendInvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceNumber: string;
  /** Tổng tiền hóa đơn (đã gồm thuế) — nêu thẳng trong tiêu đề để freelancer đọc lại con số. */
  total: number;
  clientName: string;
  /** Email khách nếu đã biết — in đậm để freelancer thấy thư sẽ đi đâu. */
  clientEmail?: string | null;
  isLoading?: boolean;
  onConfirm: () => void;
};

/**
 * Hỏi lần cuối trước khi GỬI hóa đơn cho khách.
 *
 * Thư mang số tiền tới hộp thư của khách hàng thật và đã đi thì không thu hồi được. Cùng khuôn với
 * hộp thoại gửi báo giá (`ProposalModal`) và gửi hợp đồng (`ConfirmSendContractDialog`): nút
 * "Hủy" / "Lưu & gửi", nội dung gọn, in đậm chỗ mắt phải dừng lại. Dùng chung cho cả hai nơi bấm
 * gửi hóa đơn (hàng ở tab Tài liệu và cửa sổ soạn) để chúng không lệch nhau.  #Huynh
 */
export function ConfirmSendInvoiceDialog({
  open,
  onOpenChange,
  invoiceNumber,
  total,
  clientName,
  clientEmail,
  isLoading = false,
  onConfirm,
}: ConfirmSendInvoiceDialogProps) {
  const email = (clientEmail ?? "").trim();
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Gửi hóa đơn ${invoiceNumber} — ${formatVND(total)} cho ${clientName}?`}
      description={
        <>
          Hệ thống sẽ gửi email kèm hóa đơn tới{" "}
          {email ? (
            <strong className="font-semibold text-foreground">{email}</strong>
          ) : (
            "email đã lưu của khách"
          )}
          .
        </>
      }
      confirmLabel="Lưu & gửi"
      cancelLabel="Hủy"
      isLoading={isLoading}
      onConfirm={onConfirm}
    />
  );
}
