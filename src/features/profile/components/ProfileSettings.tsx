// Trang này TRƯỚC ĐÂY có 5 tab, nhưng 3 trong số đó KHÔNG LƯU ĐƯỢC GÌ:
//
//   Thanh toán  — mã số thuế, ngân hàng, số tài khoản, MoMo, pricing tier
//   Zalo OA     — App ID, App Secret, Access Token
//   Hợp đồng    — điều khoản mặc định, hợp đồng song ngữ
//
// Người dùng điền, bấm "Lưu", thấy toast "Đã lưu" — rồi F5 là mất sạch. Backend không
// có endpoint nào nhận mấy trường đó (`handleSaveProfile` chỉ gửi full_name, phone,
// freelancer-profile và default_hourly_rate). Riêng điều khoản hợp đồng thì lưu vào
// localStorage nhưng KHÔNG AI ĐỌC — hợp đồng thật do AI của backend soạn.
//
// Giao diện hứa những gì hệ thống không làm được là nói dối người dùng. Nên xoá.
//
// Ghi chú cho backend: DB *có* sẵn cột `users.bank_account_info`, `momo_phone_number`,
// `zalo_oa_*` — chỉ thiếu endpoint. Khi nào backend làm, dựng lại tab là chuyện nhỏ.
//   #Huynh
import { useRef, useState } from "react";
import {
  BellRing, Briefcase, Check, Eye, EyeOff,
  FileText, Lock, Loader2, MessageCircle, Plus, Save, Tag, User, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Profile,
  PROFESSIONS,
} from "@/features/profile/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changePassword } from "@/services/usersService";
import { getApiErrorMessage, getApiErrorStatus } from "@/lib/api-error";
import { groupThousands, parseGrouped } from "@/utils/format";
import { AvatarUpload } from "@/features/profile/components/AvatarUpload";
import { ReminderRulesSettings } from "@/features/reminders/components/ReminderRulesSettings";
import { ZaloConnectionSettings } from "@/features/profile/components/ZaloConnectionSettings";

type Props = {
  profile: Profile;
  onSave: (p: Profile) => void;
};

export function ProfileSettings({ profile, onSave }: Props) {
  const [tab, setTab] = useState<
    "profile" | "reminders" | "zalo" | "security"
  >("profile");
  const [draft, setDraft] = useState<Profile>(profile);
  const [confirming, setConfirming] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Password change form state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  // Vừa đặt mật khẩu xong thì `profile.hasPassword` vẫn còn là `false` cho tới lần tải lại
  // trang (nó lấy từ `GET /users/me` lúc mount). Giữ cờ tại chỗ để form đổi NGAY sang dạng
  // "Đổi mật khẩu" — không thì người dùng đặt lần hai sẽ bị 401 mà không hiểu vì sao.  #Huynh
  const [pwJustSet, setPwJustSet] = useState(false);

  /**
   * Điều kiện của TÀI KHOẢN, không phải của phiên đăng nhập: người đã có mật khẩu rồi mới gắn
   * thêm Google vẫn phải nhập mật khẩu cũ. Đổi thành "hôm nay vào bằng Google thì miễn" là biến
   * đúng nhóm đó thành lỗ hổng — cướp được phiên là đổi được mật khẩu.
   */
  const hasPassword = profile.hasPassword || pwJustSet;

  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);

  const canSave = dirty;

  const handleSave = () => {
    // Chặn cả ở đây, không chỉ ở thuộc tính disabled: luồng xác nhận có nút "Đồng ý" thứ
    // hai, sửa slug hỏng trong lúc đang chờ xác nhận là lách qua được cửa đầu.
    if (!canSave) return;
    onSave(draft);
    setConfirming(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const handleChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm) {
      toast.error("Mật khẩu mới không khớp.");
      return;
    }
    if (pwForm.next.length < 8) {
      toast.error("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    setPwLoading(true);
    try {
      // Tài khoản chưa có mật khẩu (đăng nhập bằng Google) thì KHÔNG gửi `current_password` —
      // họ không có gì để nhập. Backend tự phân nhánh theo tài khoản, không tin cờ này.
      await changePassword(
        hasPassword
          ? { current_password: pwForm.current, new_password: pwForm.next }
          : { new_password: pwForm.next }
      );
      toast.success(hasPassword ? "Đổi mật khẩu thành công." : "Đã đặt mật khẩu thành công.");
      setPwForm({ current: "", next: "", confirm: "" });
      setPwJustSet(true);
    } catch (err) {
      // Bản cũ gộp MỌI nguyên nhân vào một câu "Mật khẩu hiện tại không đúng hoặc có lỗi xảy
      // ra" — mất mạng, server 500 hay sai mật khẩu đều hiện y hệt, người dùng không biết
      // đường sửa. Chỉ 401 mới thật sự là sai mật khẩu.  #Huynh
      console.error("[change-password] đổi mật khẩu thất bại", err);
      const status = getApiErrorStatus(err);
      if (status === 401) {
        toast.error("Mật khẩu hiện tại không đúng.");
      } else if (status === undefined) {
        toast.error("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
      } else {
        toast.error(getApiErrorMessage(err, "Không đổi được mật khẩu. Vui lòng thử lại."));
      }
    } finally {
      setPwLoading(false);
    }
  };

  const tabs = [
    { id: "profile" as const, label: "Hồ sơ", icon: Briefcase },
    { id: "reminders" as const, label: "Nhắc nhở tự động", icon: BellRing },
    { id: "zalo" as const, label: "Zalo OA", icon: MessageCircle },
    { id: "security" as const, label: "Bảo mật", icon: Lock },
  ];

  // Chỉ tab Hồ sơ sửa `draft`; thanh trạng thái và nút Lưu ở chân màn chỉ hiện ở đó.
  const isEditingProfile = tab === "profile";

  return (
    <div className="p-4 lg:p-6 h-full flex flex-col">
      <div className="flex-1 flex flex-col rounded-xl border border-border bg-card overflow-hidden">

        <div className="flex flex-1 min-h-0">
          <nav className="w-48 shrink-0 border-r border-border p-3 space-y-1 bg-muted/20">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  tab === t.id
                    ? "bg-card text-foreground font-medium shadow-sm border border-border"
                    : "text-muted-foreground hover:bg-card/60"
                }`}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {tab === "profile" && (
              <div className="space-y-6">
                {/* Avatar + identity card */}
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> Thông tin cơ bản
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {/* Avatar upload */}
                    <div className="flex shrink-0 flex-col items-center gap-2">
                      <AvatarUpload
                        value={draft.avatarUrl}
                        name={draft.fullName}
                        onChange={(url) => setDraft({ ...draft, avatarUrl: url })}
                      />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Họ tên">
                          <input
                            value={draft.fullName}
                            onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                            className={inputCls}
                          />
                        </Field>
                        <Field label="Chức danh chuyên môn">
                          <input
                            value={draft.professionalTitle}
                            onChange={(e) => setDraft({ ...draft, professionalTitle: e.target.value })}
                            placeholder="VD: Full-stack Developer"
                            className={inputCls}
                          />
                        </Field>
                        <Field label="Email">
                          <input
                            type="email"
                            value={draft.email}
                            readOnly
                            className={`${inputCls} cursor-default opacity-60`}
                            title="Email không thể thay đổi"
                          />
                        </Field>
                        <Field label="Số điện thoại">
                          <input
                            value={draft.phone}
                            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                            className={inputCls}
                          />
                        </Field>
                      </div>

                      <Field label="Nghề chính">
                        <Select
                          items={PROFESSIONS}
                          value={draft.profession}
                          onValueChange={(value) =>
                            setDraft({ ...draft, profession: value ?? "" })
                          }
                        >
                          <SelectTrigger className="h-auto w-full rounded-md border-border bg-background px-3 py-2">
                            <SelectValue placeholder="— Chọn nghề —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">— Chọn nghề —</SelectItem>
                            {PROFESSIONS.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                {p.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Nghề chính</span> giúp AI
                        ước giá đúng ngành và cảnh báo chiêu lừa đặc thù nghề của bạn.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" /> Giới thiệu bản thân
                  </div>
                  <Field label="Bio">
                    <textarea
                      value={draft.bio}
                      onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                      rows={3}
                      placeholder="Mô tả ngắn về kinh nghiệm và thế mạnh của bạn..."
                      className={`${inputCls} resize-none`}
                    />
                  </Field>
                </div>

                {/* Hồ sơ năng lực — kỹ năng, mức giá, portfolio.

                    GIỮ ô "Mức giá theo giờ" dù `users.default_hourly_rate` hiện KHÔNG module
                    nào đọc (kể cả AI soạn báo giá — nó tự ước giá thị trường từ mô tả dự án):
                    phiếu đề tài đòi hồ sơ chuyên nghiệp cấu hình được "pricing tier", và hai
                    mục cùng dòng đó (điều khoản hợp đồng mặc định, Zalo OA credentials) đã
                    không có. Gỡ nốt cái này là dòng phiếu trống hẳn. Đã thử gỡ 19/08 rồi
                    dựng lại vì lý do đó.  #Huynh */}
                <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" /> Hồ sơ năng lực
                  </div>

                  <Field label="Kỹ năng">
                    <SkillsInput
                      value={draft.skills}
                      onChange={(skills) => setDraft({ ...draft, skills })}
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Mức giá theo giờ (VND)">
                      {/* Gõ tới đâu chấm hàng nghìn hiện tới đó: "300000" là một dãy số phải
                          đếm bằng mắt, "300.000" thì không. Đây cũng là cách hai ô tiền còn
                          lại trong app (báo giá, bảng giá) đang làm — ô này lệch nhịp vì nó là
                          `type="number"`, mà kiểu đó không nhận nổi chuỗi có dấu chấm.  #Huynh */}
                      <input
                        inputMode="numeric"
                        value={draft.hourlyRate ? groupThousands(draft.hourlyRate) : ""}
                        onChange={(e) =>
                          setDraft({ ...draft, hourlyRate: parseGrouped(e.target.value) })
                        }
                        placeholder="VD: 300.000"
                        className={`${inputCls} tabular-nums`}
                      />
                    </Field>
                    <Field label="Link portfolio">
                      <input
                        type="url"
                        value={draft.portfolioUrl}
                        onChange={(e) => setDraft({ ...draft, portfolioUrl: e.target.value })}
                        placeholder="https://behance.net/ten-cua-ban"
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </div>

              </div>
            )}


            {tab === "reminders" && <ReminderRulesSettings />}

            {tab === "zalo" && <ZaloConnectionSettings />}

            {tab === "security" && (
              <div className="space-y-6 max-w-md">
                <div>
                  <div className="text-sm font-semibold mb-1">
                    {hasPassword ? "Đổi mật khẩu" : "Thêm mật khẩu"}
                  </div>
                  <div className="text-xs text-muted-foreground mb-4">
                    {hasPassword ? (
                      "Mật khẩu mới phải có ít nhất 8 ký tự."
                    ) : (
                      <>
                        Bạn đang đăng nhập bằng Google nên chưa có mật khẩu. Đặt thêm mật khẩu để
                        đăng nhập được bằng cả hai cách. Mật khẩu phải có ít nhất 8 ký tự.
                      </>
                    )}
                  </div>
                  <div className="space-y-3">
                    {/* Chưa có mật khẩu thì KHÔNG hiện ô này: đòi một thứ không thể tồn tại, gõ
                        gì vào cũng sai, và người dùng Google kẹt vĩnh viễn ở đây.  #Huynh */}
                    {hasPassword && (
                      <Field label="Mật khẩu hiện tại">
                        <div className="relative">
                          <input
                            type={showPw.current ? "text" : "password"}
                            value={pwForm.current}
                            onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                            className={`${inputCls} pr-10`}
                            placeholder="••••••••"
                            autoComplete="current-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw((s) => ({ ...s, current: !s.current }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPw.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </Field>
                    )}
                    <Field label="Mật khẩu mới">
                      <div className="relative">
                        <input
                          type={showPw.next ? "text" : "password"}
                          value={pwForm.next}
                          onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                          className={`${inputCls} pr-10`}
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((s) => ({ ...s, next: !s.next }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPw.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                    <Field label="Xác nhận mật khẩu mới">
                      <div className="relative">
                        <input
                          type={showPw.confirm ? "text" : "password"}
                          value={pwForm.confirm}
                          onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                          className={`${inputCls} pr-10`}
                          placeholder="••••••••"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPw.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </Field>
                  </div>
                  <button
                    onClick={handleChangePassword}
                    disabled={
                      pwLoading ||
                      // Ô "hiện tại" chỉ bắt buộc khi tài khoản THẬT SỰ có mật khẩu — nếu không
                      // thì nút khoá vĩnh viễn với người dùng Google, đúng cái bế tắc đang sửa.
                      (hasPassword && !pwForm.current) ||
                      !pwForm.next ||
                      !pwForm.confirm
                    }
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-95 disabled:opacity-40"
                  >
                    {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    {hasPassword ? "Đổi mật khẩu" : "Thêm mật khẩu"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-muted/20">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {isEditingProfile && (dirty ? "Có thay đổi chưa lưu" : "Đã đồng bộ")}
            {savedFlash && (
              <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                <Check className="h-3.5 w-3.5" /> Đã lưu
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditingProfile && confirming ? (
              <>
                <span className="text-xs text-muted-foreground">Xác nhận lưu thay đổi?</span>
                <button
                  onClick={() => setConfirming(false)}
                  className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary"
                >
                  Huỷ
                </button>
                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-95"
                >
                  <Check className="h-3.5 w-3.5" /> Đồng ý
                </button>
              </>
            ) : isEditingProfile ? (
              <button
                disabled={!canSave}
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-95 disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> Lưu thay đổi
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}

/**
 * Ô nhập kỹ năng dạng thẻ: Enter hoặc dấu phẩy để thêm, Backspace khi ô trống để xoá lùi.
 *
 * Bản này lấy lại từ commit `5f57449^` — nó từng bị gỡ cùng lúc với ô Portfolio, khiến kỹ
 * năng chỉ vào được đúng một lần lúc onboarding và mắc kẹt ở bộ chuỗi cứng của preset.
 */
function SkillsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const remove = (skill: string) => onChange(value.filter((s) => s !== skill));

  return (
    // Bấm vào khoảng trống trong khung cũng phải focus được ô nhập, không thì người dùng
    // phải nhắm đúng con trỏ text bé xíu ở cuối hàng thẻ.
    <div
      className="flex min-h-[42px] cursor-text flex-wrap gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-primary/30"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((skill) => (
        <span
          key={skill}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
        >
          {skill}
          <button
            type="button"
            aria-label={`Xoá kỹ năng ${skill}`}
            onClick={(e) => {
              e.stopPropagation();
              remove(skill);
            }}
            className="hover:text-destructive"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        // Ô trần nằm giữa hàng thẻ, và placeholder biến mất ngay khi có thẻ đầu tiên — không
        // có nhãn này thì trình đọc màn hình chỉ đọc ra "edit text" trống trơn.
        aria-label="Nhập kỹ năng"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            // Ô này nằm trong màn có nút Lưu — không chặn thì Enter submit cả form.
            e.preventDefault();
            add();
          }
          if (e.key === "Backspace" && !input && value.length > 0) {
            remove(value[value.length - 1]);
          }
        }}
        placeholder={value.length === 0 ? "Nhập kỹ năng, Enter để thêm..." : ""}
        className="min-w-[140px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {input && (
        <button
          type="button"
          aria-label="Thêm kỹ năng"
          onClick={add}
          className="grid place-items-center rounded-full bg-primary/10 px-2 text-xs font-medium text-primary hover:bg-primary/20"
        >
          <Plus className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
