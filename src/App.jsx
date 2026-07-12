import { Routes, Route } from "react-router-dom";
import Menu from "./Menu";
import Tetris from "./games/tetris/Tetris";
import Tennis from "./games/tennis/Tennis";

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/tetris" element={<Tetris />} />
        <Route path="/tennis" element={<Tennis />} />
      </Routes>
    </div>
  );
}
