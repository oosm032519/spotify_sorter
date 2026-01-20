const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI;
const SCOPES =
	"playlist-read-private playlist-modify-private playlist-modify-public";

export async function redirectToSpotify() {
	const codeVerifier = generateRandomString(128);
	const codeChallenge = await generateCodeChallenge(codeVerifier);

	localStorage.setItem("spotify_code_verifier", codeVerifier);

	const args = new URLSearchParams({
		response_type: "code",
		client_id: CLIENT_ID,
		scope: SCOPES,
		redirect_uri: REDIRECT_URI,
		code_challenge_method: "S256",
		code_challenge: codeChallenge,
	});

	window.location.href = "https://accounts.spotify.com/authorize?" + args;
}

export async function getToken(code: string): Promise<string> {
	const codeVerifier = localStorage.getItem("spotify_code_verifier");
	if (!codeVerifier) {
		throw new Error("No code verifier found");
	}

	const payload = {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: new URLSearchParams({
			client_id: CLIENT_ID,
			grant_type: "authorization_code",
			code,
			redirect_uri: REDIRECT_URI,
			code_verifier: codeVerifier,
		}),
	};

	const parsedBase = new URL(REDIRECT_URI);
	// If we are redirecting to localhost, we are likely in dev mode.
	// The token endpoint is https://accounts.spotify.com/api/token

	const body = await fetch("https://accounts.spotify.com/api/token", payload);
	const response = await body.json();

	if (response.access_token) {
		localStorage.setItem("spotify_access_token", response.access_token);
		if (response.refresh_token) {
			localStorage.setItem("spotify_refresh_token", response.refresh_token);
		}
		// Store expiry
		const now = new Date().getTime();
		const expiresAt = now + response.expires_in * 1000;
		localStorage.setItem("spotify_token_expires_at", expiresAt.toString());

		return response.access_token;
	} else {
		throw new Error("Failed to get token: " + JSON.stringify(response));
	}
}

export function getStoredToken(): string | null {
	const token = localStorage.getItem("spotify_access_token");
	const expiresAt = localStorage.getItem("spotify_token_expires_at");

	if (!token || !expiresAt) return null;

	if (new Date().getTime() > parseInt(expiresAt)) {
		// Token expired. We needs refresh logic, but simplified: return null to force login.
		return null;
	}
	return token;
}

// Helper functions for PKCE
function generateRandomString(length: number) {
	let text = "";
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	for (let i = 0; i < length; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

async function generateCodeChallenge(codeVerifier: string) {
	const data = new TextEncoder().encode(codeVerifier);
	const digest = await window.crypto.subtle.digest("SHA-256", data);
	return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}
