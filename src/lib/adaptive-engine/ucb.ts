/**
 * Calculates the KLI-UCB score for a single item (can be a cell or a question).
 * This function balances exploiting known weaknesses with exploring new areas.
 * @param ability - The learner's current ability (theta).
 * @param item_b - The item's difficulty parameter.
 * @param item_a - The item's discrimination parameter.
 * @param item_selections - How many times this specific item has been presented (n_i).
 * @param total_selections - The total number of selections made across all items (N).
 * @param exploration_parameter - The 'C' constant to balance exploration.
 * @returns The calculated UCB score for the item.
 */
export function calculateUCB(
  ability: number,
  item_b: number,
  item_a: number,
  item_selections: number,
  total_selections: number,
  exploration_parameter: number = 1.0,
): number {
  // If this item has never been selected, give it a very large, finite bonus
  // to ensure it gets picked. This is the primary exploration driver.
  if (item_selections === 0) {
    return 1e9; // Return a large number (1 billion)
  }

  // --- Exploitation Terms ---
  const p_theta = 1 / (1 + Math.exp(-item_a * (ability - item_b)));
  const q_x = Math.max(0.01, Math.min(0.99, (item_b + 5) / 10));
  const p_clamped = Math.max(0.01, Math.min(0.99, p_theta));

  const term1 = p_clamped * Math.log(p_clamped / q_x);
  const term2 = (1 - p_clamped) * Math.log((1 - p_clamped) / (1 - q_x));
  
  // This check is still good for catching potential math errors (e.g., log of negative)
  if (!isFinite(term1) || !isFinite(term2)) {
    return -Infinity;
  }
  const kli_value = term1 + term2;
  
  const proximity_bonus = -Math.abs(ability - item_b);

  // --- Exploration Term (for items that HAVE been selected) ---
  const logN = total_selections > 0 ? Math.log(total_selections) : 0;
  const exploration_calc = exploration_parameter * Math.sqrt(logN / item_selections);
  const exploration_bonus = isFinite(exploration_calc) ? exploration_calc : 0;

  const finalScore = kli_value + proximity_bonus + exploration_bonus;
  
  if (!isFinite(finalScore)) {
      console.error("[UCB CRITICAL] Final score is not finite. Returning -Infinity.", {
          kli_value,
          proximity_bonus,
          exploration_bonus
      });
      return -Infinity;
  }

  return finalScore;
}