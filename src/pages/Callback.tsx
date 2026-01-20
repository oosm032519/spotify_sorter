import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getToken } from "../services/auth";

export default function Callback() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const code = searchParams.get("code");
		if (!code) {
			setError("No code provided");
			return;
		}

		getToken(code)
			.then(() => {
				navigate("/dashboard");
			})
			.catch((err) => {
				console.error(err);
				setError("Authentication failed");
			});
	}, [searchParams, navigate]);

	if (error) {
		return (
			<div className="text-red-500">
				<h2 className="text-xl font-bold">Error</h2>
				<p>{error}</p>
				<button onClick={() => navigate("/")} className="mt-4 underline">
					Return to Login
				</button>
			</div>
		);
	}

	return <div className="text-zinc-400 animate-pulse">Authenticating...</div>;
}
