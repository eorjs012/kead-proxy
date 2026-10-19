
const { getInferenceTask } = require("../../lib/readvoice.js");

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
        const taskId = req.query.taskId;

        if (!taskId || typeof taskId !== "string") {
            return res.status(400).json({
                error: "task_id가 없거나 올바르지 않습니다."
            });
        }

        console.log("[Vercel] 작업 조회 요청:", {
            task_id: taskId
        });

        const task = await getInferenceTask(taskId);

        return res.status(200).json(task);

    } catch (error) {
        console.error("V2 task query error:", error);

        return res.status(502).json({
            error: error.message || "작업 조회에 실패했습니다."
        });
    }
};
