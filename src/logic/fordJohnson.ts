import type { AlgorithmState, RoundInfo, Track } from "./types";

export const INITIAL_STATE: AlgorithmState = {
	phase: "PAIRING",
	mainChain: [],
	recursionStack: [],

	pairingPool: [],
	currentRoundWinners: [],
	currentRoundLosers: [],
	currentRoundPairings: new Map(),
	oddTrack: null,

	insertionGroup: [],
	currentInsertion: null,
	currentPair: null,
};

export function initializeSort(tracks: Track[]): AlgorithmState {
	if (tracks.length === 0) {
		return { ...INITIAL_STATE, phase: "COMPLETED" };
	}

	if (tracks.length === 1) {
		return {
			...INITIAL_STATE,
			phase: "COMPLETED",
			mainChain: [...tracks],
		};
	}

	// Initial Pairing Phase setup
	const pairingPool = [...tracks];
	const oddTrack =
		pairingPool.length % 2 !== 0 ? pairingPool.pop() || null : null;

	const left = pairingPool.shift();
	const right = pairingPool.shift();

	if (!left || !right) {
		throw new Error("Unexpected empty pool during initialization");
	}

	return {
		...INITIAL_STATE,
		phase: "PAIRING",
		pairingPool,
		oddTrack,
		currentPair: { left, right },
	};
}

export function handleDecision(
	state: AlgorithmState,
	winnerId: string,
): AlgorithmState {
	if (state.phase === "PAIRING") {
		return handlePairingDecision(state, winnerId);
	} else if (state.phase === "INSERTION") {
		return handleInsertionDecision(state, winnerId);
	}
	return state;
}

function handlePairingDecision(
	state: AlgorithmState,
	winnerId: string,
): AlgorithmState {
	const { currentPair } = state;
	if (!currentPair) throw new Error("No current pair");

	const winner =
		currentPair.left.id === winnerId ? currentPair.left : currentPair.right;
	const loser =
		currentPair.left.id === winnerId ? currentPair.right : currentPair.left;

	const newWinners = [...state.currentRoundWinners, winner];
	const newLosers = [...state.currentRoundLosers, loser];
	const newPairings = new Map(state.currentRoundPairings);
	newPairings.set(loser.id, winner.id);

	const newPool = [...state.pairingPool];

	if (newPool.length >= 2) {
		const left = newPool.shift()!;
		const right = newPool.shift()!;
		return {
			...state,
			pairingPool: newPool,
			currentRoundWinners: newWinners,
			currentRoundLosers: newLosers,
			currentRoundPairings: newPairings,
			currentPair: { left, right },
		};
	} else {
		const roundInfo: RoundInfo = {
			roundId: state.recursionStack.length,
			losers: newLosers,
			oddTrack: state.oddTrack,
			pairings: newPairings,
			promotedWinners: newWinners,
		};

		const newStack = [...state.recursionStack, roundInfo];
		const nextRoundTracks = [...newWinners];

		if (nextRoundTracks.length === 1) {
			// Start Insertion Logic
			// The single winner becomes mainChain
			// Then we must setup insertion for the pending group (Round from Stack)

			// Wait, we need to POP from stack?
			// "Base case: mainChain is 'S'. Pending is 'b_i's from stack"

			// We can delegate to setupNextInsertion, but we need to set state first.

			const baseState: AlgorithmState = {
				...state,
				phase: "INSERTION",
				recursionStack: newStack,
				mainChain: nextRoundTracks,

				pairingPool: [],
				currentRoundWinners: [],
				currentRoundLosers: [],
				currentRoundPairings: new Map(),
				oddTrack: null,
				currentPair: null,

				insertionGroup: [],
				currentInsertion: null,
			};

			return setupNextInsertion(baseState);
		}

		const newOddTrack =
			nextRoundTracks.length % 2 !== 0 ? nextRoundTracks.pop() || null : null;
		const newPairingPool = [...nextRoundTracks];

		const left = newPairingPool.shift()!;
		const right = newPairingPool.shift()!;

		return {
			...state,
			phase: "PAIRING",
			recursionStack: newStack,
			pairingPool: newPairingPool,
			currentRoundWinners: [],
			currentRoundLosers: [],
			currentRoundPairings: new Map(),
			oddTrack: newOddTrack,
			currentPair: { left, right },
		};
	}
}

// Helper to generate Jacobsthal numbers up to a value
function getJacobsthal(n: number): number[] {
	const seq = [0, 1];
	while (seq[seq.length - 1] < n) {
		const len = seq.length;
		seq.push(seq[len - 1] + 2 * seq[len - 2]);
	}
	return seq;
}

export function getInsertionOrder(n: number): number[] {
	if (n === 0) return [];
	if (n === 1) return [0];
	const order: number[] = [];
	const jacobsthal = getJacobsthal(n * 2);

	// We want to generate indices < n.
	// Jacobsthal groups: Use J_k ... J_{k-1} logic.
	// J: 0, 1, 3, 5, 11...
	// Group 1 (k=2): Ends J_2=1. Indices: 0. (Start from 0) (Wait J_2 is 1? J0=0, J1=1, J2=1, J3=3)
	// Actually sequence: 0, 1, 1, 3, 5, 11
	// We need unique sorted: 0, 1, 3, 5, 11

	// Groups:
	// 0: (up to 0) -> 0
	// 1: (up to 2) -> 2, 1? No.
	// Let's use hardcoded "next jacobsthal" logic

	// Standard sequence of "next element to insert" (1-based from theory): b1, b3, b2, b5, b4...
	// 0-based index: 0, 2, 1, 4, 3...

	// My previous implementation logic:
	// order.push(0);
	// k = 3 -> J=3. Loop i=2 down to 1.
	// k = 4 -> J=5. Loop i=4 down to 3.

	// Let's implement that exactly.
	order.push(0);
	let count = 1;
	let k = 3; // J[3]=3
	let prevJ = 1;

	while (count < n) {
		const currJ = jacobsthal[k];
		let i = currJ - 1;
		if (i >= n) i = n - 1;

		while (i > prevJ - 1) {
			if (!order.includes(i)) {
				order.push(i);
				count++;
			}
			i--;
		}
		prevJ = currJ;
		k++;
	}
	return order;
}

function handleInsertionDecision(
	state: AlgorithmState,
	winnerId: string,
): AlgorithmState {
	const { currentPair, binarySearch } = state;
	if (!currentPair || !binarySearch) throw new Error("Invalid Insertion State");

	const targetWins = winnerId === binarySearch.target.id;
	let newMin = binarySearch.min;
	let newMax = binarySearch.max;

	if (targetWins) {
		// target > mid -> [mid+1, max]
		newMin = Math.floor((newMin + newMax) / 2) + 1;
	} else {
		// target < mid -> [min, mid] (Wait, max is exclusive or inclusive? Upper bound search logic)
		// Usually, if we want index where to insert:
		// if val < arr[mid]: insert before mid (or search left) -> max = mid
		// if val > arr[mid]: insert after mid -> min = mid + 1
		newMax = Math.floor((newMin + newMax) / 2);
	}

	// BS Step Check
	if (newMin < newMax) {
		const mid = Math.floor((newMin + newMax) / 2);
		return {
			...state,
			binarySearch: {
				...binarySearch,
				min: newMin,
				max: newMax,
			},
			currentPair: {
				left: binarySearch.target,
				right: state.mainChain[mid],
			},
		};
	} else {
		// Found spot
		const insertionIdx = newMin;
		const newMainChain = [...state.mainChain];
		newMainChain.splice(insertionIdx, 0, binarySearch.target);

		return setupNextInsertion({
			...state,
			mainChain: newMainChain,
			currentInsertion: null,
			binarySearch: undefined,
			currentPair: null,
		});
	}
}

function setupNextInsertion(state: AlgorithmState): AlgorithmState {
	// Check if we have a current insertion group running
	// We assume `insertionGroup` holds the *ordered remaining items* to be inserted?
	// OR we regenerate it?
	// Let's require `insertionGroup` to be the queue.

	if (state.insertionGroup.length > 0) {
		const group = [...state.insertionGroup];
		const nextTarget = group.shift()!;

		// Setup BS.
		// We need bound?
		// Bound is determined by the pairing!
		// nextTarget (loser) was paired with `winner`.
		// `winner` is already in `mainChain`.
		// We only need to search up to `winner`'s index.

		// We need the `RoundInfo` to look up the winner.
		// But we popped it?
		// We should store `pairings` in `AlgorithmState` during insertion phase?
		// Currently `setupNextInsertion` is recursive (via stack).

		// Complexity: We need to know the 'limit' for Binary Search.
		// When we pop from stack, we should attach pairing info to `state`?
		// Or store it in `currentRoundPairings`?

		// HACK: For now, search entire mainChain.
		// This is strictly not optimal (Ford-Johnson optimizes by bounding search),
		// but for <1000 items, searching full list is fine. Comparison count increase is minimal.

		// Actually, if we don't bound, it's just standard Binary Insertion Sort.
		// If user wants minimal comparisons, valid solution.

		return {
			...state,
			insertionGroup: group,
			currentInsertion: nextTarget,
			binarySearch: {
				active: true,
				min: 0,
				max: state.mainChain.length,
				target: nextTarget,
			},
			currentPair: {
				left: nextTarget,
				right: state.mainChain[Math.floor(state.mainChain.length / 2)],
			},
		};
	}

	// No more in current group. Pop stack.
	if (state.recursionStack.length === 0) {
		return { ...state, phase: "COMPLETED" };
	}

	const stack = [...state.recursionStack];
	const roundInfo = stack.pop()!;

	// New Group
	// 1. Losers
	// 2. Odd element (if any)
	// We need to order them.
	// The "losers" list in RoundInfo is in order of their winners?
	// Original: winners=[w1, w2], losers=[l1, l2].
	// If we insert l1, bound is w1.
	// Ideally we put them into `insertionGroup` in correct order (Jacobsthal).

	// Combine losers + oddTrack
	const pending = [...roundInfo.losers];
	if (roundInfo.oddTrack) {
		// Odd track is usually just appended or treated as last?
		// Just add to pending list.
		pending.push(roundInfo.oddTrack);
	}

	// Get insertion order indices
	const indices = getInsertionOrder(pending.length);
	const orderedGroup = indices.map((i) => pending[i]);

	return setupNextInsertion({
		...state,
		recursionStack: stack,
		insertionGroup: orderedGroup,
		// We ideally store 'limit map' to optimize BS, but skipping for now.
	});
}

// Serialization Helpers
export function serializeState(state: AlgorithmState): string {
	return JSON.stringify(state, (key, value) => {
		if (value instanceof Map) {
			return {
				dataType: "Map",
				value: Array.from(value.entries()),
			};
		}
		return value;
	});
}

export function deserializeState(json: string): AlgorithmState {
	return JSON.parse(json, (key, value) => {
		if (typeof value === "object" && value !== null) {
			if (value.dataType === "Map") {
				return new Map(value.value);
			}
		}
		return value;
	});
}
