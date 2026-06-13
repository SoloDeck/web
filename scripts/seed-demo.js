/**
 * seed-demo.js
 * Chạy trong Browser Console khi đã đăng nhập vào SoloDesk.
 * 1. Xóa toàn bộ deal hiện tại
 * 2. Tạo khách hàng mẫu (nếu chưa có)
 * 3. Tạo deals mẫu trải đều trên Kanban
 *
 * Cách dùng: mở F12 → Console → paste toàn bộ đoạn này → Enter
 */

(async () => {
  const BASE = "http://localhost:8000/api/v1";

  // ── Lấy token từ localStorage ──────────────────────────────────────────────
  function getToken() {
    for (const s of [localStorage, sessionStorage]) {
      try {
        const raw = s.getItem("solodesk.auth.session.v1");
        if (raw) return JSON.parse(raw).token ?? null;
      } catch {}
    }
    return null;
  }

  const TOKEN = getToken();
  if (!TOKEN) { console.error("❌ Chưa đăng nhập!"); return; }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN}`,
  };

  async function api(method, path, body) {
    const r = await fetch(BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`${method} ${path} → ${r.status}: ${txt}`);
    }
    return r.json();
  }

  // ── 1. Xóa toàn bộ deals hiện tại ─────────────────────────────────────────
  console.log("🗑️  Đang xóa deals cũ...");
  const { data: existingDeals } = await api("GET", "/deals");
  for (const d of existingDeals) {
    await api("DELETE", `/deals/${d.id}`);
    console.log(`   Đã xóa: ${d.title}`);
  }
  console.log(`✅ Xóa xong ${existingDeals.length} deals.`);

  // ── 2. Tạo / lấy khách hàng mẫu ───────────────────────────────────────────
  console.log("\n👥 Đang tạo khách hàng mẫu...");

  const clientDefs = [
    {
      name: "Công ty TNHH TechViet",
      type: "company",
      status: "active",
      phone: "028 3823 1234",
      email: "contact@techviet.vn",
      description: "Startup công nghệ, chuyên giải pháp SaaS cho doanh nghiệp vừa và nhỏ",
    },
    {
      name: "Nguyễn Minh Tuấn",
      type: "individual",
      status: "active",
      phone: "0901 234 567",
      email: "tuan.nguyen@gmail.com",
      description: "Chủ chuỗi nhà hàng Việt tại TP.HCM, cần giải pháp số hóa vận hành",
    },
    {
      name: "Trần Thị Lan Anh",
      type: "individual",
      status: "prospect",
      phone: "0912 345 678",
      email: "lananh.tran@outlook.com",
      description: "Chủ cửa hàng thời trang cao cấp, đang mở rộng bán hàng online",
    },
    {
      name: "Công ty Cổ phần Minh Phát",
      type: "company",
      status: "active",
      phone: "0274 3821 456",
      email: "info@minhphat.com.vn",
      description: "Doanh nghiệp xây dựng & bất động sản khu vực Bình Dương",
    },
    {
      name: "Hoàng Văn Nam",
      type: "individual",
      status: "active",
      phone: "0938 567 890",
      email: "hv.nam@eduonline.vn",
      description: "Giám đốc trung tâm đào tạo kỹ năng mềm, cần hệ thống học online",
    },
  ];

  const clients = [];
  for (const def of clientDefs) {
    try {
      const { data } = await api("POST", "/clients", def);
      clients.push(data);
      console.log(`   ✅ Tạo: ${data.name} (${data.id})`);
    } catch (e) {
      console.warn(`   ⚠️  ${def.name}: ${e.message}`);
    }
  }

  if (clients.length === 0) {
    console.error("❌ Không tạo được khách hàng nào. Dừng.");
    return;
  }

  // Helper: lấy client theo index (fallback về index 0)
  const c = (i) => clients[i] ?? clients[0];

  // ── 3. Tạo deals mẫu ──────────────────────────────────────────────────────
  console.log("\n📋 Đang tạo deals mẫu...");

  const dealDefs = [
    // new_lead
    {
      client_id: c(2).id,
      title: "Website cửa hàng thời trang online",
      stage: "new_lead",
      estimated_value: 8500000,
      source: "zalo",
      notes: "Khách tìm hiểu qua Zalo, cần website bán hàng tích hợp Zalo Pay.",
    },
    // qualified
    {
      client_id: c(4).id,
      title: "Hệ thống LMS học trực tuyến",
      stage: "qualified",
      estimated_value: 35000000,
      source: "email",
      notes: "Đã khảo sát nhu cầu, phù hợp triển khai. Cần demo bản prototype tuần tới.",
    },
    // proposal_sent
    {
      client_id: c(1).id,
      title: "App mobile đặt bàn & quản lý nhà hàng",
      stage: "proposal_sent",
      estimated_value: 28000000,
      source: "meeting",
      notes: "Đã gửi báo giá 28 triệu, khách đang review. Gặp lại vào 15/06.",
    },
    {
      client_id: c(0).id,
      title: "Redesign website công ty & SEO",
      stage: "proposal_sent",
      estimated_value: 15000000,
      source: "email",
      notes: "Khách muốn giao diện mới hiện đại hơn, tối ưu SEO cho từ khóa SaaS.",
    },
    // in_negotiation
    {
      client_id: c(1).id,
      title: "Thiết kế nhận diện thương hiệu chuỗi nhà hàng",
      stage: "in_negotiation",
      estimated_value: 12000000,
      source: "phone",
      notes: "Đang đàm phán giá. Khách muốn giảm 10%, cần thêm 2 revision.",
    },
    {
      client_id: c(3).id,
      title: "Phần mềm quản lý thi công & tiến độ",
      stage: "in_negotiation",
      estimated_value: 22000000,
      source: "meeting",
      notes: "Đã họp 2 lần, cần thêm module báo cáo nguyên vật liệu theo yêu cầu.",
    },
    // active
    {
      client_id: c(0).id,
      title: "Nền tảng thương mại điện tử B2B TechViet",
      stage: "active",
      estimated_value: 45000000,
      source: "email",
      notes: "Đang triển khai sprint 3/5. Bàn giao dự kiến 30/06/2026.",
    },
    // completed_and_billed
    {
      client_id: c(3).id,
      title: "Website giới thiệu & CRM nội bộ Minh Phát",
      stage: "completed_and_billed",
      estimated_value: 65000000,
      source: "meeting",
      notes: "Hoàn thiện và bàn giao 05/2026. Khách hài lòng, đang xem xét dự án tiếp theo.",
    },
  ];

  for (const def of dealDefs) {
    try {
      const { data } = await api("POST", "/deals", def);
      console.log(`   ✅ [${def.stage.padEnd(20)}] ${def.title}`);
    } catch (e) {
      console.warn(`   ⚠️  ${def.title}: ${e.message}`);
    }
  }

  console.log("\n🎉 Seed data hoàn tất! Reload trang để thấy kết quả.");
})();
