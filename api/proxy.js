
const { runInference } = require("../lib/readvoice.js");

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
        const {
            image,
            mode = "summarize",
            language = "ko-kr",
            provider = "local",
            do_use_omniparser = false
        } = req.body || {};

        if (!image || typeof image !== "string") {
            return res.status(400).json({
                error: "이미지 데이터가 없습니다."
            });
        }

        if (!["read-main", "summarize"].includes(mode)) {
            return res.status(400).json({
                error: "mode는 read-main 또는 summarize여야 합니다."
            });
        }

        console.log("[Vercel] 분석 시작:", {
            mode,
            language,
            provider,
            imageLength: image.length
        });

        const result = await runInference({
            image,
            mode,
            language,
            provider,
            do_use_omniparser,
            timeoutMs: 45000
        });

        console.log("[Vercel] 분석 완료:", {
            task_id: result.task_id,
            status: result.status
        });

        return res.status(200).json(result);
    } catch (error) {
        console.error("[Vercel] 분석 오류:", {
            message: error.message,
            statusCode: error.statusCode || null,
            apiCode: error.apiCode || null,
            requestId: error.requestId || null
        });

        const statusCode =
            error.statusCode === 504 ? 504 : 502;

        return res.status(statusCode).json({
            error: error.message || "분석 요청에 실패했습니다.",
            code: error.apiCode || null,
            request_id: error.requestId || null
        });
    }
};
