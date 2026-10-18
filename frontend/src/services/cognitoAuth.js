export const cognitoAuthConfig = {
  authority: "https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_osgqy6Zz7",
  client_id: "hvvjaabmlr1m9u324ua7mkrlt",
  redirect_uri: window.location.origin,
  response_type: "code",
  scope: "phone openid email",
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

export const cognitoSignOut = (auth) => {
  const clientId = "hvvjaabmlr1m9u324ua7mkrlt";
  const logoutUri = window.location.origin;
  const cognitoDomain = "https://ap-south-1osgqy6zz7.auth.ap-south-1.amazoncognito.com";

  auth.removeUser();

  window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
};
