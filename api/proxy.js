
const API_BASE = "https://api.readvoice.naraai.net";

const SERIAL_KEY = "SK-YG64Z-CKVKX-7RAFA";

// API 토큰 발급
async function getApiToken() {
  const serialKey = SERIAL_KEY;

  if (!serialKey || serialKey === "YOUR_SERIAL_KEY_HERE") {
    throw new Error("시리얼 키를 코드에 입력해주세요.");
  }

  const registerResponse = await fetch(
    `${API_BASE}/v1/auth/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        serial_key: serialKey,
        client_version: "1.0.0",
        os_type: "Windows",
        os_build: "10",
        architecture: "x64"
      })
    }
  );

  const text = await registerResponse.text();

  if (!registerResponse.ok) {
    throw new Error(
      `토큰 발급 실패 (${registerResponse.status}): ${text}`
    );
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      "토큰 발급 응답을 JSON으로 해석할 수 없습니다."
    );
  }

  const token = data.api_token || data.access_token;

  if (!token) {
    throw new Error(
      "등록 응답에 api_token 또는 access_token이 없습니다."
    );
  }

  return token;
}

// Vercel API Handler
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST만 허용됩니다."
    });
  }

  try {
    const { image, mode } = req.body || {};

    // 이미지 확인
    if (typeof image !== "string" || !image.trim()) {
      return res.status(400).json({
        error: "image 필드에 Base64 이미지가 필요합니다."
      });
    }

    // 분석 모드 확인
    const allowedModes = ["read-main", "summarize"];

    if (!allowedModes.includes(mode)) {
      return res.status(400).json({
        error: "mode는 read-main 또는 summarize여야 합니다."
      });
    }

    // 토큰 발급
    const token = await getApiToken();

    // 신규 v2 분석 API 요청
    const response = await fetch(
      `${API_BASE}/v2/inference`,
      {
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
      }
    );

    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({
        error: "분석 API가 JSON이 아닌 응답을 반환했습니다.",
        detail: responseText.slice(0, 1000)
      });
    }

    // 분석 요청 실패
    if (!response.ok) {
      return res.status(response.status).json({
        error: "분석 작업 접수에 실패했습니다.",
        detail: data
      });
    }

    // 작업 ID 확인
    if (!data.task_id) {
      return res.status(502).json({
        error: "분석 API 응답에 task_id가 없습니다.",
        detail: data
      });
    }

    // 작업 ID 반환
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
