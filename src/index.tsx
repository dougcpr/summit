import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";

function App() {
  return <div className="p-4 font-display text-2xl">Summit</div>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
