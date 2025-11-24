"""
Bayesian Optimization for Hybrid Weight Evolution Parameters.

Uses Gaussian Process with Expected Improvement to find optimal
phase boundaries and weight targets.

Usage:
    python bayesian_optimize_weights.py [--n-iter 150] [--n-initial 25]
"""

import argparse
import json
import time
import sys
from datetime import datetime
from pathlib import Path
from typing import List, Tuple

import numpy as np
import matplotlib.pyplot as plt
from skopt import Optimizer

# Fix Windows console encoding issues
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
from skopt.space import Real, Integer
from skopt.plots import plot_convergence, plot_objective

from evaluate_config import evaluate_config


# ============================================================================
# CONFIGURATION
# ============================================================================

# Parameter space
PARAM_SPACE = [
    Real(0.40, 0.60, name='initial_weight'),
    Integer(5, 15, name='phase1_end'),
    Integer(15, 30, name='phase2_end'),
    Real(0.55, 0.75, name='phase1_target'),
    Real(0.75, 0.95, name='phase2_target'),
    Real(0.85, 0.98, name='max_weight'),
]

# Objective function weights
CORRELATION_WEIGHT = 0.6
RMSE_WEIGHT = 0.3
RMSE_TARGET = 0.70
RMSE_PENALTY_THRESHOLD = 0.75

# Early stopping
EARLY_STOP_PATIENCE = 25  # Stop if no improvement for this many iterations

# ============================================================================
# OBJECTIVE FUNCTION
# ============================================================================

def calculate_objective(correlation: float, rmse: float) -> float:
    """
    Calculate optimization objective score.

    Higher is better.

    Args:
        correlation: Pearson correlation (0-1)
        rmse: Root mean square error (lower is better)

    Returns:
        Combined objective score
    """
    # Primary: Maximize correlation (60% weight)
    correlation_score = correlation * CORRELATION_WEIGHT

    # Secondary: Minimize RMSE (30% weight)
    # Target RMSE = 0.70, score decreases as RMSE increases
    rmse_score = (0.80 - rmse) * RMSE_WEIGHT

    # Penalty: Heavy penalty if RMSE > 0.75 (quality threshold)
    rmse_penalty = max(0, (rmse - RMSE_PENALTY_THRESHOLD) * 2.0)

    objective = correlation_score + rmse_score - rmse_penalty

    return objective


def validate_config(params: List[float]) -> bool:
    """
    Check if configuration is valid (satisfies constraints).

    Args:
        params: [initial_weight, phase1_end, phase2_end, phase1_target,
                 phase2_target, max_weight]

    Returns:
        True if valid, False otherwise
    """
    initial_weight, phase1_end, phase2_end, phase1_target, phase2_target, max_weight = params

    # Constraint 1: Phases must be distinct
    if phase2_end <= phase1_end + 3:
        return False

    # Constraint 2: Weights must be monotonically increasing
    if not (initial_weight < phase1_target < phase2_target < max_weight):
        return False

    return True


def evaluate_with_objective(params: List[float]) -> float:
    """
    Evaluate a configuration and return objective score.

    Args:
        params: [initial_weight, phase1_end, phase2_end, phase1_target,
                 phase2_target, max_weight]

    Returns:
        Negative objective score (for minimization)
    """
    # Unpack parameters
    initial_weight, phase1_end, phase2_end, phase1_target, phase2_target, max_weight = params

    # Check constraints
    if not validate_config(params):
        print(f"  ⚠️  Invalid config (constraints violated)")
        return 999.0  # Return large value for minimization

    # Run Monte Carlo simulation
    print(f"  Evaluating config: initial={initial_weight:.2f}, "
          f"p1={phase1_end}, p2={phase2_end}, "
          f"t1={phase1_target:.2f}, t2={phase2_target:.2f}, max={max_weight:.2f}")

    start_time = time.time()
    results = evaluate_config(
        initial_weight=initial_weight,
        phase1_end=int(phase1_end),
        phase2_end=int(phase2_end),
        phase1_target=phase1_target,
        phase2_target=phase2_target,
        max_weight=max_weight
    )
    elapsed = time.time() - start_time

    if 'error' in results:
        print(f"  ❌ Evaluation failed: {results['error']}")
        return 999.0

    correlation = results['correlation']
    rmse = results['rmse']

    objective = calculate_objective(correlation, rmse)

    print(f"  [+] Results: corr={correlation:.3f}, rmse={rmse:.3f}, "
          f"obj={objective:.3f} (time={elapsed:.1f}s)")

    # Return negative objective for minimization
    return -objective


# ============================================================================
# OPTIMIZATION LOOP
# ============================================================================

def run_optimization(n_iter: int = 150, n_initial: int = 25) -> dict:
    """
    Run Bayesian optimization to find best hyperparameters.

    Args:
        n_iter: Total number of iterations
        n_initial: Number of random initialization points

    Returns:
        dict with optimization results
    """
    print("=" * 80)
    print("BAYESIAN OPTIMIZATION FOR HYBRID WEIGHT EVOLUTION")
    print("=" * 80)
    print()
    print(f"Configuration:")
    print(f"  Total iterations: {n_iter}")
    print(f"  Random initialization: {n_initial}")
    print(f"  Early stop patience: {EARLY_STOP_PATIENCE}")
    print()
    print(f"Parameter space:")
    for dim in PARAM_SPACE:
        print(f"  {dim.name}: {dim.bounds}")
    print()
    print(f"Objective function:")
    print(f"  Correlation weight: {CORRELATION_WEIGHT}")
    print(f"  RMSE weight: {RMSE_WEIGHT}")
    print(f"  RMSE penalty threshold: {RMSE_PENALTY_THRESHOLD}")
    print()
    print("=" * 80)
    print()

    # Initialize optimizer
    optimizer = Optimizer(
        dimensions=PARAM_SPACE,
        base_estimator="GP",  # Gaussian Process
        acq_func="EI",  # Expected Improvement
        acq_optimizer="sampling",
        n_initial_points=n_initial,
        random_state=42
    )

    # Track results
    all_results = []
    best_objective = -999.0
    best_config = None
    best_metrics = None
    no_improvement_count = 0

    # Optimization loop
    for i in range(n_iter):
        iteration_start = time.time()

        print(f"[Iteration {i+1}/{n_iter}]")

        # Get next configuration to try
        suggested_params = optimizer.ask()

        # Evaluate
        neg_objective = evaluate_with_objective(suggested_params)

        # Update optimizer
        optimizer.tell(suggested_params, neg_objective)

        # Track results
        objective = -neg_objective
        all_results.append({
            'iteration': i + 1,
            'params': {
                'initial_weight': suggested_params[0],
                'phase1_end': int(suggested_params[1]),
                'phase2_end': int(suggested_params[2]),
                'phase1_target': suggested_params[3],
                'phase2_target': suggested_params[4],
                'max_weight': suggested_params[5]
            },
            'objective': objective,
            'is_valid': validate_config(suggested_params)
        })

        # Check if new best
        if objective > best_objective:
            best_objective = objective
            best_config = suggested_params
            best_metrics = all_results[-1]
            no_improvement_count = 0
            print(f"  [*] NEW BEST! Objective={objective:.4f}")
        else:
            no_improvement_count += 1

        iteration_time = time.time() - iteration_start
        print(f"  Iteration time: {iteration_time:.1f}s")
        print()

        # Early stopping
        if no_improvement_count >= EARLY_STOP_PATIENCE:
            print(f"[STOP] Early stopping: No improvement for {EARLY_STOP_PATIENCE} iterations")
            break

        # Save checkpoint every 10 iterations
        if (i + 1) % 10 == 0:
            save_results(all_results, best_config, best_metrics, optimizer)

    print("=" * 80)
    print("OPTIMIZATION COMPLETE!")
    print("=" * 80)
    print()

    # Final results
    return {
        'all_results': all_results,
        'best_config': best_config,
        'best_metrics': best_metrics,
        'optimizer': optimizer
    }


# ============================================================================
# RESULT SAVING & VISUALIZATION
# ============================================================================

def save_results(all_results: List[dict], best_config, best_metrics, optimizer):
    """Save optimization results to JSON and plots."""
    results_dir = Path(__file__).parent / 'results'
    results_dir.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    # Save JSON
    output_file = results_dir / f'optimization_results_{timestamp}.json'
    with open(output_file, 'w') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'best_config': {
                'initial_weight': best_config[0],
                'phase1_end': int(best_config[1]),
                'phase2_end': int(best_config[2]),
                'phase1_target': best_config[3],
                'phase2_target': best_config[4],
                'max_weight': best_config[5]
            } if best_config is not None else None,
            'best_objective': best_metrics['objective'] if best_metrics else None,
            'all_results': all_results
        }, f, indent=2)

    print(f"  💾 Results saved to: {output_file}")

    # Create convergence plot
    try:
        objectives = [r['objective'] for r in all_results if r['is_valid']]
        iterations = list(range(1, len(objectives) + 1))

        fig, ax = plt.subplots(figsize=(12, 6))
        ax.plot(iterations, objectives, 'b-', alpha=0.3, label='Objective')

        # Plot best so far
        best_so_far = []
        current_best = -999
        for obj in objectives:
            if obj > current_best:
                current_best = obj
            best_so_far.append(current_best)

        ax.plot(iterations, best_so_far, 'r-', linewidth=2, label='Best so far')
        ax.set_xlabel('Iteration')
        ax.set_ylabel('Objective Score')
        ax.set_title('Optimization Convergence')
        ax.legend()
        ax.grid(True, alpha=0.3)

        plot_file = results_dir / f'convergence_{timestamp}.png'
        plt.savefig(plot_file, dpi=300, bbox_inches='tight')
        plt.close()

        print(f"  [+] Convergence plot saved to: {plot_file}")
    except Exception as e:
        print(f"  [!] Could not create plots: {e}")


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Bayesian optimization for hybrid weights')
    parser.add_argument('--n-iter', type=int, default=150, help='Number of iterations')
    parser.add_argument('--n-initial', type=int, default=25, help='Random initialization points')
    args = parser.parse_args()

    start_time = time.time()

    results = run_optimization(n_iter=args.n_iter, n_initial=args.n_initial)

    # Save final results
    save_results(
        results['all_results'],
        results['best_config'],
        results['best_metrics'],
        results['optimizer']
    )

    # Print summary
    elapsed = time.time() - start_time
    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()
    if results['best_config'] is not None:
        print("Best configuration found:")
        print(f"  initial_weight: {results['best_config'][0]:.3f}")
        print(f"  phase1_end: {int(results['best_config'][1])}")
        print(f"  phase2_end: {int(results['best_config'][2])}")
        print(f"  phase1_target: {results['best_config'][3]:.3f}")
        print(f"  phase2_target: {results['best_config'][4]:.3f}")
        print(f"  max_weight: {results['best_config'][5]:.3f}")
        print()
        print(f"Best objective: {results['best_metrics']['objective']:.4f}")
    else:
        print("No valid configuration found!")

    print()
    print(f"Total time: {elapsed/3600:.2f} hours")
    print()


if __name__ == '__main__':
    main()
