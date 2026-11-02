/**
 * Type-Safe Web Audio Polyphonic Chord Synthesizer
 */

import { Track } from '../types';

export class TypedAudioEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeOscillators: OscillatorNode[] = [];
  private isMuted: boolean = false;
  private volumeLevel: number = 0.75;

  constructor() {
    // Lazy initialization on first user interaction
  }

  public init(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.volumeLevel, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setVolume(vol: number): void {
    this.volumeLevel = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.volumeLevel, this.audioCtx.currentTime);
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volumeLevel, this.audioCtx.currentTime);
    }
    return this.isMuted;
  }

  public playChord(frequencies: number[], durationSec = 1.8): void {
    const ctx = this.init();
    if (!this.masterGain) return;

    this.stopCurrentChord();

    const now = ctx.currentTime;
    frequencies.forEach(freq => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Smooth attack and release envelope
      noteGain.gain.setValueAtTime(0.001, now);
      noteGain.gain.exponentialRampToValueAtTime(0.2 / frequencies.length, now + 0.08);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(noteGain);
      noteGain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + durationSec);

      this.activeOscillators.push(osc);
    });
  }

  public stopCurrentChord(): void {
    this.activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    });
    this.activeOscillators = [];
  }

  public playTrackChords(track: Track, chordIndex: number): void {
    if (track.chords && track.chords.length > 0) {
      const chords = track.chords[chordIndex % track.chords.length];
      this.playChord(chords);
    } else if (track.rootFreq) {
      this.playChord([track.rootFreq, track.rootFreq * 1.25, track.rootFreq * 1.5]);
    }
  }
}

export const typedAudioEngine = new TypedAudioEngine();

