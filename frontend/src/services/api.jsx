import axios from "axios";

const getBaseURL = () => {
  // 1. Explicit Custom Environment Variable (Used by Azure SWA build)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 2. Azure Static Web Apps Fallback (Guarantees Azure never breaks)
  if (typeof window !== "undefined" && window.location.hostname.includes("azurestaticapps.net")) {
    return "https://arnav-coach-student-2026-hzbeh5epchg8g8ec.indiasouthcentral-01.azurewebsites.net";
  }

  // 3. AWS Production (AWS Amplify / CloudFront relative reverse proxy)
  if (import.meta.env.PROD) {
    return "/api";
  }

  // 4. Local Development
  return "http://localhost:8000";
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// AWS Cognito OIDC Bearer Token Interceptor
api.interceptors.request.use((config) => {
  const oidcStorage = Object.keys(sessionStorage).find((key) =>
    key.startsWith("oidc.user:")
  );

  if (oidcStorage) {
    try {
      const user = JSON.parse(sessionStorage.getItem(oidcStorage));
      if (user?.id_token) {
        config.headers.Authorization = `Bearer ${user.id_token}`;
      }
    } catch (e) {
      console.error("Failed to parse Cognito session in API interceptor", e);
    }
  }

  return config;
});

export default api;
