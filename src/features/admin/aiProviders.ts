import type { LLMProvider } from "@/services/adminService";

/**
 * Nhà cung cấp AI và model admin được chọn — bản sao của `SUPPORTED_LLM_MODELS` bên backend
 * (`backend/src/ai/shared/constants.py`, cũng ghi trong mô tả `llm_model` ở openapi.yaml).
 *
 * Phải chép tay vì backend không có endpoint liệt kê model. Lệch một dòng là admin chọn được
 * một model backend không nhận → 422. Nên backend thêm/bớt model thì sửa ở đây cùng lúc.
 *
 * Bản cũ của trang tin rằng backend ghi cứng model nên chỉ gửi `llm_provider` — nhưng từ
 * 09/08 backend BẮT BUỘC `llm_model`, nên mọi lần bấm "Lưu cấu hình" đều 422 và admin không
 * đổi được nhà cung cấp AI nào cả.  #Huynh
 */
export const AI_PROVIDERS: {
  value: LLMProvider;
  label: string;
  models: readonly string[];
  hint?: string;
}[] = [
  { value: "groq", label: "Groq", models: ["openai/gpt-oss-120b"] },
  { value: "gemini", label: "Gemini", models: ["gemini-2.5-flash", "gemini-3.5-flash-lite"] },
  {
    value: "ollama",
    label: "Ollama",
    models: ["qwen3:4b"],
    // Máy chủ triển khai không chạy Ollama. Lưu vẫn được (backend chỉ dựng thử chứ không gọi
    // thử), nhưng sau đó mọi tính năng AI sẽ hỏng vì không kết nối được.
    hint: "Chỉ chọn khi máy chủ có Ollama đang chạy — không thì mọi tính năng AI sẽ lỗi.",
  },
];

/** Model đầu tiên của một nhà cung cấp — dùng khi admin vừa đổi nhà cung cấp. */
export function defaultModelFor(provider: LLMProvider): string {
  return AI_PROVIDERS.find((item) => item.value === provider)?.models[0] ?? "";
}

/** Danh sách model của một nhà cung cấp, rỗng nếu không biết nhà cung cấp đó. */
export function modelsFor(provider: LLMProvider): readonly string[] {
  return AI_PROVIDERS.find((item) => item.value === provider)?.models ?? [];
}
