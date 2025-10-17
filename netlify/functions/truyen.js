const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
  try {
    const filename = path.join(__dirname, "converted_links.txt");
    if (!fs.existsSync(filename)) {
      return jsonResponse({ error: "Không tìm thấy file converted_links.txt" }, 404);
    }

    const raw = fs.readFileSync(filename, "utf8").split("\n");

    // Hàm slugify tương tự Python
    const slugify = (title) => {
      return title
        .replace(/Đọc-truyện-hentai-|doc-truyen-hentai-/gi, "")
        .replace(/[^a-zA-Z0-9\- ]/g, "")
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-")
        .replace(/^-|-$/g, "");
    };

    // Parse data
    const data = {};
    let currentTitle = null;

    for (let line of raw) {
      line = line.trim().replace(/^"+|"+$/g, "");
      if (!line) continue;

      if (line.toLowerCase().startsWith("đọc-truyện-hentai") || line.toLowerCase().startsWith("doc-truyen-hentai")) {
        currentTitle = line;
        data[currentTitle] = [];
      } else if (line.startsWith("http") && currentTitle) {
        data[currentTitle].push(line);
      }
    }

    // Build slug map
    const slugMap = {};
    for (const [key, value] of Object.entries(data)) {
      slugMap[slugify(key)] = value;
    }

    const { path: reqPath } = event;
    const parts = reqPath.split("/").filter(Boolean);

    // Route logic
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

    if (reqPath === "/truyen/all") {
      const all = {};
      for (const [k, v] of Object.entries(data)) {
        all[slugify(k)] = v;
      }
      return jsonResponse(all);
    }

    if (parts[0] === "truyen" && parts[1]) {
      const slug = parts[1];
      if (!slugMap[slug]) {
        return jsonResponse({ error: `Không tìm thấy truyện: ${slug}` }, 404);
      }
      return jsonResponse({
        title: slug,
        images: slugMap[slug],
      });
    }

    return jsonResponse({ error: "Không tồn tại route này." }, 404);
  } catch (e) {
    return jsonResponse({ error: e.message }, 500);
  }
};

function jsonResponse(obj, code = 200) {
  return {
    statusCode: code,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(obj, null, 2),
  };
}
