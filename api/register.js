
const { getApiToken } = require("../lib/readvoice.js");

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
        await getApiToken();

        return res.status(200).json({
            registered: true
        });
    } catch (error) {
        console.error("Registration error:", error);

        return res.status(502).json({
            error: error.message || "토큰 발급에 실패했습니다."
        });
    }
};
