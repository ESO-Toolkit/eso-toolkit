import React, { useState } from "react";
import { ApolloProvider } from "@apollo/client";
import { client } from "./esologsClient";
import { AuthProvider, useAuth } from "./AuthContext";
import { HashRouter, Routes, Route } from "react-router-dom";
import OAuthRedirect from "./OAuthRedirect";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  TextField,
  Button,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
} from "@mui/material";
// import OAuthRedirect from './OAuthRedirect';
import { Link as LinkIcon } from "@mui/icons-material";
import { setPkceCodeVerifier, CLIENT_ID, REDIRECT_URI } from "./auth";
import { useGetReportByCodeQuery } from "./graphql/generated";

type Fight = {
  id: string;
  name: string;
  start: string;
  end: string;
};

const MainApp: React.FC = () => {
  const [fights, setFights] = useState<Fight[]>([]);
  const [selectedFightIds, setSelectedFightIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [logUrl, setLogUrl] = useState<string>("");

  const { isLoggedIn, setAccessToken } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setAccessToken("");
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogUrl(e.target.value);
  };

  // Removed handleClientIdChange
  // PKCE helpers
  const generateCodeVerifier = () => {
    const array = new Uint32Array(32);
    window.crypto.getRandomValues(array);
    const verifier = Array.from(array, (dec) =>
      ("0" + dec.toString(16)).slice(-2),
    ).join("");
    localStorage.setItem("eso_code_verifier", verifier);
    return verifier;
  };

  const base64UrlEncode = (str: ArrayBuffer) => {
    const uint8 = new Uint8Array(str);
    let binary = "";
    for (let i = 0; i < uint8.byteLength; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    return btoa(binary)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return base64UrlEncode(digest);
  };
  const startPKCEAuth = async () => {
    setError(null);
    const verifier = generateCodeVerifier();
    setPkceCodeVerifier(verifier);
    const challenge = await generateCodeChallenge(verifier);
    const authUrl = `https://www.esologs.com/oauth/authorize?response_type=code&client_id=${CLIENT_ID}&code_challenge=${challenge}&code_challenge_method=S256&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    window.location.href = authUrl;
  };

  const extractReportId = (url: string) => {
    // Example: https://www.esologs.com/reports/dVZXRHYNCDWqLmbM
    const match = url.match(/reports\/([A-Za-z0-9]+)/);
    return match ? match[1] : "";
  };

  const { accessToken } = useAuth();
  const [fetchCode, setFetchCode] = useState<string>("");
  const {
    data,
    loading,
    error: gqlError,
    refetch,
  } = useGetReportByCodeQuery({
    variables: { code: fetchCode },
    skip: !fetchCode,
    context: {
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
      },
    },
  });

  const handleFetchLog = () => {
    if (!logUrl) {
      setError("Please provide the ESOLogs report URL.");
      return;
    }
    if (!accessToken) {
      setError("You must be logged in to fetch logs.");
      return;
    }
    setError(null);
    const reportId = extractReportId(logUrl);
    if (!reportId) {
      setError("Invalid ESOLogs report URL.");
      return;
    }
    setFetchCode(reportId);
    refetch({ code: reportId });
  };

  React.useEffect(() => {
    if (data && data.reportData?.report?.fights) {
      const fightsData = data.reportData.report.fights;
      const parsedFights: Fight[] = fightsData.map(
        (fight: any, idx: number) => ({
          id: String(fight.id ?? idx + 1),
          name: fight.name ?? `Fight ${idx + 1}`,
          start: String(fight.startTime ?? ""),
          end: String(fight.endTime ?? ""),
        }),
      );
      setFights(parsedFights);
      if (parsedFights.length === 0) {
        setError("No fights found in API response.");
      }
    } else if (gqlError) {
      setError("Failed to fetch or parse data from ESOLogs GraphQL API.");
      setFights([]);
    }
  }, [data, gqlError]);

  const handleFightSelect = (id: string) => {
    setSelectedFightIds((prev) =>
      prev.includes(id) ? prev.filter((fid) => fid !== id) : [...prev, id],
    );
  };

  return (
    <Container maxWidth="md">
      <AppBar position="static" color="primary" sx={{ mb: 4 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ESO Log Aggregator
          </Typography>
          {isLoggedIn && (
            <Button color="inherit" onClick={handleLogout} sx={{ ml: 2 }}>
              Logout
            </Button>
          )}
        </Toolbar>
      </AppBar>
      <Box sx={{ mt: 2, mb: 4 }}>
        {!isLoggedIn ? (
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={startPKCEAuth}
                disabled={loading}
                sx={{ minWidth: 180 }}
              >
                Login with ESO Logs
              </Button>
            </Box>
          </Paper>
        ) : (
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <TextField
                label="ESOLogs.com Log URL"
                variant="outlined"
                value={logUrl}
                onChange={handleUrlChange}
                fullWidth
                InputProps={{ startAdornment: <LinkIcon sx={{ mr: 1 }} /> }}
              />
              <Button
                variant="contained"
                color="secondary"
                onClick={handleFetchLog}
                disabled={loading || !logUrl}
                sx={{ minWidth: 180 }}
              >
                {loading ? <CircularProgress size={24} /> : "Load Log"}
              </Button>
            </Box>
          </Paper>
        )}
        {(error || gqlError) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error || gqlError?.message}
          </Alert>
        )}
        {isLoggedIn && fights.length > 0 && (
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Select Fights
            </Typography>
            <List>
              {fights.map((fight) => (
                <ListItem key={fight.id} divider>
                  <ListItemText
                    primary={fight.name}
                    secondary={`Time: ${fight.start} - ${fight.end}`}
                  />
                  <ListItemSecondaryAction>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedFightIds.includes(fight.id)}
                          onChange={() => handleFightSelect(fight.id)}
                          color="primary"
                        />
                      }
                      label="Select"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        )}
      </Box>
    </Container>
  );
};

// import OAuthRedirect from './OAuthRedirect';

const App: React.FC = () => (
  <ApolloProvider client={client}>
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/oauth-redirect" element={<OAuthRedirect />} />
          <Route path="/*" element={<MainApp />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  </ApolloProvider>
);

export default App;
