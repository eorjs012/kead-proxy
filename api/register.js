// api/register.js

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 허용됩니다." });
  }

  const serialKey = process.env.READVOICE_SERIAL_KEY;

  if (!serialKey) {
    return res.status(500).json({
      error: "Vercel 환경 변수 READVOICE_SERIAL_KEY가 설정되지 않았습니다."
    });
  }

  try {
    const response = await fetch(
      "https://api.readvoice.naraai.net/v1/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serial_key: serialKey,
          client_version: "1.0.0",
          os_type: "Windows",
          os_build: "10",
          architecture: "x64"
        })
      }
    );

    const body = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "토큰 발급에 실패했습니다.",
        detail: body
      });
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return res.status(502).json({
        error: "등록 API가 JSON이 아닌 응답을 반환했습니다."
      });
    }

    const token = data.api_token || data.access_token;

    if (!token) {
      return res.status(502).json({
        error: "등록 응답에 토큰이 없습니다."
      });
    }

    // 브라우저에 토큰을 반환하지 않음
    return res.status(200).json({ registered: true });
  } catch (error) {
    return res.status(502).json({
      error: "등록 API에 연결할 수 없습니다."
    });
  }
}
