import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Callback from "./pages/Callback";
import Comparator from "./pages/Comparator";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

function App() {
	return (
		<BrowserRouter>
			<div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-4">
				<Routes>
					<Route path="/" element={<Login />} />
					<Route path="/callback" element={<Callback />} />
					<Route path="/dashboard" element={<Dashboard />} />
					<Route path="/sort" element={<Comparator />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</div>
		</BrowserRouter>
	);
}

export default App;
