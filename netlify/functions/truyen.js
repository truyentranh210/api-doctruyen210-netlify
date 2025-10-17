const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
  try {
    // ✅ Tự động tìm file converted_links.txt dù ở gốc hay trong thư mục functions
    let filename = path.join(__dirname, "converted_links.txt");
    if (!fs.existsSync(filename)) {
      filename = path.join(process.cwd(), "converted_links.txt");
    }

    // Nếu vẫn không tìm thấy -> báo lỗi
    if (!fs.existsSync(filename)) {
      return jsonResponse({
        error: "Không tìm thấy file converted_links.txt. Hãy chắc rằng file nằm ở cùng cấp hoặc trong netlify/functions."
      }, 404);
    }

    // Đọc nội dung file
    const lines = fs.readFileSync(filename, "utf8").split(/\r?\n/);

    const data = {};
    let currentTitle = null;

    for (let line of lines) {
      line = line.trim().replace(/^"+|"+$/g, "");
      if (!line) continue;

      // Nếu là tiêu đề truyện
      if (line.toLowerCase().startsWith("đọc-truyện-hentai") || line.toLowerCase().startsWith("doc-truyen-hentai")) {
        currentTitle = line;
        data[currentTitle] = [];
      }
      // Nếu là link ảnh
      else if (line.startsWith("http") && currentTitle) {
        data[currentTitle].push(line);
      }
    }

    // Tạo slug map
    const slugify = (title) => {
      return title
        .replace(/đọc-truyện-hentai-|doc-truyen-hentai-/gi, "")
        .replace(/[^a-zA-Z0-9\- ]/g, "")
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-")
        .replace(/^-|-$/g, "");
    };

    const slugMap = {};
    for (const [k, v] of Object.entries(data)) slugMap[slugify(k)] = v;

    const reqPath = event.path;
    const parts = reqPath.split("/").filter(Boolean);

    // ---------------------
    // 🏠 Trang chủ
    if (reqPath === "/" || reqPath === "/truyen") {
      return jsonResponse({
        status: "✅ API hoạt động!",
        routes: {
          "/truyen/all": "Toàn bộ truyện và link ảnh",
          "/truyen/<slug>": "Xem link ảnh của truyện cụ thể"
        },
        example: ["/truyen/Arlecchino", "/truyen/MISATO-X-SHINJI"]
      });
    }

    // ---------------------
    // 📘 Toàn bộ truyện
    if (reqPath === "/truyen/all") {
      const all = {};
      for (const [k, v] of Object.entries(data)) all[slugify(k)] = v;
      return jsonResponse(all);
    }

    // ---------------------
    // 📗 Truyện cụ thể
    if (parts[0] === "truyen" && parts[1]) {
      const slug = parts[1];
      if (!slugMap[slug]) {
        return jsonResponse({ error: `Không tìm thấy truyện: ${slug}` }, 404);
      }
      return jsonResponse({
        title: slug,
        images: slugMap[slug]
      });
    }

    // ---------------------
    return jsonResponse({ error: "Route không tồn tại." }, 404);

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
};

// ==============================
// 🔧 Hàm helper xuất JSON
// ==============================
function jsonResponse(obj, code = 200) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj, null, 2)
  };
}
