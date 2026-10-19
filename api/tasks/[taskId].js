
import { getInferenceTask } from "../../lib/readvoice.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const taskId = req.query?.taskId;

    if (!taskId || Array.isArray(taskId)) {
      return res.status(400).json({
        error: "task_id가 올바르지 않습니다.",
      });
    }

    const task = await getInferenceTask(taskId);

    return res.status(200).json(task);
  } catch (error) {
    console.error("V2 task lookup error:", error);

    return res.status(502).json({
      error: error.message || "V2 작업 조회에 실패했습니다.",
    });
  }
}
