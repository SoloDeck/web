import { useState } from "react";
import { Check, Save, ShieldCheck, AlertCircle, Briefcase, CreditCard, MessageCircle, FileText } from "lucide-react";
import {
  type Profile,
  type ServiceCategory,
  type PricingTier,
  type ContractClause,
} from "@/lib/profile-store";

const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Brand & Content Designer",
  "Web Developer",
  "Marketing Consultant",
  "Photographer / Videographer",
  "Copywriter / SEO",
  "Business Coach",
];

const PRICING_TIERS: { id: PricingTier; label: string; hint: string }[] = [
  { id: "Starter", label: "Starter", hint: "Mới bắt đầu · 200–300k/giờ" },
  { id: "Professional", label: "Professional", hint: "Có kinh nghiệm · 300–500k/giờ" },
  { id: "Premium", label: "Premium", hint: "Chuyên gia · 500k–1tr/giờ" },
];

type Props = {
  profile: Profile;
  onSave: (p: Profile) => void;
  clauses: ContractClause[];
  onSaveClauses: (c: ContractClause[]) => void;
};

export function ProfileSettings({ profile, onSave, clauses, onSaveClauses }: Props) {
  const [tab, setTab] = useState<"profile" | "payment" | "zalo" | "contract">("profile");
  const [draft, setDraft] = useState<Profile>(profile);
  const [draftClauses, setDraftClauses] = useState<ContractClause[]>(clauses);
  const [confirming, setConfirming] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const dirty =
    JSON.stringify(draft) !== JSON.stringify(profile) ||
    JSON.stringify(draftClauses) !== JSON.stringify(clauses);

  const handleSave = () => {
    onSave(draft);
    onSaveClauses(draftClauses);
    setConfirming(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const tabs = [
    { id: "profile" as const, label: "Hồ sơ", icon: Briefcase },
    { id: "payment" as const, label: "Thanh toán", icon: CreditCard },
    { id: "zalo" as const, label: "Zalo OA", icon: MessageCircle },
    { id: "contract" as const, label: "Hợp đồng", icon: FileText },
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
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Họ tên">
                    <input
                      value={draft.fullName}
                      onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Chức danh hiển thị">
                    <input
                      value={draft.displayTitle}
                      onChange={(e) => setDraft({ ...draft, displayTitle: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      value={draft.email}
                      onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Số điện thoại">
                    <input
                      value={draft.phone}
                      onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Mã số thuế (nếu có)">
                    <input
                      value={draft.taxCode}
                      onChange={(e) => setDraft({ ...draft, taxCode: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Giá theo giờ (VND)">
                    <input
                      type="number"
                      value={draft.hourlyRate}
                      onChange={(e) => setDraft({ ...draft, hourlyRate: Number(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Field label="Loại dịch vụ">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                    {SERVICE_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setDraft({ ...draft, serviceCategory: c })}
                        className={`text-left text-sm px-3 py-2.5 rounded-lg border transition-colors ${
                          draft.serviceCategory === c
                            ? "border-primary bg-primary/5 text-foreground font-medium"
                            : "border-border hover:bg-secondary/60"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Mức giá (Pricing tier)">
                  <div className="grid grid-cols-3 gap-2">
                    {PRICING_TIERS.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setDraft({ ...draft, pricingTier: t.id })}
                        className={`text-left p-3 rounded-lg border transition-colors ${
                          draft.pricingTier === t.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-secondary/60"
                        }`}
                      >
                        <div className="text-sm font-semibold">{t.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.hint}</div>
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            )}

            {tab === "payment" && (
              <div className="space-y-5">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Tài khoản ngân hàng
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ngân hàng">
                      <input
                        value={draft.bank.name}
                        onChange={(e) => setDraft({ ...draft, bank: { ...draft.bank, name: e.target.value } })}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Số tài khoản">
                      <input
                        value={draft.bank.accountNumber}
                        onChange={(e) =>
                          setDraft({ ...draft, bank: { ...draft.bank, accountNumber: e.target.value } })
                        }
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Chủ tài khoản">
                      <input
                        value={draft.bank.accountHolder}
                        onChange={(e) =>
                          setDraft({ ...draft, bank: { ...draft.bank, accountHolder: e.target.value } })
                        }
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                    Ví MoMo
                    <span className="text-[10px] rounded bg-pink-500/10 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 font-bold">
                      MoMo
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Số điện thoại MoMo">
                      <input
                        value={draft.momo.phone}
                        onChange={(e) => setDraft({ ...draft, momo: { ...draft.momo, phone: e.target.value } })}
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Tên chủ ví">
                      <input
                        value={draft.momo.holder}
                        onChange={(e) => setDraft({ ...draft, momo: { ...draft.momo, holder: e.target.value } })}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            {tab === "zalo" && (
              <div className="space-y-5">
                <div className={`rounded-lg p-3 text-xs flex items-start gap-2 ${
                  draft.zaloOA.connected
                    ? "bg-success/10 text-success border border-success/20"
                    : "bg-warning/10 text-warning-foreground border border-warning/30"
                }`}>
                  {draft.zaloOA.connected ? <ShieldCheck className="h-4 w-4 mt-0.5" /> : <AlertCircle className="h-4 w-4 mt-0.5" />}
                  <div>
                    <div className="font-semibold">
                      {draft.zaloOA.connected ? "Zalo OA đã kết nối" : "Chưa kết nối"}
                    </div>
                    <div className="opacity-90">
                      Thông tin OA dùng để gửi tin nhắn nhắc nhở và nhận lead tự động.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Field label="OA App ID">
                    <input
                      value={draft.zaloOA.appId}
                      onChange={(e) => setDraft({ ...draft, zaloOA: { ...draft.zaloOA, appId: e.target.value } })}
                      className={inputCls}
                      placeholder="VD: ZOA-1029384756"
                    />
                  </Field>
                  <Field label="App Secret">
                    <input
                      type="password"
                      value={draft.zaloOA.secret}
                      onChange={(e) => setDraft({ ...draft, zaloOA: { ...draft.zaloOA, secret: e.target.value } })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Access Token">
                    <input
                      type="password"
                      value={draft.zaloOA.accessToken}
                      onChange={(e) =>
                        setDraft({ ...draft, zaloOA: { ...draft.zaloOA, accessToken: e.target.value } })
                      }
                      className={inputCls}
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.zaloOA.connected}
                    onChange={(e) =>
                      setDraft({ ...draft, zaloOA: { ...draft.zaloOA, connected: e.target.checked } })
                    }
                    className="h-4 w-4 rounded"
                  />
                  Đánh dấu đã xác thực kết nối với Zalo OA
                </label>
              </div>
            )}

            {tab === "contract" && (
              <div className="space-y-4">
                <label className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="text-sm font-semibold">Hợp đồng song ngữ Việt / Anh</div>
                    <div className="text-xs text-muted-foreground">
                      Tự động chèn bản tiếng Anh khi xuất hợp đồng cho khách quốc tế.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={draft.bilingualContracts}
                    onChange={(e) => setDraft({ ...draft, bilingualContracts: e.target.checked })}
                    className="h-4 w-4"
                  />
                </label>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Điều khoản mặc định
                  </div>
                  <div className="space-y-2">
                    {draftClauses.map((c, idx) => (
                      <div key={c.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <input
                            value={c.title}
                            onChange={(e) => {
                              const next = [...draftClauses];
                              next[idx] = { ...c, title: e.target.value };
                              setDraftClauses(next);
                            }}
                            className="flex-1 bg-transparent font-semibold text-sm outline-none border-b border-transparent focus:border-border"
                          />
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={c.enabled}
                              onChange={(e) => {
                                const next = [...draftClauses];
                                next[idx] = { ...c, enabled: e.target.checked };
                                setDraftClauses(next);
                              }}
                            />
                            Dùng
                          </label>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                          <textarea
                            value={c.body_vi}
                            onChange={(e) => {
                              const next = [...draftClauses];
                              next[idx] = { ...c, body_vi: e.target.value };
                              setDraftClauses(next);
                            }}
                            className="w-full text-xs rounded-md border border-border bg-background p-2 min-h-[80px]"
                            placeholder="Nội dung điều khoản (Tiếng Việt)"
                          />
                          {draft.bilingualContracts && (
                            <textarea
                              value={c.body_en}
                              onChange={(e) => {
                                const next = [...draftClauses];
                                next[idx] = { ...c, body_en: e.target.value };
                                setDraftClauses(next);
                              }}
                              className="w-full text-xs rounded-md border border-border bg-background p-2 min-h-[80px]"
                              placeholder="Clause text (English)"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() =>
                      setDraftClauses([
                        ...draftClauses,
                        {
                          id: `c${Date.now()}`,
                          title: "Điều khoản mới",
                          body_vi: "",
                          body_en: "",
                          enabled: true,
                        },
                      ])
                    }
                    className="mt-2 text-xs text-primary font-medium hover:underline"
                  >
                    + Thêm điều khoản
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-muted/20">
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            {dirty ? "Có thay đổi chưa lưu" : "Đã đồng bộ"}
            {savedFlash && (
              <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                <Check className="h-3.5 w-3.5" /> Đã lưu
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {confirming ? (
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
            ) : (
              <button
                disabled={!dirty}
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-95 disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> Lưu thay đổi
              </button>
            )}
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
