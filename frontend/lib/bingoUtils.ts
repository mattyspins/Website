type CellForWinners = {
  row: number;
  col: number;
  status: string;
  claimedById: string | null;
  claimedBy: { kickUsername?: string | null; displayName: string } | null;
};

type LineWin = {
  lineType: string;
  lineIndex: number;
};

export function kickName(u: { kickUsername?: string | null; displayName: string } | null | undefined) {
  return u?.kickUsername ?? u?.displayName ?? "?";
}

export function lineLabel(lineType: string, lineIndex: number) {
  if (lineType === "row") return `Row ${lineIndex + 1}`;
  if (lineType === "col") return `Column ${lineIndex + 1}`;
  if (lineType === "diag" && lineIndex === 0) return "Main Diagonal ↘";
  if (lineType === "diag" && lineIndex === 1) return "Anti-Diagonal ↙";
  return "Line";
}

export function getLineWinners(cells: CellForWinners[], lw: LineWin, gridSize: number): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const cell of cells) {
    let inLine = false;
    if (lw.lineType === "row" && cell.row === lw.lineIndex && cell.status === "GREEN") inLine = true;
    if (lw.lineType === "col" && cell.col === lw.lineIndex && cell.status === "GREEN") inLine = true;
    if (lw.lineType === "diag" && lw.lineIndex === 0 && cell.row === cell.col && cell.status === "GREEN") inLine = true;
    if (lw.lineType === "diag" && lw.lineIndex === 1 && cell.row + cell.col === gridSize - 1 && cell.status === "GREEN") inLine = true;
    if (inLine && cell.claimedById && !seen.has(cell.claimedById)) {
      seen.add(cell.claimedById);
      names.push(kickName(cell.claimedBy));
    }
  }
  return names;
}
