
const { getApiToken } = require("../lib/readvoice.js");

module.exports = async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "no-store");

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    if (req.method !== "GET") {
        return res.status(405).json({
            error: "GET만 허용됩니다."
        });
    }

    try {
        await getApiToken();

        return res.status(200).json({
            registered: true,
            message: "ReadVoice 인증에 성공했습니다."
        });
    } catch (error) {
        console.error("[Register test] failed:", error.message);

        return res.status(502).json({
            registered: false,
            error: error.message
        });
    }
};
