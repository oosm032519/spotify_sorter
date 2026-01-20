import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AudioPlayer from "../components/AudioPlayer";
import {
	deserializeState,
	handleDecision,
	initializeSort,
	serializeState,
} from "../logic/fordJohnson";
import type { AlgorithmState, Track } from "../logic/types";
import { createPlaylist, getAllPlaylistTracks } from "../services/api";

export default function Comparator() {
	const location = useLocation();
	const navigate = useNavigate();

	const [loading, setLoading] = useState(true);
	const [loadingMessage, setLoadingMessage] = useState("Initializing...");
	const [sortState, setSortState] = useState<AlgorithmState | null>(null);
	const [tracks, setTracks] = useState<Track[]>([]);
	const [playlistId, setPlaylistId] = useState<string | null>(null);
	const [resultLink, setResultLink] = useState<string | null>(null);

	// Persistence Key
	const STORAGE_KEY = "spotify_sorter_session";

	// Initialization
	useEffect(() => {
		const init = async () => {
			// Check for saved session
			const saved = localStorage.getItem(STORAGE_KEY);

			if (saved === "active") {
				if (location.state?.playlistId) {
					// New session requested, overwrite
					localStorage.removeItem(STORAGE_KEY);
					startNewSession(location.state.playlistId);
				} else {
					// Resume
					try {
						const savedStateStr = localStorage.getItem(STORAGE_KEY + "_state");
						const savedPid = localStorage.getItem(STORAGE_KEY + "_pid");
						const savedTracksStr = localStorage.getItem(
							STORAGE_KEY + "_tracks",
						);

						if (savedStateStr && savedPid && savedTracksStr) {
							const restoredState = deserializeState(savedStateStr);
							const restoredTracks = JSON.parse(savedTracksStr);

							setSortState(restoredState);
							setPlaylistId(savedPid);
							setTracks(restoredTracks);
							setLoading(false);
						} else {
							// Corrupt
							navigate("/dashboard");
						}
					} catch (e) {
						console.error("Resume error", e);
						navigate("/dashboard");
					}
				}
			} else {
				// No session
				if (location.state?.playlistId) {
					startNewSession(location.state.playlistId);
				} else {
					navigate("/dashboard");
				}
			}
		};
		init();
	}, [location, navigate]);

	const startNewSession = async (pid: string) => {
		setPlaylistId(pid);
		setLoading(true);
		setLoadingMessage(
			"Fetching tracks... (This may take a while for large playlists)",
		);

		try {
			const allTracks = await getAllPlaylistTracks(pid);
			setTracks(allTracks);

			setLoadingMessage("Initializing Sorter...");
			const initialState = initializeSort(allTracks);
			setSortState(initialState);
			setLoading(false);

			saveSession(initialState, pid, allTracks);
		} catch (err) {
			console.error(err);
			alert("Failed to load playlist");
			navigate("/dashboard");
		}
	};

	const saveSession = (
		state: AlgorithmState,
		pid: string,
		tracksList: Track[],
	) => {
		localStorage.setItem(STORAGE_KEY, "active");
		localStorage.setItem(STORAGE_KEY + "_state", serializeState(state));
		localStorage.setItem(STORAGE_KEY + "_pid", pid);
		localStorage.setItem(STORAGE_KEY + "_tracks", JSON.stringify(tracksList));
	};

	// Keyboard Support
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (!sortState || sortState.phase === "COMPLETED" || loading) return;
			if (e.key === "ArrowLeft") handleChoice("left");
			if (e.key === "ArrowRight") handleChoice("right");
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [sortState, loading]);

	const handleChoice = (side: "left" | "right") => {
		if (!sortState || !sortState.currentPair || !playlistId) return;

		const winnerId =
			side === "left"
				? sortState.currentPair.left.id
				: sortState.currentPair.right.id;

		try {
			const nextState = handleDecision(sortState, winnerId);
			setSortState(nextState);

			// Auto-save
			saveSession(nextState, playlistId, tracks);

			if (nextState.phase === "COMPLETED") {
				finishSorting(nextState);
			}
		} catch (e) {
			console.error("Decision Error", e);
		}
	};

	const finishSorting = async (finalState: AlgorithmState) => {
		setLoading(true);
		setLoadingMessage("Creating your sorted playlist...");

		try {
			const profile = await import("../services/api").then((m) =>
				m.getUserProfile(),
			);

			const trackIds = finalState.mainChain.map((t) => t.id);
			const originalName = "Sorted Playlist";

			const playlist = await createPlaylist(
				profile.id,
				`${originalName} - ${new Date().toLocaleDateString()}`,
				trackIds,
			);

			localStorage.removeItem(STORAGE_KEY);
			localStorage.removeItem(STORAGE_KEY + "_state");
			localStorage.removeItem(STORAGE_KEY + "_pid");
			localStorage.removeItem(STORAGE_KEY + "_tracks");

			setResultLink(playlist.external_urls.spotify);
			setLoading(false);
		} catch (err) {
			console.error(err);
			setLoadingMessage("Failed to save playlist. (Check console for error)");
		}
	};

	if (resultLink) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center">
				<h2 className="text-3xl font-bold text-green-500">Sorting Complete!</h2>
				<p>Your playlist has been created.</p>
				<a
					href={resultLink}
					target="_blank"
					rel="noreferrer"
					className="bg-green-500 text-black px-8 py-3 rounded-full font-bold text-xl hover:bg-green-400 transition"
				>
					Open in Spotify
				</a>
				<button
					onClick={() => navigate("/dashboard")}
					className="underline text-zinc-400"
				>
					Back to Dashboard
				</button>
			</div>
		);
	}

	if (loading || !sortState) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[50vh]">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
				<p className="text-zinc-400">{loadingMessage}</p>
			</div>
		);
	}

	const { currentPair } = sortState;

	if (!currentPair) return <div>Something went wrong. State invalid.</div>;

	return (
		<div className="h-full w-full max-w-4xl flex flex-col items-center gap-4">
			{/* Progress Bar */}
			<div className="w-full text-center">
				<div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
					<div
						className="h-full bg-green-500 transition-all duration-500"
						style={{
							width: `${(sortState.mainChain.length / tracks.length) * 100}%`,
						}}
					></div>
				</div>
				<p className="text-zinc-500 text-sm">
					Progress: {sortState.phase} phase
				</p>
			</div>

			<h2 className="text-xl text-zinc-300">Which song do you prefer?</h2>

			<div className="flex-1 min-h-0 w-full flex flex-col md:grid md:grid-cols-2 gap-4">
				<div className="flex-1 min-h-0 w-full">
					<ChoiceCard
						track={currentPair.left}
						onClick={() => handleChoice("left")}
						shortcut="Left Arrow"
					/>
				</div>
				<div className="flex-1 min-h-0 w-full">
					<ChoiceCard
						track={currentPair.right}
						onClick={() => handleChoice("right")}
						shortcut="Right Arrow"
					/>
				</div>
			</div>

			<div className="flex gap-4">
				<button className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300">
					<RotateCcw size={16} /> Undo
				</button>
			</div>
		</div>
	);
}

function ChoiceCard({
	track,
	onClick,
	shortcut,
}: {
	track: Track;
	onClick: () => void;
	shortcut: string;
}) {
	return (
		<div
			onClick={onClick}
			className="h-full bg-zinc-800 rounded-xl p-4 md:p-6 flex flex-col items-center gap-4 cursor-pointer hover:bg-zinc-700 active:scale-95 md:hover:scale-105 transition-all group border-2 border-transparent hover:border-green-500/50"
		>
			<div className="flex-1 min-h-0 w-full bg-zinc-900 rounded-lg overflow-hidden relative shadow-lg">
				{track.imageUrl ? (
					<img
						src={track.imageUrl}
						alt={track.name}
						className="w-full h-full object-contain"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center text-zinc-600">
						No Art
					</div>
				)}
			</div>

			<div className="text-center">
				<h3 className="font-bold text-lg text-white mb-1">{track.name}</h3>
				<p className="text-zinc-400">{track.artist}</p>
			</div>

			<AudioPlayer track={track} />

			<span className="hidden md:inline-block text-xs bg-zinc-900 px-2 py-1 rounded text-zinc-500 mt-2 border border-zinc-700">
				Press {shortcut}
			</span>
		</div>
	);
}
