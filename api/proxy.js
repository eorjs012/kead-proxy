
const { createInference } = require("../lib/readvoice.js");

const ALLOWED_ORIGIN = "*";

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const {
      image,
      mode = "summarize",
      language = "ko-kr",
      provider = "default",
      do_use_omniparser = false
    } = req.body || {};

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        error: "이미지 데이터가 없거나 올바르지 않습니다."
      });
    }

    if (!["read-main", "summarize"].includes(mode)) {
      return res.status(400).json({
        error: "지원하지 않는 분석 모드입니다."
      });
    }

    const task = await createInference({
      image,
      mode,
      language,
      provider,
      do_use_omniparser
    });

    return res.status(202).json(task);

  } catch (error) {
    console.error("V2 inference error:", error);

    return res.status(502).json({
      error: error.message || "V2 분석 요청에 실패했습니다."
    });
  }
};
