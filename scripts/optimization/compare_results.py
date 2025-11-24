"""
Compare optimization results before and after parameter tuning.
"""

import json
import sys
from pathlib import Path

def load_json(filepath):
    """Load JSON file."""
    with open(filepath, 'r') as f:
        return json.load(f)

def print_comparison(before_file, after_file):
    """Print comparison between before and after results."""

    before = load_json(before_file)
    after = load_json(after_file)

    # Extract hybrid metrics
    before_hybrid = before['modes']['hybrid']
    after_hybrid = after['modes']['hybrid']

    print("=" * 80)
    print("OPTIMIZATION VALIDATION RESULTS")
    print("=" * 80)
    print()

    print("Configuration Changes:")
    print("  Phase 1 End:      10 -> 7  (Q0-7 instead of Q0-10)")
    print("  Phase 2 End:      20 -> 26 (Q7-26 instead of Q10-20)")
    print("  Initial Weight:   50% -> 40.3%")
    print("  Phase 1 Target:   65% -> 70.8%")
    print("  Phase 2 Target:   85% -> 87.1%")
    print("  Max Weight:       90% -> 97.0%")
    print()

    print("=" * 80)
    print("ACCURACY METRICS")
    print("=" * 80)
    print()

    # RMSE
    before_rmse = before_hybrid['rmse']
    after_rmse = after_hybrid['rmse']
    rmse_change = ((after_rmse - before_rmse) / before_rmse) * 100
    rmse_dir = "improvement" if rmse_change < 0 else "regression"

    print(f"RMSE (Lower = Better):")
    print(f"  Before: {before_rmse:.4f}")
    print(f"  After:  {after_rmse:.4f}")
    print(f"  Change: {rmse_change:+.2f}% ({rmse_dir})")
    print()

    # Correlation
    before_corr = before_hybrid['correlation']
    after_corr = after_hybrid['correlation']
    corr_change = ((after_corr - before_corr) / before_corr) * 100
    corr_dir = "improvement" if corr_change > 0 else "regression"

    print(f"Correlation (Higher = Better):")
    print(f"  Before: {before_corr:.4f}")
    print(f"  After:  {after_corr:.4f}")
    print(f"  Change: {corr_change:+.2f}% ({corr_dir})")
    print()

    # MAE
    before_mae = before_hybrid['mae']
    after_mae = after_hybrid['mae']
    mae_change = ((after_mae - before_mae) / before_mae) * 100
    mae_dir = "improvement" if mae_change < 0 else "regression"

    print(f"MAE (Lower = Better):")
    print(f"  Before: {before_mae:.4f}")
    print(f"  After:  {after_mae:.4f}")
    print(f"  Change: {mae_change:+.2f}% ({mae_dir})")
    print()

    print("=" * 80)
    print("PERFORMANCE METRICS")
    print("=" * 80)
    print()

    # Regret
    before_regret = before_hybrid['performance']['avgRegret']
    after_regret = after_hybrid['performance']['avgRegret']
    regret_change = ((after_regret - before_regret) / before_regret) * 100
    regret_dir = "improvement" if regret_change < 0 else "regression"

    print(f"Average Regret (Lower = Better):")
    print(f"  Before: {before_regret:.4f}")
    print(f"  After:  {after_regret:.4f}")
    print(f"  Change: {regret_change:+.2f}% ({regret_dir})")
    print()

    print("=" * 80)
    print("PERSONALIZATION METRICS")
    print("=" * 80)
    print()

    # Question Diversity
    before_div = before_hybrid['personalization']['questionDiversity']
    after_div = after_hybrid['personalization']['questionDiversity']
    div_change = ((after_div - before_div) / before_div) * 100

    print(f"Question Diversity (avg unique questions per student):")
    print(f"  Before: {before_div:.2f}")
    print(f"  After:  {after_div:.2f}")
    print(f"  Change: {div_change:+.2f}%")
    print()

    # Student Overlap
    before_overlap = before_hybrid['personalization']['studentOverlap']
    after_overlap = after_hybrid['personalization']['studentOverlap']
    overlap_change = ((after_overlap - before_overlap) / before_overlap) * 100

    print(f"Student Overlap (Lower = More Personalized):")
    print(f"  Before: {before_overlap:.4f}")
    print(f"  After:  {after_overlap:.4f}")
    print(f"  Change: {overlap_change:+.2f}%")
    print()

    # Selection Concentration
    before_conc = before_hybrid['personalization']['selectionConcentration']
    after_conc = after_hybrid['personalization']['selectionConcentration']
    conc_change = ((after_conc - before_conc) / before_conc) * 100

    print(f"Selection Concentration (CV):")
    print(f"  Before: {before_conc:.4f}")
    print(f"  After:  {after_conc:.4f}")
    print(f"  Change: {conc_change:+.2f}%")
    print()

    print("=" * 80)
    print("OVERALL ASSESSMENT")
    print("=" * 80)
    print()

    # Calculate composite score
    # Objective function: 60% correlation + 30% RMSE improvement
    before_obj = before_corr * 0.6 + (0.80 - before_rmse) * 0.3
    after_obj = after_corr * 0.6 + (0.80 - after_rmse) * 0.3
    obj_change = ((after_obj - before_obj) / before_obj) * 100

    print(f"Objective Function (60% corr + 30% RMSE):")
    print(f"  Before: {before_obj:.4f}")
    print(f"  After:  {after_obj:.4f}")
    print(f"  Change: {obj_change:+.2f}%")
    print()

    if obj_change > 2:
        print("Status: SIGNIFICANT IMPROVEMENT")
        print("Recommendation: Deploy optimized parameters")
    elif obj_change > 0:
        print("Status: MARGINAL IMPROVEMENT")
        print("Recommendation: Deploy with monitoring")
    elif obj_change > -2:
        print("Status: NO SIGNIFICANT CHANGE")
        print("Recommendation: Further optimization needed")
    else:
        print("Status: REGRESSION")
        print("Recommendation: Revert to original parameters")
    print()

if __name__ == '__main__':
    # Get the two most recent result files
    results_dir = Path(__file__).parent.parent / 'testing' / 'results'
    json_files = sorted(results_dir.glob('cb-simulation-testing-*.json'),
                       key=lambda p: p.stat().st_mtime)

    if len(json_files) < 2:
        print("Error: Need at least 2 result files to compare")
        sys.exit(1)

    before_file = json_files[-2]
    after_file = json_files[-1]

    print(f"\nComparing:")
    print(f"  BEFORE: {before_file.name}")
    print(f"  AFTER:  {after_file.name}")
    print()

    print_comparison(before_file, after_file)
