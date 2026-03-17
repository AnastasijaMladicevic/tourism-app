export interface Player {
  id: number;
  firstName: string;
  lastName: string;
  club: string;
  position: string;
  jerseyNumber: number;
  age: number;
}

export interface PlayerPayload {
  id?: number;
  firstName: string;
  lastName: string;
  club: string;
  position: string;
  jerseyNumber: number;
  age: number;
}
