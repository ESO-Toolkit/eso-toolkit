import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CircularProgress, Container, Typography } from "@mui/material";
import { getPkceCodeVerifier, CLIENT_ID } from "./auth";

const OAUTH_TOKEN_URL = "https://www.esologs.com/oauth/token"; // Adjust if needed
const OAuthRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const verifier = getPkceCodeVerifier();

    if (!code || !verifier) {
      setError("Missing code or PKCE verifier.");
      return;
    }

    const fetchToken = async () => {
      try {
        const body = new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: CLIENT_ID,
          code_verifier: verifier,
          redirect_uri: window.location.href + 'oauth-redirect',
        });
        const response = await fetch(OAUTH_TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });
        if (!response.ok) throw new Error("Token exchange failed");
        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);
        navigate("/");
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Unknown error");
        }
      }
    };
    fetchToken();
  }, [location, navigate]);

  return (
    <Container maxWidth="sm" style={{ textAlign: "center", marginTop: "4rem" }}>
      {error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <>
          <CircularProgress />
          <Typography>Exchanging authorization code for token...</Typography>
        </>
      )}
    </Container>
  );
};

export default OAuthRedirect;
