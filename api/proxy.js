// api/proxy.js

const API_BASE = "https://api.readvoice.naraai.net";

async function getApiToken() {
  const serialKey = process.env.READVOICE_SERIAL_KEY;

  if (!serialKey) {
    throw new Error("READVOICE_SERIAL_KEY 환경 변수가 설정되지 않았습니다.");
  }

  const response = await fetch(`${API_BASE}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      serial_key: serialKey,
      client_version: "1.0.0",
      os_type: "Windows",
      os_build: "10",
      architecture: "x64"
    })
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`토큰 발급 실패 (${response.status}): ${text}`);
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("토큰 발급 응답을 JSON으로 해석할 수 없습니다.");
  }

  const token = data.api_token || data.access_token;

  if (!token) {
    throw new Error("등록 응답에 api_token 또는 access_token이 없습니다.");
  }

  return token;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 허용됩니다." });
  }

  try {
    const { image, mode } = req.body || {};

    if (typeof image !== "string" || !image.trim()) {
      return res.status(400).json({
        error: "image 필드에 Base64 이미지가 필요합니다."
      });
    }

    const allowedModes = ["read-main", "summarize"];

    if (!allowedModes.includes(mode)) {
      return res.status(400).json({
        error: "mode는 read-main 또는 summarize여야 합니다."
      });
    }

    const token = await getApiToken();

    const response = await fetch(`${API_BASE}/v2/inference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        image,
        mode,
        language: "ko-kr",
        provider: "default",
        do_use_omniparser: false
      })
    });

    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "분석 API가 JSON이 아닌 응답을 반환했습니다.",
        detail: text.slice(0, 1000)
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: "분석 작업 접수에 실패했습니다.",
        detail: data
      });
    }

    if (!data.task_id) {
      return res.status(502).json({
        error: "분석 API 응답에 task_id가 없습니다.",
        detail: data
      });
    }

    return res.status(202).json({
      task_id: data.task_id,
      status: data.status || "PENDING"
    });
  } catch (error) {
    console.error("ReadVoice proxy error:", error);

    return res.status(502).json({
      error: "나라리드보이스 API 요청에 실패했습니다.",
      detail: error.message
    });
  }
}
