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
        // Token expired — clear storage and dispatch a clean logout event
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Dispatch a custom event so App.jsx can handle it without a jarring reload
        window.dispatchEvent(new CustomEvent("auth:logout"));
        throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Request failed" }));
        throw new Error(err.detail || "Request failed");
    }

    return response.json();
};
