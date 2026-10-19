
const API_BASE = "https://api.readvoice.naraai.net";

// Vercel 함수가 유지되는 동안 토큰 재사용
let cachedToken = null;
let tokenExpiresAt = 0;
let tokenPromise = null;

async function getApiToken() {
    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    // 동시에 여러 요청이 들어오면 토큰 발급 요청을 하나로 합침
    if (tokenPromise) {
        return tokenPromise;
    }

    tokenPromise = (async () => {
        const serialKey = "SK-YG64Z-CKVKX-7RAFA";

        if (!serialKey) {
            throw new Error("READVOICE_SERIAL_KEY 환경 변수가 설정되지 않았습니다.");
        }

        const response = await fetch(`${API_BASE}/v1/auth/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                serial_key: serialKey,
                client_version: "1.0.0",
                os: "Windows",
                os_type: "Windows",
                os_build: "10",
                architecture: "x64"
            })
        });

        const body = await response.text();

        if (!response.ok) {
            console.error("ReadVoice token registration failed:", {
                status: response.status,
                body: body.slice(0, 1000)
            });
            throw new Error(`토큰 발급 실패 (HTTP ${response.status})`);
        }

        let data;
        try {
            data = JSON.parse(body);
        } catch {
            throw new Error("토큰 발급 응답이 JSON 형식이 아닙니다.");
        }

        const token = data.api_token || data.access_token;

        if (!token) {
            console.error("Token missing in registration response:", data);
            throw new Error("토큰 발급 응답에 api_token 또는 access_token이 없습니다.");
        }

        cachedToken = token;

        // 토큰 만료 정보를 API가 제공하면 반영, 없으면 5분 후 재발급
        const expiresIn = Number(data.expires_in);
        const cacheMs = Number.isFinite(expiresIn) && expiresIn > 0
            ? Math.max(10000, (expiresIn - 30) * 1000)
            : 5 * 60 * 1000;

        tokenExpiresAt = Date.now() + cacheMs;

        return cachedToken;
    })();

    try {
        return await tokenPromise;
    } finally {
        tokenPromise = null;
    }
}

async function authorizedFetch(url, options = {}) {
    let token = await getApiToken();

    const send = (bearer) => fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            "Authorization": `Bearer ${bearer}`,
            "Accept": "application/json"
        },
        cache: "no-store"
    });

    let response = await send(token);

    // 토큰 만료 가능성이 있는 401이면 한 번 재발급하여 재시도
    if (response.status === 401) {
        cachedToken = null;
        tokenExpiresAt = 0;
        token = await getApiToken();
        response = await send(token);
    }

    return response;
}

async function createInference({
    image,
    mode = "summarize",
    language = "ko-kr",
    provider = "default",
    do_use_omniparser = false
}) {
    if (!image || typeof image !== "string") {
        throw new Error("이미지 데이터가 없습니다.");
    }

    if (!["read-main", "summarize"].includes(mode)) {
        throw new Error("지원하지 않는 분석 모드입니다.");
    }

    const response = await authorizedFetch(`${API_BASE}/v2/inference`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            image,
            mode,
            language,
            provider,
            do_use_omniparser
        })
    });

    const body = await response.text();

    if (!response.ok) {
        console.error("V2 inference failed:", {
            status: response.status,
            body: body.slice(0, 1000)
        });
        throw new Error(`ReadVoice API HTTP ${response.status}: ${body.slice(0, 800)}`);
    }

    let data;
    try {
        data = JSON.parse(body);
    } catch {
        throw new Error("V2 분석 응답이 JSON 형식이 아닙니다.");
    }

    if (!data.task_id) {
        throw new Error("V2 응답에 task_id가 없습니다.");
    }

    return {
        task_id: data.task_id,
        status: data.status || "PENDING"
    };
}

async function getInferenceTask(taskId) {
    if (!taskId || typeof taskId !== "string") {
        throw new Error("task_id가 없습니다.");
    }

    const response = await authorizedFetch(
        `${API_BASE}/v2/tasks/${encodeURIComponent(taskId)}`,
        { method: "GET" }
    );

    const body = await response.text();

    if (!response.ok) {
        console.error("V2 task query failed:", {
            status: response.status,
            body: body.slice(0, 1000)
        });
        throw new Error(`작업 조회 API HTTP ${response.status}: ${body.slice(0, 800)}`);
    }

    try {
        return JSON.parse(body);
    } catch {
        throw new Error("V2 작업 조회 응답이 JSON 형식이 아닙니다.");
    }
}

module.exports = {
    getApiToken,
    createInference,
    getInferenceTask
};
