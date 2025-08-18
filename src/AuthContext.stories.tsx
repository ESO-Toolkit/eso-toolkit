import React from "react";
import { AuthProvider } from "./AuthContext";

export default {
  title: "AuthContext/AuthProvider",
  component: AuthProvider,
};

export const Default = () => <AuthProvider>Auth Context Example</AuthProvider>;
