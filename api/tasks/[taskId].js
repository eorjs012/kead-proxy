

const API_BASE = "https://api.readvoice.naraai.net";

const SERIAL_KEY = "SK-YG64Z-CKVKX-7RAFA";

async function getApiToken() {
  const registerResponse = await fetch(
    `${API_BASE}/v1/auth/register`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        serial_key: SERIAL_KEY,
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
    throw new Error("토큰 발급 응답이 JSON 형식이 아닙니다.");
  }

  const token = data.api_token || data.access_token;

  if (!token) {
    throw new Error("등록 응답에 API 토큰이 없습니다.");
  }

  return token;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "GET 요청만 허용됩니다."
    });
  }

  try {
    const taskId = req.query.taskId;

    if (
      typeof taskId !== "string" ||
      !taskId.trim()
    ) {
      return res.status(400).json({
        error: "taskId가 필요합니다."
      });
    }

    const token = await getApiToken();

    const response = await fetch(
      `${API_BASE}/v2/tasks/${encodeURIComponent(taskId)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: "작업 조회 API가 JSON이 아닌 응답을 반환했습니다.",
        detail: text.slice(0, 1000)
      });
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: "분석 결과 조회에 실패했습니다.",
        detail: data
      });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("ReadVoice task error:", error);

    return res.status(502).json({
      error: "분석 결과를 가져오지 못했습니다.",
      detail: error.message
    });
  }
}
