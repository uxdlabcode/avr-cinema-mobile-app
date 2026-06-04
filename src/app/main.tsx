import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "@/index.css";
import { Provider } from "react-redux";
import { store } from "@/store";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
        <App />
        <Toaster position="top-right" />
      </ThemeProvider>
    </BrowserRouter>
  </Provider>
);
