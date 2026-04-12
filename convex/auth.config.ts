const authConfig = {
  providers: [
    {
      domain: "https://even-picture-87-staging.authkit.app",
      applicationID: process.env.WORKOS_CLIENT_ID || "",
    },
  ],
};

export default authConfig;
