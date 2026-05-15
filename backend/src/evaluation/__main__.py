"""
FinAI Evaluation CLI

Usage:
    cd backend
    python -m src.evaluation

Prompts for start_row and end_row, then runs the evaluation pipeline:
  1. Loads scenarios from Google Sheets
  2. Calls the AI chat API for each scenario
  3. Scores responses with DeepEval metrics
  4. Writes results back to Google Sheets (columns K–O)
  5. Logs cost summary to evaluation_costs.jsonl
"""
from __future__ import annotations

import asyncio
import sys

from loguru import logger


def _prompt_int(prompt: str, default: int) -> int:
    while True:
        raw = input(f"{prompt} [{default}]: ").strip()
        if not raw:
            return default
        try:
            val = int(raw)
            if val < 1:
                print("  Value must be a positive integer. Try again.")
                continue
            return val
        except ValueError:
            print("  Invalid number. Try again.")


def main() -> None:
    print("=" * 50)
    print("  FinAI — AI Module Evaluation Runner")
    print("=" * 50)
    print()
    print("Rows refer to the Google Spreadsheet (row 1 = header, data starts at row 2).")
    print()

    start_row = _prompt_int("Start row", 2)
    end_row = _prompt_int("End row  ", 92)

    if end_row < start_row:
        print(f"\n[ERROR] end_row ({end_row}) must be ≥ start_row ({start_row}).")
        sys.exit(1)

    print(f"\nRunning evaluation for rows {start_row}–{end_row}...\n")

    try:
        from src.evaluation.runner import run_evaluation  # noqa: PLC0415

        report = asyncio.run(run_evaluation(start_row, end_row))
    except (ValueError, RuntimeError, FileNotFoundError) as e:
        print(f"\n[ERROR] {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nEvaluation interrupted by user.")
        sys.exit(0)

    print("\n" + "=" * 50)
    print(report.summary_text())
    print("=" * 50)

    if report.results:
        print("\nPer-scenario results:")
        print(f"  {'Row':<5} {'ID':<5} {'Turn':<6} {'Agent':<18} {'Score':<7} {'Result'}")
        print("  " + "-" * 60)
        for er in report.results:
            s = er.scenario
            result_label = "PASSED" if er.scored.overall_passed else "FAILED"
            agent_display = er.chat_result.actual_agent[:16]
            score_display = f"{er.scored.final_score:.2f}"
            print(
                f"  {s.sheet_row:<5} {s.scenario_id:<5} "
                f"{str(s.turn_number):<6} {agent_display:<18} "
                f"{score_display:<7} {result_label}"
            )

    print(f"\nResults written to Google Sheets (columns K–O).")
    if report.cost_summary:
        cs = report.cost_summary
        print(
            f"Cost log appended to '{cs.judge_model}' run: "
            f"${cs.estimated_cost_usd:.4f} USD "
            f"({cs.estimated_input_tokens:,} input / {cs.estimated_output_tokens:,} output tokens)"
        )


if __name__ == "__main__":
    main()
