
const API_BASE = "https://api.readvoice.naraai.net";

/**
 * V2 분석 요청
 * POST /v2/inference
 */
export async function createInference({
  image,
  mode = "summarize",
  language = "ko-kr",
  provider = "default",
  do_use_omniparser = false,
}) {
  if (!image || typeof image !== "string") {
    throw new Error("이미지 데이터가 없습니다.");
  }

  if (!["read-main", "summarize"].includes(mode)) {
    throw new Error("지원하지 않는 분석 모드입니다.");
  }

  const response = await fetch(`${API_BASE}/v2/inference`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      image,
      mode,
      language,
      provider,
      do_use_omniparser,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
      data.message ||
      `V2 분석 요청 실패: HTTP ${response.status}`
    );
  }

  if (!data.task_id) {
    throw new Error("API 응답에 task_id가 없습니다.");
  }

  return {
    task_id: data.task_id,
    status: data.status || "PENDING",
  };
}

/**
 * V2 분석 작업 조회
 * GET /v2/tasks/{task_id}
 */
export async function getInferenceTask(taskId) {
  if (!taskId || typeof taskId !== "string") {
    throw new Error("task_id가 없습니다.");
  }

  const response = await fetch(
    `${API_BASE}/v2/tasks/${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
      data.message ||
      `V2 작업 조회 실패: HTTP ${response.status}`
    );
  }

  return data;
}
