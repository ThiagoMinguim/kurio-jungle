import { ErrorPage } from "./components/error-page";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "./lib/query";
import { SessionProvider } from "./app/session";
import "./styles.css";
async function start() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== "false") {
    const { startMocks } = await import("./mocks/browser");
    await startMocks();
  }
  const { router } = await import("./app/router");
  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>,
  );
}
void start().catch((error) => {
  console.error(error);
  createRoot(document.getElementById("root")!).render(<ErrorPage />);
});
