import axios from "axios";

const getBaseURL = () => {
  // 1. Azure Static Web Apps or Custom Environment Variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 2. Production environments
  if (import.meta.env.PROD) {
    // If running behind AWS CloudFront reverse proxy
    if (typeof window !== "undefined" && window.location.hostname.includes("cloudfront.net")) {
      return "/api";
    }
    // AWS Elastic Beanstalk fallback
    return "http://coach-backend-env.eba-82exqwu5.ap-south-1.elasticbeanstalk.com";
  }

  // 3. Local Development (Coach without docker default)
  return "http://localhost:8000";
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// AWS Cognito OIDC Bearer Token Interceptor (from Coach without docker)
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
