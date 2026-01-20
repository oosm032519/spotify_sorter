import { ExternalLink, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Track } from "../logic/types";

export default function AudioPlayer({ track }: { track: Track }) {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [playing, setPlaying] = useState(false);

	const togglePlay = (e: React.MouseEvent) => {
		e.stopPropagation(); // Don't trigger choice
		if (!audioRef.current) return;

		if (playing) {
			audioRef.current.pause();
		} else {
			// Pause others? Ideally yes.
			document.querySelectorAll("audio").forEach((el) => {
				if (el !== audioRef.current) {
					el.pause();
					// Reset state of other components? Hard without context.
					// For now, simple local toggle.
				}
			});
			audioRef.current.play();
		}
		setPlaying(!playing);
	};

	// Auto-stop when track changes
	useEffect(() => {
		setPlaying(false);
		if (audioRef.current) {
			audioRef.current.pause();
			audioRef.current.currentTime = 0;
		}
	}, [track.id]);

	if (!track.previewUrl) {
		return (
			<a
				href={track.externalUrl}
				target="_blank"
				rel="noreferrer"
				onClick={(e) => e.stopPropagation()}
				className="flex items-center gap-2 text-green-500 text-sm hover:underline mt-2"
			>
				<ExternalLink size={14} /> Open in Spotify
			</a>
		);
	}

	return (
		<div className="mt-2 text-green-500">
			<audio
				ref={audioRef}
				src={track.previewUrl}
				onEnded={() => setPlaying(false)}
			/>
			<button
				onClick={togglePlay}
				className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 px-4 py-2 rounded-full transition-colors"
			>
				{playing ? (
					<Pause size={18} fill="currentColor" />
				) : (
					<Play size={18} fill="currentColor" />
				)}
				<span className="font-medium text-sm">Preview</span>
			</button>
		</div>
	);
}
