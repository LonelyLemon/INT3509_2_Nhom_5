from __future__ import annotations

import json
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone

from loguru import logger

from src.evaluation import api_client, sheets_client
from src.evaluation.api_client import ChatResult
from src.evaluation.config import eval_settings
from src.evaluation.metrics import ScoredResult, score_scenario
from src.evaluation.sheets_client import ScenarioResult, ScenarioRow

# gpt-4o-mini pricing (USD per 1M tokens), adjust if model changes
_COST_INPUT_PER_M = 0.15
_COST_OUTPUT_PER_M = 0.60
# Rough estimate: each GEval call costs ~400 input + 150 output tokens
_TOKENS_INPUT_PER_METRIC = 400
_TOKENS_OUTPUT_PER_METRIC = 150


@dataclass
class CostSummary:
    scenarios_evaluated: int
    metrics_evaluated: int
    judge_model: str
    estimated_input_tokens: int
    estimated_output_tokens: int
    estimated_cost_usd: float


@dataclass
class ScenarioEvalResult:
    scenario: ScenarioRow
    chat_result: ChatResult
    scored: ScoredResult


@dataclass
class EvaluationReport:
    start_row: int
    end_row: int
    total_scenarios: int
    passed: int
    failed: int
    errors: int
    results: list[ScenarioEvalResult] = field(default_factory=list)
    cost_summary: CostSummary | None = None

    def summary_text(self) -> str:
        lines = [
            f"Evaluation complete — rows {self.start_row}–{self.end_row}",
            f"  Total : {self.total_scenarios}",
            f"  Passed: {self.passed}",
            f"  Failed: {self.failed}",
            f"  Errors: {self.errors}",
        ]
        if self.cost_summary:
            cs = self.cost_summary
            lines += [
                f"  Cost  : ${cs.estimated_cost_usd:.4f} USD "
                f"({cs.estimated_input_tokens:,} in / {cs.estimated_output_tokens:,} out tokens, "
                f"model: {cs.judge_model})",
            ]
        return "\n".join(lines)


def _group_by_id(scenarios: list[ScenarioRow]) -> list[list[ScenarioRow]]:
    """Group scenarios by ID, preserving insertion order of first occurrence."""
    groups: dict[str, list[ScenarioRow]] = defaultdict(list)
    order: list[str] = []
    for s in scenarios:
        if s.scenario_id not in groups:
            order.append(s.scenario_id)
        groups[s.scenario_id].append(s)

    result = []
    for sid in order:
        turns = sorted(groups[sid], key=lambda s: s.turn_number)
        result.append(turns)
    return result


def _build_sheet_result(
    scenario: ScenarioRow,
    chat_result: ChatResult,
    scored: ScoredResult,
) -> ScenarioResult:
    return ScenarioResult(
        sheet_row=scenario.sheet_row,
        actual_agent=chat_result.actual_agent,
        actual_tools=chat_result.tools_called,
        actual_response=chat_result.full_response,
        score_text=scored.score_text,
        overall_result="PASSED" if scored.overall_passed else "FAILED",
    )


def _log_cost(report: EvaluationReport) -> None:
    """Append a cost entry to the JSONL cost log file."""
    if not report.cost_summary:
        return
    cs = report.cost_summary
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "start_row": report.start_row,
        "end_row": report.end_row,
        "scenarios_evaluated": cs.scenarios_evaluated,
        "metrics_evaluated": cs.metrics_evaluated,
        "judge_model": cs.judge_model,
        "estimated_input_tokens": cs.estimated_input_tokens,
        "estimated_output_tokens": cs.estimated_output_tokens,
        "estimated_cost_usd": round(cs.estimated_cost_usd, 6),
        "passed": report.passed,
        "failed": report.failed,
        "errors": report.errors,
        "pass_rate_pct": round(
            report.passed / max(report.total_scenarios, 1) * 100, 1
        ),
    }
    log_path = eval_settings.EVAL_COST_LOG_FILE
    try:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
        logger.info(f"Cost log written to {log_path}: ${cs.estimated_cost_usd:.4f} USD")
    except OSError as e:
        logger.warning(f"Could not write cost log to {log_path}: {e}")


async def run_evaluation(start_row: int, end_row: int) -> EvaluationReport:
    """
    Main evaluation entry point.

    1. Load & validate scenarios from Google Sheets
    2. Login to the backend API
    3. Run each scenario (multi-turn groups share a conversation_id)
    4. Score each turn with DeepEval metrics
    5. Write results back to Google Sheets
    6. Log cost summary
    """
    # ── Load scenarios ────────────────────────────────────────────────────────
    logger.info(f"Loading scenarios from rows {start_row}–{end_row}...")
    scenarios = sheets_client.load_scenarios(start_row, end_row)
    groups = _group_by_id(scenarios)
    logger.info(f"Found {len(scenarios)} turns in {len(groups)} scenario group(s).")

    # ── Login ─────────────────────────────────────────────────────────────────
    email = eval_settings.eval_email
    password = eval_settings.eval_password
    if not email or not password:
        raise RuntimeError(
            "Evaluation credentials not configured. "
            "Set EVAL_USER_EMAIL / EVAL_USER_PASSWORD (or ADMIN_EMAIL / ADMIN_PASSWORD) in .env."
        )
    logger.info(f"Logging in as {email}...")
    token = await api_client.login(email, password)
    logger.info("Login successful.")

    # ── Run scenarios ─────────────────────────────────────────────────────────
    eval_results: list[ScenarioEvalResult] = []
    sheet_results: list[ScenarioResult] = []
    total_metrics = 0

    for group in groups:
        conversation_id: str | None = None
        sid = group[0].scenario_id
        is_multi = any(s.turn_number > 0 for s in group)
        logger.info(
            f"Scenario {sid} — {len(group)} turn(s)"
            + (" [multi-turn]" if is_multi else "")
        )

        for scenario in group:
            turn_label = (
                f"turn {scenario.turn_number}" if scenario.turn_number > 0 else "single"
            )
            logger.info(
                f"  [{scenario.scenario_id} / {turn_label}] "
                f"Input: {scenario.user_input[:60]!r}"
            )

            # Call the API
            chat_result = await api_client.chat(
                message=scenario.user_input,
                token=token,
                conversation_id=conversation_id if is_multi else None,
            )

            if chat_result.error and not chat_result.is_blocked:
                logger.error(
                    f"  API error for row {scenario.sheet_row}: {chat_result.error}"
                )
                # Create a minimal failed result so we still write something to the sheet
                error_scored = ScoredResult(
                    metric_results=[],
                    final_score=0.0,
                    overall_passed=False,
                    score_text=f"FINAL SCORE: 0.00\n{'=' * 24}\n❌ API Error: {chat_result.error}",
                )
                eval_results.append(
                    ScenarioEvalResult(scenario, chat_result, error_scored)
                )
                sheet_results.append(
                    ScenarioResult(
                        sheet_row=scenario.sheet_row,
                        actual_agent=chat_result.actual_agent,
                        actual_tools=[],
                        actual_response=f"ERROR: {chat_result.error}",
                        score_text=error_scored.score_text,
                        overall_result="FAILED",
                    )
                )
                continue

            # Carry conversation_id forward for multi-turn
            if is_multi and chat_result.conversation_id:
                conversation_id = chat_result.conversation_id

            # Score
            logger.info(f"  Scoring turn with DeepEval...")
            scored = score_scenario(scenario, chat_result)
            total_metrics += len(scored.metric_results)

            status = "PASSED" if scored.overall_passed else "FAILED"
            logger.info(
                f"  → {status} | final_score={scored.final_score:.2f} | "
                f"agent={chat_result.actual_agent} | tools={chat_result.tools_called}"
            )

            eval_results.append(ScenarioEvalResult(scenario, chat_result, scored))
            sheet_results.append(_build_sheet_result(scenario, chat_result, scored))

    # ── Aggregate counts ──────────────────────────────────────────────────────
    passed = sum(
        1 for r in eval_results if r.scored.overall_passed and not r.chat_result.error
    )
    failed = sum(
        1 for r in eval_results if not r.scored.overall_passed and not r.chat_result.error
    )
    errors = sum(
        1 for r in eval_results if r.chat_result.error and not r.chat_result.is_blocked
    )

    # ── Write back to Sheets ──────────────────────────────────────────────────
    logger.info("Writing results to Google Sheets...")
    try:
        sheets_client.write_results(sheet_results)
    except Exception as e:
        logger.error(f"Failed to write results to Google Sheets: {e}")

    # ── Cost summary ──────────────────────────────────────────────────────────
    input_tokens = total_metrics * _TOKENS_INPUT_PER_METRIC
    output_tokens = total_metrics * _TOKENS_OUTPUT_PER_METRIC
    cost_usd = (
        input_tokens / 1_000_000 * _COST_INPUT_PER_M
        + output_tokens / 1_000_000 * _COST_OUTPUT_PER_M
    )
    cost_summary = CostSummary(
        scenarios_evaluated=len(eval_results),
        metrics_evaluated=total_metrics,
        judge_model=eval_settings.DEEPEVAL_JUDGE_MODEL,
        estimated_input_tokens=input_tokens,
        estimated_output_tokens=output_tokens,
        estimated_cost_usd=cost_usd,
    )

    report = EvaluationReport(
        start_row=start_row,
        end_row=end_row,
        total_scenarios=len(eval_results),
        passed=passed,
        failed=failed,
        errors=errors,
        results=eval_results,
        cost_summary=cost_summary,
    )

    _log_cost(report)
    logger.info(report.summary_text())
    return report
