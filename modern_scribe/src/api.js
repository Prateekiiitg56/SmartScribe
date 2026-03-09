const API_BASE = "http://localhost:8000/api";

export const apiCall = async (endpoint, options = {}) => {
    const token = localStorage.getItem("token");

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // Token is invalid or expired — clear everything and force re-login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.reload();
        return;
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "Request failed");
    }

    return response.json();
};
