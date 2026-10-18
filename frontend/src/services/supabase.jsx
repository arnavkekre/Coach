import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

supabase.auth.getUser = async () => {
  const oidcStorage = Object.keys(sessionStorage).find((key) =>
    key.startsWith("oidc.user:")
  );

  if (oidcStorage) {
    try {
      const oidcUser = JSON.parse(sessionStorage.getItem(oidcStorage));
      if (oidcUser?.profile?.sub) {
        return {
          data: {
            user: {
              id: oidcUser.profile.sub,
              email: oidcUser.profile.email,
            },
          },
          error: null,
        };
      }
    } catch (e) {
      console.error("Cognito bridge error:", e);
    }
  }

  return { data: { user: null }, error: new Error("Not logged in") };
};
