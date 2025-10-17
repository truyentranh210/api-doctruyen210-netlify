const fetch = require("node-fetch");

// 🔹 URL file TXT chứa dữ liệu
const TXT_URL = "https://files.catbox.moe/pjwo11.txt";

// ====================================================
// 🔹 HÀM TẢI DỮ LIỆU TỪ FILE TXT TRÊN MẠNG
// ====================================================
async function loadData() {
  try {
    const res = await fetch(TXT_URL);
    if (!res.ok) throw new Error(`Không tải được file (${res.status})`);
    const text = await res.text();

    const lines = text.split(/\r?\n/);
    const data = {};
    let currentTitle = null;

    for (let line of lines) {
      line = line.trim().replace(/^"+|"+$/g, "");
      if (!line) continue;

      // Nếu là tiêu đề
      if (line.toLowerCase().startsWith("đọc-truyện-hentai") || line.toLowerCase().startsWith("doc-truyen-hentai")) {
        currentTitle = line;
        data[currentTitle] = [];
      }
      // Nếu là URL ảnh
      else if (line.startsWith("http") && currentTitle) {
        data[currentTitle].push(line);
      }
    }

    // Tạo slug map
    const slugify = (title) =>
      title
        .replace(/đọc-truyện-hentai-|doc-truyen-hentai-/gi, "")
        .replace(/[^a-zA-Z0-9\- ]/g, "")
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-")
        .replace(/^-|-$/g, "");

    const slugMap = {};
    for (const [k, v] of Object.entries(data)) slugMap[slugify(k)] = v;

    return { data, slugMap };
  } catch (err) {
    console.error("❌ Lỗi tải dữ liệu:", err);
    return { data: {}, slugMap: {} };
  }
}

// ====================================================
// 🔹 HÀM TRẢ JSON
// ====================================================
function jsonResponse(obj, code = 200) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj, null, 2),
  };
}

// ====================================================
// 🔹 HÀM CHÍNH CHẠY API
// ====================================================
exports.handler = async (event) => {
  try {
    const { data, slugMap } = await loadData();
    const reqPath = event.path;
    const parts = reqPath.split("/").filter(Boolean);

    // 🏠 Trang chủ
    if (reqPath === "/" || reqPath === "/truyen") {
      return jsonResponse({
        status: "✅ API hoạt động!",
        routes: {
          "/truyen/all": "Toàn bộ truyện và link ảnh",
          "/truyen/<slug>": "Xem link ảnh của truyện cụ thể",
        },
        example: ["/truyen/Arlecchino", "/truyen/MISATO-X-SHINJI"],
      });
    }

    // 📘 Toàn bộ truyện
    if (reqPath === "/truyen/all") {
      const all = {};
      for (const [k, v] of Object.entries(data)) {
        const slug = k
          .replace(/đọc-truyện-hentai-|doc-truyen-hentai-/gi, "")
          .replace(/[^a-zA-Z0-9\- ]/g, "")
          .replace(/\s+/g, "-")
          .replace(/--+/g, "-")
          .replace(/^-|-$/g, "");
        all[slug] = v;
      }
      return jsonResponse(all);
    }

    // 📗 Truyện cụ thể
    if (parts[0] === "truyen" && parts[1]) {
      const slug = parts[1];
      if (!slugMap[slug]) {
        return jsonResponse({ error: `Không tìm thấy truyện: ${slug}` }, 404);
      }
      return jsonResponse({
        title: slug,
        total_images: slugMap[slug].length,
        images: slugMap[slug],
      });
    }

    return jsonResponse({ error: "Route không tồn tại." }, 404);
  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
};
