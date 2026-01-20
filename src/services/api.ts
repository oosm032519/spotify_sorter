import type { Track } from "../logic/types";
import { getStoredToken } from "./auth";

const BASE_URL = "https://api.spotify.com/v1";

async function fetchWithRetry(
	url: string,
	options: RequestInit = {},
): Promise<Response> {
	const token = getStoredToken();
	if (!token) throw new Error("No access token");

	const headers = {
		...options.headers,
		Authorization: `Bearer ${token}`,
	};

	const response = await fetch(url, { ...options, headers });

	if (response.status === 429) {
		const retryAfter = response.headers.get("Retry-After");
		const waitSeconds = retryAfter ? parseInt(retryAfter) : 1;
		console.warn(`Rate limited. Waiting ${waitSeconds}s...`);

		await new Promise((resolve) => setTimeout(resolve, waitSeconds * 1000));
		return fetchWithRetry(url, options);
	}

	if (response.status === 401) {
		// Token expired?
		// TODO: Trigger logout or refresh
		throw new Error("Unauthorized");
	}

	// Check for other errors? Let caller handle 200/other?
	return response;
}

export async function getUserProfile() {
	const res = await fetchWithRetry(`${BASE_URL}/me`);
	if (!res.ok) throw new Error("Failed to fetch profile");
	return res.json();
}

export async function getUserPlaylists(limit = 20, offset = 0) {
	const res = await fetchWithRetry(
		`${BASE_URL}/me/playlists?limit=${limit}&offset=${offset}`,
	);
	if (!res.ok) throw new Error("Failed to fetch playlists");
	return res.json();
}

interface SpotifyTrackItem {
	track: {
		id: string;
		name: string;
		artists: { name: string }[];
		album: { images: { url: string }[] };
		preview_url: string | null;
		external_urls: { spotify: string };
		uri: string;
	};
}

export async function getAllPlaylistTracks(
	playlistId: string,
): Promise<Track[]> {
	let tracks: Track[] = [];
	let url = `${BASE_URL}/playlists/${playlistId}/tracks?limit=100`; // Max limit

	while (url) {
		const res = await fetchWithRetry(url);
		if (!res.ok) throw new Error("Failed to fetch tracks");

		const data = await res.json();

		const validTracks = data.items
			.filter((item: SpotifyTrackItem) => item.track && item.track.id) // Filter null/local tracks
			.map((item: SpotifyTrackItem) => ({
				id: item.track.id,
				name: item.track.name,
				artist: item.track.artists.map((a) => a.name).join(", "),
				imageUrl: item.track.album.images[0]?.url,
				previewUrl: item.track.preview_url,
				externalUrl: item.track.external_urls.spotify,
			}));

		tracks = [...tracks, ...validTracks];

		// Next page
		url = data.next;
	}

	return tracks;
}

export async function createPlaylist(
	userId: string,
	name: string,
	trackIds: string[],
) {
	// 1. Create Playlist
	const createRes = await fetchWithRetry(
		`${BASE_URL}/users/${userId}/playlists`,
		{
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: name,
				public: false, // Private
				description: "Sorted with Ford-Johnson algorithm",
			}),
		},
	);

	if (!createRes.ok) throw new Error("Failed to create playlist");
	const playlist = await createRes.json();

	// 2. Add Tracks (Batch 100)
	const uris = trackIds.map((id) => `spotify:track:${id}`);

	for (let i = 0; i < uris.length; i += 100) {
		const chunk = uris.slice(i, i + 100);
		await fetchWithRetry(`${BASE_URL}/playlists/${playlist.id}/tracks`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ uris: chunk }),
		});
	}

	return playlist;
}
