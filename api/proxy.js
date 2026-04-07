export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        
        const registerRes = await fetch("http://121.161.240.244:58081/api/v1/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                serial_key: "SK-S5FYY-G38M1-J8DW1",
                client_version: "1.0.0",
                os_type: "windows",
                os_build: "10",
                architecture: "x64"
            })
        });

        const registerData = await registerRes.json();
        const accessToken = registerData.access_token;

        if (!accessToken) {
            return res.status(500).json({ error: "토큰 발급 실패", registerData });
        }

        
        const analysisRes = await fetch("http://121.161.240.244:58081/api/v1/screen/stream-analysis", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + accessToken
            },
            body: JSON.stringify(req.body)
        });

        const result = await analysisRes.text();

        res.status(200).send(result);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
