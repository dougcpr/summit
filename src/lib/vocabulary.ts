export const VOCAB = [
  // Hand techniques
  { id: "crimp",       label: "Crimp",       definition: "Fingertip grip on a small edge" },
  { id: "open-hand",   label: "Open hand",   definition: "Relaxed grip across a hold" },
  { id: "pinch",       label: "Pinch",       definition: "Thumb opposing fingers" },
  { id: "gaston",      label: "Gaston",      definition: "Sideways press with elbow out, thumb down" },
  { id: "undercling",  label: "Undercling",  definition: "Hold gripped from below" },
  { id: "sidepull",    label: "Sidepull",    definition: "Vertical hold pulled sideways" },
  // Foot techniques
  { id: "heel-hook",   label: "Heel hook",   definition: "Hooking the heel onto a hold to pull" },
  { id: "toe-hook",    label: "Toe hook",    definition: "Hooking the top of the toes" },
  { id: "drop-knee",   label: "Drop knee",   definition: "Inside knee drops to engage hip rotation" },
  { id: "smear",       label: "Smear",       definition: "Foot pressed flat against the wall" },
  { id: "flag",        label: "Flag",        definition: "Free leg counterbalances the body" },
  // Body movements
  { id: "deadpoint",   label: "Deadpoint",   definition: "Latch a hold at the apex of momentum" },
  { id: "dyno",        label: "Dyno",        definition: "Both hands leave the wall mid-move" },
  { id: "lock-off",    label: "Lock-off",    definition: "Static hold with bent arm" },
  { id: "mantle",      label: "Mantle",      definition: "Press up onto a hold from below" },
  { id: "compression", label: "Compression", definition: "Squeeze opposing holds inward" },
  { id: "match",       label: "Match",       definition: "Both hands or feet share one hold" },
] as const;

export type VocabId = (typeof VOCAB)[number]["id"];

export function findVocab(id: string) {
  return VOCAB.find((v) => v.id === id);
}
