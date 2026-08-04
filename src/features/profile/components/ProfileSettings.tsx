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
import { useState } from "react";
import {
  BellRing, Briefcase, Check, Eye, EyeOff,
  FileText, Globe, Lock, Loader2, MessageCircle, Save, User,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Profile,
  PROFESSIONS,
} from "@/features/profile/types";
import { changePassword } from "@/services/usersService";
import { IntakeLinkCard } from "@/features/intake/components/IntakeLinkCard";
import { AvatarUpload } from "@/features/profile/components/AvatarUpload";
import { ReminderRulesSettings } from "@/features/reminders/components/ReminderRulesSettings";
import { ZaloConnectionSettings } from "@/features/profile/components/ZaloConnectionSettings";
import { Switch } from "@/components/ui/switch";

type Props = {
  profile: Profile;
  onSave: (p: Profile) => void;
};

export function ProfileSettings({ profile, onSave }: Props) {
  const [tab, setTab] = useState<"profile" | "reminders" | "zalo" | "security">("profile");
  const [draft, setDraft] = useState<Profile>(profile);
  const [confirming, setConfirming] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Password change form state
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);

  const handleSave = () => {
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
      await changePassword({ current_password: pwForm.current, new_password: pwForm.next });
      toast.success("Đổi mật khẩu thành công.");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch {
      toast.error("Mật khẩu hiện tại không đúng hoặc có lỗi xảy ra.");
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
                <IntakeLinkCard />

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
                        <select
                          value={draft.profession}
                          onChange={(e) => setDraft({ ...draft, profession: e.target.value })}
                          className={inputCls}
                        >
                          <option value="">— Chọn nghề —</option>
                          {PROFESSIONS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Nghề chính</span> giúp AI
                        ước giá đúng ngành và cảnh báo chiêu lừa đặc thù nghề của bạn.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Danh bạ công khai — trước đây backend đã nhận `is_listed` nhưng không
                    có chỗ nào trên giao diện bật được, nên 91/92 tài khoản không bao giờ
                    xuất hiện trên /find-freelancer.  #Huynh */}
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    <Globe className="h-3.5 w-3.5" /> Danh bạ công khai
                  </div>
                  <label className="flex cursor-pointer items-start justify-between gap-4">
                    <span>
                      <span className="block text-sm font-medium">
                        Hiện hồ sơ trong danh bạ công khai
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Khách tìm được bạn theo nhóm dịch vụ và gửi yêu cầu thẳng qua biểu
                        mẫu tiếp nhận của bạn. Tắt lúc nào cũng được.
                      </span>
                    </span>
                    <Switch
                      checked={draft.isListed}
                      onCheckedChange={(v) => setDraft({ ...draft, isListed: v })}
                    />
                  </label>
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

              </div>
            )}

            {tab === "reminders" && <ReminderRulesSettings />}

            {tab === "zalo" && <ZaloConnectionSettings />}

            {tab === "security" && (
              <div className="space-y-6 max-w-md">
                <div>
                  <div className="text-sm font-semibold mb-1">Đổi mật khẩu</div>
                  <div className="text-xs text-muted-foreground mb-4">
                    Mật khẩu mới phải có ít nhất 8 ký tự.
                  </div>
                  <div className="space-y-3">
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
                    disabled={pwLoading || !pwForm.current || !pwForm.next || !pwForm.confirm}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-95 disabled:opacity-40"
                  >
                    {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Đổi mật khẩu
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-muted/20">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {tab === "profile" && (dirty ? "Có thay đổi chưa lưu" : "Đã đồng bộ")}
            {savedFlash && (
              <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                <Check className="h-3.5 w-3.5" /> Đã lưu
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {tab === "profile" && confirming ? (
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
            ) : tab === "profile" ? (
              <button
                disabled={!dirty}
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
