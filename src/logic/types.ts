export interface Track {
	id: string;
	name: string;
	artist: string;
	imageUrl?: string;
	previewUrl?: string | null;
	externalUrl?: string;
}

export type SortPhase = "PAIRING" | "RECURSION" | "INSERTION" | "COMPLETED";

export interface ComparisonPair {
	left: Track;
	right: Track;
}

export interface RoundInfo {
	roundId: number;
	losers: Track[];
	oddTrack: Track | null;
	pairings: Map<string, string>; // Loser ID -> Winner ID
	promotedWinners: Track[]; // The winners that passed to next round
}

export interface AlgorithmState {
	phase: SortPhase;

	// Ford-Johnson State
	mainChain: Track[]; // The sorted winners (S)
	recursionStack: RoundInfo[];

	// Pairing Phase State
	pairingPool: Track[]; // Tracks waiting to be paired in this round
	currentRoundWinners: Track[];
	currentRoundLosers: Track[];
	currentRoundPairings: Map<string, string>; // Loser -> Winner
	oddTrack: Track | null; // The straggler if odd number

	// Insertion Phase State
	insertionGroup: Track[];
	currentInsertion: Track | null;

	// Binary Search State
	binarySearch?: {
		active: boolean;
		min: number;
		max: number;
		target: Track;
	};

	// Current user interaction
	currentPair: ComparisonPair | null;
}

export interface SortingSession {
	originalPlaylistId: string;
	tracks: Track[];
	state: AlgorithmState;
	history: AlgorithmState[];
}
