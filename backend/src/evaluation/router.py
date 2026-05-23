from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, model_validator

from src.auth.dependencies import get_admin_user
from src.auth.models import User
from src.evaluation import runner

eval_route = APIRouter(prefix="/evaluation", tags=["Evaluation"])


class EvaluationRequest(BaseModel):
    start_row: int = Field(..., ge=2, description="First data row (≥2; row 1 is the header)")
    end_row: int = Field(..., ge=2, description="Last data row (inclusive)")

    @model_validator(mode="after")
    def check_row_range(self) -> "EvaluationRequest":
        if self.end_row < self.start_row:
            raise ValueError(f"end_row ({self.end_row}) must be ≥ start_row ({self.start_row})")
        return self


class MetricResultResponse(BaseModel):
    name: str
    score: float
    reason: str
    passed: bool


class ScenarioResultResponse(BaseModel):
    sheet_row: int
    scenario_id: str
    scenario_name: str
    turn_number: int
    user_input: str
    expected_agent: str
    actual_agent: str
    tools_called: list[str]
    final_score: float
    overall_result: str
    metric_results: list[MetricResultResponse]


class CostSummaryResponse(BaseModel):
    scenarios_evaluated: int
    metrics_evaluated: int
    judge_model: str
    estimated_input_tokens: int
    estimated_output_tokens: int
    estimated_cost_usd: float


class EvaluationResponse(BaseModel):
    start_row: int
    end_row: int
    total_scenarios: int
    passed: int
    failed: int
    errors: int
    cost_summary: CostSummaryResponse | None
    results: list[ScenarioResultResponse]


@eval_route.post(
    "/run",
    response_model=EvaluationResponse,
    summary="Run AI evaluation on a range of spreadsheet rows",
    description=(
        "Loads scenarios from the configured Google Spreadsheet, calls the AI chat API "
        "for each scenario, scores responses with DeepEval metrics, writes results back "
        "to the sheet, and returns a full report. Admin authentication required."
    ),
)
async def run_evaluation_endpoint(
    payload: EvaluationRequest,
    _admin: User = Depends(get_admin_user),
) -> EvaluationResponse:
    try:
        report = await runner.run_evaluation(payload.start_row, payload.end_row)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

    scenario_responses = []
    for er in report.results:
        scenario_responses.append(
            ScenarioResultResponse(
                sheet_row=er.scenario.sheet_row,
                scenario_id=er.scenario.scenario_id,
                scenario_name=er.scenario.scenario_name,
                turn_number=er.scenario.turn_number,
                user_input=er.scenario.user_input,
                expected_agent=er.scenario.expected_agent,
                actual_agent=er.chat_result.actual_agent,
                tools_called=er.chat_result.tools_called,
                final_score=er.scored.final_score,
                overall_result="PASSED" if er.scored.overall_passed else "FAILED",
                metric_results=[
                    MetricResultResponse(
                        name=mr.name,
                        score=mr.score,
                        reason=mr.reason,
                        passed=mr.passed,
                    )
                    for mr in er.scored.metric_results
                ],
            )
        )

    cost_resp = None
    if report.cost_summary:
        cs = report.cost_summary
        cost_resp = CostSummaryResponse(
            scenarios_evaluated=cs.scenarios_evaluated,
            metrics_evaluated=cs.metrics_evaluated,
            judge_model=cs.judge_model,
            estimated_input_tokens=cs.estimated_input_tokens,
            estimated_output_tokens=cs.estimated_output_tokens,
            estimated_cost_usd=cs.estimated_cost_usd,
        )

    return EvaluationResponse(
        start_row=report.start_row,
        end_row=report.end_row,
        total_scenarios=report.total_scenarios,
        passed=report.passed,
        failed=report.failed,
        errors=report.errors,
        cost_summary=cost_resp,
        results=scenario_responses,
    )
