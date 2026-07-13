import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import ThemeApplier from "@/theme/ThemeApplier";

export default function App() {
  return (
    <>
      <ThemeApplier />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </>
  );
}
