import { LogOut, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUserPlaylists } from "../services/api";

interface Playlist {
	id: string;
	name: string;
	images: { url: string }[];
	tracks: { total: number };
}

export default function Dashboard() {
	const navigate = useNavigate();
	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getUserPlaylists()
			.then((data) => {
				setPlaylists(data.items);
				setLoading(false);
			})
			.catch((err) => {
				console.error(err);
				// If error, redirect to login? Or just show error.
				if (err.message === "Unauthorized") navigate("/");
				setLoading(false);
			});
	}, [navigate]);

	const handleSelect = (id: string, total: number) => {
		// Navigate to sort page with state
		navigate("/sort", { state: { playlistId: id, totalTracks: total } });
	};

	const handleLogout = () => {
		localStorage.clear();
		navigate("/");
	};

	if (loading) {
		return <div className="text-zinc-400">Loading playlists...</div>;
	}

	return (
		<div className="w-full max-w-5xl p-6">
			<header className="flex justify-between items-center mb-8">
				<h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-600 bg-clip-text text-transparent">
					Select a Playlist
				</h1>
				<button
					onClick={handleLogout}
					className="text-zinc-400 hover:text-white flex items-center gap-2"
				>
					<LogOut size={20} /> Logout
				</button>
			</header>

			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				{playlists.map((playlist) => (
					<div
						key={playlist.id}
						onClick={() => handleSelect(playlist.id, playlist.tracks.total)}
						className="bg-zinc-800 rounded-lg p-4 cursor-pointer hover:bg-zinc-700 transition-all group hover:shadow-xl hover:shadow-green-900/20"
					>
						<div className="aspect-square bg-zinc-700 rounded-md mb-4 overflow-hidden relative">
							{playlist.images?.[0]?.url ? (
								<img
									src={playlist.images[0].url}
									alt={playlist.name}
									className="w-full h-full object-cover"
								/>
							) : (
								<div className="w-full h-full flex items-center justify-center text-zinc-500">
									No Image
								</div>
							)}
							<div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
								<Play className="text-white fill-white" size={48} />
							</div>
						</div>
						<h3 className="font-bold text-white truncate">{playlist.name}</h3>
						<p className="text-zinc-400 text-sm">
							{playlist.tracks.total} tracks
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
