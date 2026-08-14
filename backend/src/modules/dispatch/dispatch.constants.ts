/**
 * Injection token for the dispatch random source — the engine depends on the
 * interface, production provides CryptoAssignmentRandomSource, tests provide
 * a deterministic sequence.
 */
export const ASSIGNMENT_RANDOM_SOURCE = 'ASSIGNMENT_RANDOM_SOURCE';
