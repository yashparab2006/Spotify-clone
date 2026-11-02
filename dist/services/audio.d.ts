/**
 * Type-Safe Web Audio Polyphonic Chord Synthesizer
 */
import { Track } from '../types';
export declare class TypedAudioEngine {
    private audioCtx;
    private masterGain;
    private activeOscillators;
    private isMuted;
    private volumeLevel;
    constructor();
    init(): AudioContext;
    setVolume(vol: number): void;
    toggleMute(): boolean;
    playChord(frequencies: number[], durationSec?: number): void;
    stopCurrentChord(): void;
    playTrackChords(track: Track, chordIndex: number): void;
}
export declare const typedAudioEngine: TypedAudioEngine;
//# sourceMappingURL=audio.d.ts.map