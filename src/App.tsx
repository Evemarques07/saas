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
