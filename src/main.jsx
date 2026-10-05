import CalendarRoot from "./components/CalendarRoot";
import "./lib/appearanceBootstrap";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import router from "./router";

import { ToastProvider } from "./components/Toast";
import { ConfirmProvider } from "./context/ConfirmContext";
import PwaExperience from "./components/pwa/PwaExperience";

import "./index.css";
import "./styles/responsive.css";
import "./styles/SadiqOrnamentsPro.css";
import "./styles/SadiqSurfaces.css";
import { applyAppAppearance } from "./lib/appearance";

applyAppAppearance();

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <CalendarRoot><RouterProvider
          router={router}
        /></CalendarRoot>
        <PwaExperience />
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>
);
