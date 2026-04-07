export default async function handler(req, res) {
    try {
        const response = await fetch("http://121.161.240.244:58081/api/v1/screen/stream-analysis", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
                // 🔥 Authorization 제거
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.text();

        res.status(200).send(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
