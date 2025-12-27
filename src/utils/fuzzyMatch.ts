// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
}

// Calculate similarity score between two strings (0-1)
function similarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) {
    return 1.0;
  }
  
  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - distance) / longer.length;
}

// Find best fuzzy match from array of strings
export function fuzzyMatch(input: string, options: string[], threshold: number = 0.6): string | null {
  let bestMatch: string | null = null;
  let bestScore = 0;

  const inputLower = input.toLowerCase();

  for (const option of options) {
    const optionLower = option.toLowerCase();
    
    // Exact match
    if (optionLower === inputLower) {
      return option;
    }
    
    // Contains match (high priority)
    if (optionLower.includes(inputLower) || inputLower.includes(optionLower)) {
      const score = 0.9;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = option;
      }
      continue;
    }
    
    // Fuzzy match
    const score = similarity(input, option);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      bestMatch = option;
    }
  }

  return bestMatch;
}

// Find best match for role by name
export function findRoleByName(guild: any, roleName: string): any {
  const roleNames = guild.roles.cache.map((r: any) => r.name);
  const bestMatch = fuzzyMatch(roleName, roleNames, 0.6);
  
  if (bestMatch) {
    return guild.roles.cache.find((r: any) => r.name === bestMatch);
  }
  
  return null;
}
