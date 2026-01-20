import { describe, expect, it } from "vitest";
import {
	getInsertionOrder,
	handleDecision,
	initializeSort,
} from "./fordJohnson";
import type { Track } from "./types";

// Helper to create mock tracks
const createTracks = (count: number): Track[] => {
	return Array.from({ length: count }, (_, i) => ({
		id: `id_${i + 1}`,
		name: `Track ${Number(i) + 1}`,
		artist: `Artist ${Number(i) + 1}`,
	}));
};

describe("Ford-Johnson Algorithm", () => {
	// ... Pairing tests omitted or reused (they are in the file technically, but this overwrites)
	// I should include previous tests too!
	// I will rewrite the whole file.

	describe("Initialization (Pairing Phase)", () => {
		it("should initialize with PAIRING phase for 4 items", () => {
			const tracks = createTracks(4);
			const state = initializeSort(tracks);
			expect(state.phase).toBe("PAIRING");
		});
	});

	describe("Helper: getInsertionOrder", () => {
		it("should return empty for 0", () => {
			expect(getInsertionOrder(0)).toEqual([]);
		});
		it("should return [0] for 1", () => {
			expect(getInsertionOrder(1)).toEqual([0]);
		});
		it("should return [0, 2, 1] for 3", () => {
			expect(getInsertionOrder(3)).toEqual([0, 2, 1]);
		});
		it("should return [0, 2, 1, 4, 3] for 5", () => {
			expect(getInsertionOrder(5)).toEqual([0, 2, 1, 4, 3]);
		});
	});

	describe("Insertion Phase Logic", () => {
		it("should perform binary search insertion", () => {
			// Mock state in INSERTION phase
			const chain = createTracks(1); // [id_1]
			const target = { id: "id_2", name: "Track 2", artist: "" };

			const state: any = {
				phase: "INSERTION",
				mainChain: chain,
				insertionGroup: [], // Last one
				currentInsertion: target,
				binarySearch: {
					active: true,
					min: 0,
					max: 1,
					target: target,
				},
				currentPair: {
					left: target,
					right: chain[0],
				},
				recursionStack: [],
			};

			// Case 1: Target < Chain[0] (User picks right)
			// BS: min=0, max=1. mid=0. Target < Main[0]. newMax = 0.
			// Loop finishes. Insert at 0.

			const newState = handleDecision(state, chain[0].id); // Chain[0] wins

			// Should have searched and inserted
			// newMax=0, newMin=0. Insert at 0.
			// Then setupNextInsertion -> Group empty -> Stack empty -> COMPLETED.

			expect(newState.phase).toBe("COMPLETED");
			expect(newState.mainChain).toHaveLength(2);
			expect(newState.mainChain[0].id).toBe("id_2");
			expect(newState.mainChain[1].id).toBe("id_1");
		});
	});
});
