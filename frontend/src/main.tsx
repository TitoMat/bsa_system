import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { AppProviders } from "./app/providers";
import { AuthBootstrap } from "./app/AuthBootstrap";
import { SessionExpiredNotice } from "./components/layout/SessionExpiredNotice";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AppProviders>
        <AuthBootstrap>
          <RouterProvider router={router} />
          <SessionExpiredNotice />
        </AuthBootstrap>
      </AppProviders>
    </ThemeProvider>
  </React.StrictMode>
);
