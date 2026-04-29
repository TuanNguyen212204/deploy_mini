export function parseVolume(name: string) {
  const normalized = name.toLowerCase();
  
  const patterns = [
    { unit: 'miếng', regex: /(\d+)\s*(?:miếng|mieng|cái|chiếc)/ },
    { unit: 'ml', regex: /(\d+)\s*(?:ml)/ },
    { unit: 'g', regex: /(\d+)\s*(?:g|gram)/ },
    { unit: 'l', regex: /(\d+(?:\.\d+)?)\s*(?:l|lít|lit)/ },
  ];

  for (const p of patterns) {
    const match = normalized.match(p.regex);
    if (match) {
      return { value: parseFloat(match[1]), unit: p.unit };
    }
  }
  return { value: null, unit: null };
}

export function parsePackSize(name: string): number {
  const normalized = name.toLowerCase();
  const comboMatch = normalized.match(/(?:combo|bộ|set)\s*(\d+)/);
  if (comboMatch) return parseInt(comboMatch[1]);
  
  const xMatch = normalized.match(/x\s*(\d+)(?:\s|$)/); // Vd: "Sữa rửa mặt x2"
  if (xMatch) return parseInt(xMatch[1]);
  
  return 1;
}