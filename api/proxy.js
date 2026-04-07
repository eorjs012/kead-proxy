export default async function handler(req, res) {
    // CORS 허용
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        const response = await fetch("http://121.161.240.244:58081/api/v1/screen/stream-analysis", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
                // 인증 제거
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.text();

        res.status(200).send(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
