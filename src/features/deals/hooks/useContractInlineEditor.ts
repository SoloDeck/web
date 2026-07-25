import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { attachInlineEdit, injectPreviewPageStyle } from "@/features/deals/inlineEditPreview";
import { useUpdateContract } from "@/features/deals/hooks/useContracts";
import type { ContractContentDTO, ContractResponse } from "@/services/contractsService";

/**
 * Cho sửa nội dung hợp đồng NGAY TRONG tờ giấy xem trước — bấm vào điều khoản rồi gõ, như
 * docs. Cùng cơ chế với báo giá ([ProposalModal] + [inlineEditPreview]): iframe render bản
 * server, ta gắn `attachInlineEdit` lên các ô `data-field`, blur thì gộp lại và LƯU thầm
 * qua PATCH /contracts.
 *
 * Chỉ bật khi hợp đồng còn `draft` — gửi/ký rồi là KHÓA, không cho sửa (backend cũng chặn
 * PATCH ngoài trạng thái nháp). Hợp đồng khác báo giá ở chỗ mỗi ngành nghề / mỗi deal có
 * điều khoản đặc thù riêng, nên phải cho freelancer chỉnh cho khớp.  #Huynh
 *
 * Vì sao gắn bằng ref + effect thay vì `onLoad`: `srcDoc` nhỏ có thể parse XONG trước khi
 * React kịp gắn listener `onLoad`, thế là sự kiện load trôi mất và không bao giờ gắn được
 * ô sửa — đúng triệu chứng "bấm vào không sửa được". Ở đây ta vừa nghe `load` cho lần nạp
 * sau, vừa gắn NGAY nếu tài liệu đã sẵn.  #Huynh
 */
export function useContractInlineEditor(
  contract: ContractResponse | undefined,
  previewHtml: string | undefined
) {
  const updateContract = useUpdateContract();
  const editable = contract?.status === "draft";

  // Giữ content + các id mới nhất trong ref để listener blur (gắn một lần lúc iframe nạp)
  // luôn đọc đúng bản hiện hành, không dính closure cũ.
  const contentRef = useRef<ContractContentDTO>(contract?.content ?? {});
  const idsRef = useRef<{ deal_id: string; proposal_id: string; client_id: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    contentRef.current = contract?.content ?? {};
    idsRef.current = contract
      ? { deal_id: contract.deal_id, proposal_id: contract.proposal_id, client_id: contract.client_id }
      : null;
  }, [contract]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const handleFieldChange = useCallback(
    (field: string, value: string) => {
      const ids = idsRef.current;
      if (!contract?.id || !editable || !ids) return;
      const current = contentRef.current as Record<string, unknown>;
      if (current[field] === value) return; // liếc qua rồi ra, không sửa gì thì bỏ

      // Gộp lên content HIỆN TẠI để giữ nguyên parties/governing_law — PATCH thay cả cục.
      const next = { ...current, [field]: value } as ContractContentDTO;
      contentRef.current = next;

      // Gõ liên tục thì gộp lại, 800ms sau mới ghi một lượt — không đập server mỗi phím.
      // Payload mang đủ id vì backend ContractRequest đòi (xem updateContract).  #Huynh
      if (timerRef.current) clearTimeout(timerRef.current);
      const contractId = contract.id;
      timerRef.current = setTimeout(() => {
        updateContract.mutate(
          { contractId, payload: { ...ids, content: next } },
          { onError: () => toast.error("Không lưu được nội dung vừa sửa. Vui lòng thử lại.") }
        );
      }, 800);
    },
    [contract, editable, updateContract]
  );

  // Gắn ô sửa (draft) hoặc khổ giấy A4 (đọc-only) mỗi khi HTML xem trước đổi. `attachInlineEdit`
  // tự chặn gắn trùng nên gọi lại vô hại.  #Huynh
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !previewHtml) return;

    const apply = () => {
      const doc = iframe.contentDocument;
      if (!doc || !doc.head) return;
      if (editable) attachInlineEdit(doc, handleFieldChange);
      else injectPreviewPageStyle(doc);
    };

    iframe.addEventListener("load", apply);
    apply(); // đã parse xong trước khi effect chạy thì gắn luôn, khỏi lỡ sự kiện load
    return () => iframe.removeEventListener("load", apply);
  }, [editable, handleFieldChange, previewHtml]);

  return { editable, iframeRef };
}
