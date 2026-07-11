import { Routes, Route } from "react-router-dom";
import Menu from "./Menu";
import Tetris from "./games/tetris/Tetris";

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/tetris" element={<Tetris />} />
      </Routes>
    </div>
  );
}
