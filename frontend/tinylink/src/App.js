
import "./App.css";

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

import Stats from "./pages/Stats";
import DashBoard from "./pages/DashBoard";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Navbar />

        <Routes>
          <Route path="/" element={<DashBoard />} />
          <Route path="/code/:code" element={<Stats />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
