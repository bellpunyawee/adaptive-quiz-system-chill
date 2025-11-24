"""
Evaluate a hybrid weight configuration using Monte Carlo simulation.

This script acts as a bridge between Python Bayesian optimization
and the TypeScript monte-carlo simulation.
"""

import subprocess
import json
import os
import sys
from pathlib import Path


def evaluate_config(
    initial_weight: float,
    phase1_end: int,
    phase2_end: int,
    phase1_target: float,
    phase2_target: float,
    max_weight: float
) -> dict:
    """
    Evaluate a configuration by running monte-carlo simulation.

    Args:
        initial_weight: Starting LinUCB weight (0.40-0.60)
        phase1_end: Phase 1→2 transition (5-15 questions)
        phase2_end: Phase 2→3 transition (15-30 questions)
        phase1_target: Weight at end of phase 1 (0.55-0.75)
        phase2_target: Weight at end of phase 2 (0.75-0.95)
        max_weight: Maximum weight cap (0.85-0.98)

    Returns:
        dict with keys: correlation, rmse, mae, regret
    """

    # Set environment variables for config injection
    env = os.environ.copy()
    env['HYBRID_INITIAL_WEIGHT'] = str(initial_weight)
    env['HYBRID_PHASE1_END'] = str(int(phase1_end))
    env['HYBRID_PHASE2_END'] = str(int(phase2_end))
    env['HYBRID_PHASE1_TARGET'] = str(phase1_target)
    env['HYBRID_PHASE2_TARGET'] = str(phase2_target)
    env['HYBRID_MAX_WEIGHT'] = str(max_weight)
    env['HYBRID_OPTIMIZATION_MODE'] = 'true'  # Signal to use env vars

    # Path to monte-carlo script
    script_dir = Path(__file__).parent.parent / 'testing'
    script_path = script_dir / 'monte-carlo-contextual-bandit.ts'

    # Run monte-carlo simulation
    # Use smaller config for faster optimization: testing (100 students, 50 questions)
    cmd = ['npx', 'tsx', str(script_path), 'testing', 'Balanced']

    try:
        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            encoding='utf-8',  # Force UTF-8 encoding on Windows
            errors='replace',  # Replace invalid chars instead of crashing
            timeout=300,  # 5 minute timeout per iteration
            cwd=Path(__file__).parent.parent.parent,  # Project root
            shell=True  # Required on Windows for npx to work
        )

        if result.returncode != 0:
            print(f"Monte-carlo stderr:\n{result.stderr}", file=sys.stderr)
            print(f"Error running monte-carlo (exit code {result.returncode})", file=sys.stderr)
            return {
                'correlation': 0.0,
                'rmse': 999.0,
                'mae': 999.0,
                'regret': 999.0,
                'error': result.stderr
            }

        # Find the results JSON file (most recent in results/ directory)
        results_dir = Path(__file__).parent.parent / 'testing' / 'results'
        json_files = list(results_dir.glob('cb-simulation-*.json'))

        if not json_files:
            print("No results file found!", file=sys.stderr)
            return {
                'correlation': 0.0,
                'rmse': 999.0,
                'mae': 999.0,
                'regret': 999.0,
                'error': 'No results file'
            }

        # Get most recent file
        latest_file = max(json_files, key=lambda p: p.stat().st_mtime)

        # Parse results
        with open(latest_file, 'r') as f:
            data = json.load(f)

        # Extract hybrid mode metrics
        hybrid_metrics = data['modes']['hybrid']

        return {
            'correlation': hybrid_metrics['correlation'],
            'rmse': hybrid_metrics['rmse'],
            'mae': hybrid_metrics['mae'],
            'regret': hybrid_metrics['performance']['avgRegret']
        }

    except subprocess.TimeoutExpired:
        print("Monte-carlo simulation timed out!", file=sys.stderr)
        return {
            'correlation': 0.0,
            'rmse': 999.0,
            'mae': 999.0,
            'regret': 999.0,
            'error': 'Timeout'
        }
    except Exception as e:
        print(f"Error evaluating config: {e}", file=sys.stderr)
        return {
            'correlation': 0.0,
            'rmse': 999.0,
            'mae': 999.0,
            'regret': 999.0,
            'error': str(e)
        }


if __name__ == '__main__':
    # Test the evaluator with default config
    print("Testing evaluator with default configuration...")
    results = evaluate_config(
        initial_weight=0.50,
        phase1_end=10,
        phase2_end=20,
        phase1_target=0.65,
        phase2_target=0.85,
        max_weight=0.90
    )
    print(json.dumps(results, indent=2))
