export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        const response = await fetch("http://121.161.240.244:58081/api/v1/auth/register", {
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

        const data = await response.text();

        res.status(200).send(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
