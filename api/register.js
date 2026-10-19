
const API_BASE = "https://api.readvoice.naraai.net";

// 시리얼 키를 코드에 직접 입력
const SERIAL_KEY = "SK-YG64Z-CKVKX-7RAFA";

let cachedToken = null;
let tokenExpiresAt = 0;
let tokenPromise = null;

async function getApiToken(forceRefresh = false) {
    if (forceRefresh) {
        cachedToken = null;
        tokenExpiresAt = 0;
    }

    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    if (tokenPromise) {
        return tokenPromise;
    }

    tokenPromise = (async () => {
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
            })
        });

        const body = await response.text();

        if (!response.ok) {
            throw new Error(
                `토큰 발급 실패 (HTTP ${response.status}): ${body.slice(0, 800)}`
            );
        }

        let data;
        try {
            data = JSON.parse(body);
        } catch {
            throw new Error("토큰 발급 응답이 JSON 형식이 아닙니다.");
        }

        const token = data.api_token || data.access_token;

        if (!token) {
            throw new Error(
                `토큰 발급 응답에 api_token 또는 access_token이 없습니다: ${body.slice(0, 500)}`
            );
        }

        cachedToken = token;

        const expiresIn = Number(data.expires_in);
        const cacheMs =
            Number.isFinite(expiresIn) && expiresIn > 30
                ? (expiresIn - 30) * 1000
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

    const send = (bearer) => {
        const headers = {
            ...(options.headers || {}),
            Authorization: `Bearer ${bearer}`,
            Accept: "application/json"
        };

        return fetch(url, {
            ...options,
            headers,
            cache: "no-store"
        });
    };

    let response = await send(token);

    if (response.status === 401) {
        // 인증 실패 시 토큰을 다시 발급받고 한 번 재시도
        const errorBody = await response.text();
        console.error("V2 인증 실패, 토큰 재발급 후 재시도:", errorBody);

        token = await getApiToken(true);
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

    const response = await authorizedFetch(
        `${API_BASE}/v2/inference`,
        {
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
        }
    );

    const body = await response.text();

    if (!response.ok) {
        throw new Error(
            `ReadVoice API HTTP ${response.status}: ${body.slice(0, 800)}`
        );
    }

    let data;
    try {
        data = JSON.parse(body);
    } catch {
        throw new Error("V2 분석 응답이 JSON 형식이 아닙니다.");
    }

    if (!data.task_id) {
        throw new Error(`V2 응답에 task_id가 없습니다: ${body.slice(0, 500)}`);
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
        {
            method: "GET"
        }
    );

    const body = await response.text();

    if (!response.ok) {
        throw new Error(
            `작업 조회 API HTTP ${response.status}: ${body.slice(0, 800)}`
        );
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
