import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppRouter } from "./routes/AppRouter";
import { PWAInstallPrompt } from "./components/pwa";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "var(--toast-bg)",
                color: "var(--toast-color)",
                border: "1px solid var(--toast-border)",
                boxShadow: "0 8px 24px -6px rgba(0, 0, 0, 0.25)",
                fontSize: "13px",
              },
            }}
          />
          <PWAInstallPrompt />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
