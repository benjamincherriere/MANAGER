export interface Meeting {
  id: number;
  date: string;
  provider: string;
  status: string;
  details: string;
}

export const meetings: Meeting[] = [
  {
    id: 1,
    date: "2024-10-01",
    provider: "Maison A",
    status: "Confirmé",
    details: "Dégustation des nouvelles cuvées.",
  },
  {
    id: 2,
    date: "2024-10-05",
    provider: "Maison B",
    status: "En attente",
    details: "Présentation de la gamme 2023.",
  },
];

export function getMeetingById(id: number): Meeting | undefined {
  return meetings.find((m) => m.id === id);
}

