
const API_BASE = "https://api.readvoice.naraai.net";

// 기존 프로젝트에서 사용하던 시리얼 키
const SERIAL_KEY = "SK-YG64Z-CKVKX-7RAFA";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readJson(response) {
    const body = await response.text();

    let data;
    try {
        data = JSON.parse(body);
    } catch {
        throw new Error(
            `JSON 응답이 아닙니다. HTTP ${response.status}: ${body.slice(0, 500)}`
        );
    }

    return { body, data };
}

async function getApiToken() {
    const response = await fetch(`${API_BASE}/v1/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            serial_key: SERIAL_KEY,
            client_version: "1.0.0",
            os: "Windows",
            os_type: "Windows",
            os_build: "10",
            architecture: "x64"
        }),
        cache: "no-store"
    });

    const { body, data } = await readJson(response);

    console.log("[AUTH] registration:", {
        status: response.status,
        hasToken: Boolean(data.api_token || data.access_token)
    });

    if (!response.ok) {
        throw new Error(
            `토큰 발급 실패 (HTTP ${response.status}): ${body.slice(0, 500)}`
        );
    }

    const token = data.api_token || data.access_token;

    if (!token) {
        throw new Error("인증 응답에 api_token 또는 access_token이 없습니다.");
    }

    return token;
}

async function apiFetch(url, token, options = {}) {
    return fetch(url, {
        ...options,
        headers: {
            "Accept": "application/json",
            ...(options.headers || {}),
            "Authorization": `Bearer ${token}`
        },
        cache: "no-store"
    });
}

async function createInference({
    image,
    mode = "summarize",
    language = "ko-kr",
    provider = "local",
    do_use_omniparser = false
}) {
    if (!image || typeof image !== "string") {
        throw new Error("이미지 데이터가 없습니다.");
    }

    if (!["read-main", "summarize"].includes(mode)) {
        throw new Error("지원하지 않는 분석 모드입니다.");
    }

    // 브라우저가 보낸 Data URL이라면 base64 본문만 전달
    const imageData = image.startsWith("data:")
        ? image.slice(image.indexOf(",") + 1)
        : image;

    if (!imageData) {
        throw new Error("이미지의 base64 데이터가 비어 있습니다.");
    }

    const token = await getApiToken();

    const response = await apiFetch(
        `${API_BASE}/v2/inference`,
        token,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                image: imageData,
                mode,
                language,
                provider,
                do_use_omniparser
            })
        }
    );

    const { body, data } = await readJson(response);

    console.log("[V2] inference submission:", {
        status: response.status,
        taskId: data.task_id || null,
        taskStatus: data.status || null,
        errorCode: data.error?.code || null
    });

    if (!response.ok) {
        throw new Error(
            `분석 요청 실패 (HTTP ${response.status}): ${body.slice(0, 800)}`
        );
    }

    if (!data.task_id || typeof data.task_id !== "string") {
        throw new Error(
            `분석 응답에 유효한 task_id가 없습니다: ${body.slice(0, 500)}`
        );
    }

    // 조회 시에도 같은 토큰을 전달
    return {
        taskId: data.task_id,
        token,
        initialStatus: data.status || "PENDING"
    };
}

async function getInferenceTask(taskId, token) {
    const url = `${API_BASE}/v2/tasks/${encodeURIComponent(taskId)}`;

    const response = await apiFetch(url, token, {
        method: "GET"
    });

    const { body, data } = await readJson(response);

    if (!response.ok) {
        const error = new Error(
            `작업 조회 실패 (HTTP ${response.status}): ${body.slice(0, 800)}`
        );

        error.statusCode = response.status;
        error.apiCode = data.error?.code || null;
        error.requestId = data.error?.request_id || null;

        throw error;
    }

    return data;
}

async function runInference({
    image,
    mode = "summarize",
    language = "ko-kr",
    provider = "local",
    do_use_omniparser = false,
    timeoutMs = 45000
}) {
    const { taskId, token, initialStatus } = await createInference({
        image,
        mode,
        language,
        provider,
        do_use_omniparser
    });

    console.log("[V2] polling started:", {
        taskId,
        initialStatus
    });

    const deadline = Date.now() + timeoutMs;
    let notFoundCount = 0;

    while (Date.now() < deadline) {
        await sleep(1000);

        let task;

        try {
            task = await getInferenceTask(taskId, token);
            notFoundCount = 0;
        } catch (error) {
            // 작업이 조회 시스템에 반영되는 지연을 제한적으로 허용
            if (
                error.statusCode === 404 &&
                error.apiCode === "TASK_NOT_FOUND" &&
                notFoundCount < 3
            ) {
                notFoundCount++;

                console.warn("[V2] task not found; retrying:", {
                    taskId,
                    attempt: notFoundCount,
                    requestId: error.requestId
                });

                continue;
            }

            throw error;
        }

        const status = String(task.status || "").toUpperCase();

        console.log("[V2] task status:", {
            taskId,
            status
        });

        if (["COMPLETED", "SUCCEEDED", "SUCCESS", "DONE"].includes(status)) {
            return {
                task_id: taskId,
                status: task.status,
                result: task.result ?? task
            };
        }

        if (["FAILED", "ERROR", "CANCELLED", "CANCELED"].includes(status)) {
            throw new Error(
                `분석 작업 실패 (${status}): ${
                    typeof task.error === "string"
                        ? task.error
                        : JSON.stringify(task.error || {})
                }`
            );
        }

        // PENDING / QUEUED / RUNNING 등은 계속 조회
    }

    const timeoutError = new Error(
        "분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요."
    );
    timeoutError.statusCode = 504;
    throw timeoutError;
}

module.exports = {
    getApiToken,
    createInference,
    getInferenceTask,
    runInference
};
