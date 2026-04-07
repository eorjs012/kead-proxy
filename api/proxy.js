export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        let body = req.body;

        // body 비어있을 때 처리
        if (!body || Object.keys(body).length === 0) {
            const buffers = [];
            for await (const chunk of req) {
                buffers.push(chunk);
            }
            body = JSON.parse(Buffer.concat(buffers).toString());
        }

        
        const API_KEY = "SK-97Q26-U7KZZ-G85CY";

        const response = await fetch("http://121.161.240.244:58081/api/v1/screen/stream-analysis", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                
                "Authorization": "Bearer " + API_KEY
            },
            body: JSON.stringify(body)
        });

        const data = await response.text();

        res.status(200).send(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
