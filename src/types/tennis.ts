export interface Player {
  id: string;
  name: string;
  country_code: string;
  hand: "L" | "R";
  birth_date: string | null;
  height_cm: number | null;
  play_style: string | null;
  strengths: string[];
  weaknesses: string[];
  best_surfaces: string[];
  created_at: string;
}

export interface Match {
  id: string;
  tourney_name: string;
  surface: string;
  tourney_date: string;
  round: string;
  player1_id: string;
  player2_id: string;
  winner_id: string;
  score: string;
  minutes: number | null;

  // Serve stats (raw integers from Jeff Sackmann)
  p1_ace: number;
  p1_df: number;
  p1_svpt: number;
  p1_1stIn: number;
  p1_1stWon: number;
  p1_2ndWon: number;
  p1_SvGms: number;
  p1_bpSaved: number;
  p1_bpFaced: number;

  p2_ace: number;
  p2_df: number;
  p2_svpt: number;
  p2_1stIn: number;
  p2_1stWon: number;
  p2_2ndWon: number;
  p2_SvGms: number;
  p2_bpSaved: number;
  p2_bpFaced: number;
}

export interface PlayerNote {
  id: string;
  player_id: string;
  category: "strength" | "weakness" | "tactic" | "surface";
  content: string;
  confidence: number;
  tags: string[];
  created_at: string;
}

export interface Prediction {
  id: string;
  match_id: string | null;
  player1_id: string;
  player2_id: string;
  predicted_winner_id: string;
  confidence: number;
  reasoning: string;
  tactics_player1: string;
  tactics_player2: string;
  surface: string | null;
  tournament: string | null;
  ai_model: string;
  created_at: string;
}

export interface PlayerImage {
  id: string;
  player_id: string;
  image_url: string;
  source: "atp" | "wta";
  scraped_at: string;
}

export type Surface = "Hard" | "Clay" | "Grass" | "Indoor";

export const SURFACES: Surface[] = ["Hard", "Clay", "Grass", "Indoor"];

export const PLAY_STYLES = [
  "baseline",
  "serve-volley",
  "all-court",
  "counter-puncher",
  "aggressive-baseliner",
] as const;

export const STRENGTH_WEAKNESS_OPTIONS = [
  "serve",
  "forehand",
  "backhand",
  "movement",
  "net-game",
  "return",
  "mental",
  "dropshot",
  "lob",
  "volley",
  "fitness",
  "slice",
] as const;

export const SURFACE_OPTIONS = ["Hard", "Clay", "Grass", "Indoor"] as const;
