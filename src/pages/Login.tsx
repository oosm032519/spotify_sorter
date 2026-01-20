import { Music } from "lucide-react";
import { redirectToSpotify } from "../services/auth";

export default function Login() {
	const handleLogin = () => {
		redirectToSpotify();
	};

	return (
		<div className="flex flex-col items-center gap-8">
			<div className="flex items-center gap-4 text-green-500">
				<Music size={64} />
				<h1 className="text-4xl font-bold text-white">Spotify Sorter</h1>
			</div>
			<p className="text-zinc-400 max-w-md text-center">
				Sort your playlists using the Ford-Johnson algorithm for minimal
				comparisons based on your personal taste.
			</p>

			<button
				onClick={handleLogin}
				className="bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-8 rounded-full transition-colors text-lg"
			>
				Login with Spotify
			</button>
		</div>
	);
}
