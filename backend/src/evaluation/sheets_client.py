from __future__ import annotations

import os
from dataclasses import dataclass

import gspread
from google.oauth2.service_account import Credentials
from loguru import logger

from src.evaluation.config import eval_settings

_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

_VALID_AGENTS = {"guide_agent", "data_agent", "analysis_agent", "advisor_agent", "blocked"}
_VALID_GUARDRAILS = {"passthrough", "refusal"}

# Column indices (0-based within a row list)
_COL_ID = 0
_COL_MODULE = 1
_COL_SCENARIO_NAME = 2
_COL_TURN = 3
_COL_DESCRIPTION = 4
_COL_USER_INPUT = 5
_COL_EXPECTED_AGENT = 6
_COL_EXPECTED_TOOLS = 7
_COL_GUARDRAILS_TYPE = 8
_COL_EXPECTED_RESPONSE = 9
# Write columns (0-based)
_COL_ACTUAL_AGENT = 10
_COL_ACTUAL_TOOLS = 11
_COL_ACTUAL_RESPONSE = 12
_COL_SCORE = 13
_COL_OVERALL_RESULT = 14


@dataclass
class ScenarioRow:
    sheet_row: int          # 1-indexed row in the spreadsheet
    scenario_id: str
    module: str
    scenario_name: str
    turn_number: int        # -1 for single-turn, 1+ for multi-turn
    description: str
    user_input: str
    expected_agent: str
    expected_tools: list[str]   # empty list if "-"
    guardrails_type: str
    expected_response_description: str


@dataclass
class ScenarioResult:
    sheet_row: int
    actual_agent: str
    actual_tools: list[str]
    actual_response: str
    score_text: str
    overall_result: str     # "PASSED" or "FAILED"


def _get_worksheet() -> gspread.Worksheet:
    creds_file = eval_settings.GSHEETS_CREDENTIALS_FILE
    if not os.path.isabs(creds_file):
        # Resolve relative to the backend/ directory (where the server runs from)
        creds_file = os.path.join(os.getcwd(), creds_file)

    if not os.path.exists(creds_file):
        raise FileNotFoundError(
            f"Google Sheets service account file not found: {creds_file}. "
            "Set GSHEETS_CREDENTIALS_FILE in your .env to the path of the JSON key file."
        )

    creds = Credentials.from_service_account_file(creds_file, scopes=_SCOPES)
    client = gspread.authorize(creds)
    spreadsheet = client.open_by_key(eval_settings.GSHEETS_SPREADSHEET_ID)
    return spreadsheet.worksheet(eval_settings.GSHEETS_WORKSHEET_NAME)


def _parse_tools(raw: str) -> list[str]:
    if not raw or raw.strip() in ("-", ""):
        return []
    return [t.strip() for t in raw.split(",") if t.strip()]


def _validate_row(row_data: list[str], sheet_row: int) -> ScenarioRow:
    def _get(idx: int, name: str) -> str:
        if idx >= len(row_data):
            raise ValueError(f"Row {sheet_row}: missing column '{name}' (index {idx}).")
        return row_data[idx].strip()

    scenario_id = _get(_COL_ID, "ID")
    if not scenario_id:
        raise ValueError(f"Row {sheet_row}: column 'ID' is empty.")

    module = _get(_COL_MODULE, "Module")
    scenario_name = _get(_COL_SCENARIO_NAME, "Scenario Name")
    description = _get(_COL_DESCRIPTION, "Test Case Description")

    turn_raw = _get(_COL_TURN, "Turn #")
    try:
        turn_number = int(turn_raw)
    except ValueError:
        raise ValueError(
            f"Row {sheet_row}: column 'Turn #' must be an integer, got '{turn_raw}'."
        )
    if turn_number != -1 and turn_number < 1:
        raise ValueError(
            f"Row {sheet_row}: column 'Turn #' must be -1 or ≥1, got {turn_number}."
        )

    user_input = _get(_COL_USER_INPUT, "EXACT User Input")
    if not user_input:
        raise ValueError(f"Row {sheet_row}: column 'EXACT User Input' is empty.")

    expected_agent = _get(_COL_EXPECTED_AGENT, "Expected Agent")
    # Strip backticks that may be in the sheet (markdown formatting)
    expected_agent = expected_agent.strip("`")
    if expected_agent not in _VALID_AGENTS:
        raise ValueError(
            f"Row {sheet_row}: 'Expected Agent' is '{expected_agent}', "
            f"must be one of {_VALID_AGENTS}."
        )

    expected_tools_raw = _get(_COL_EXPECTED_TOOLS, "Expected Tools Called")
    expected_tools = _parse_tools(expected_tools_raw)

    guardrails_type = _get(_COL_GUARDRAILS_TYPE, "Guardrails Type")
    # Strip backticks
    guardrails_type = guardrails_type.strip("`")
    if guardrails_type not in _VALID_GUARDRAILS:
        raise ValueError(
            f"Row {sheet_row}: 'Guardrails Type' is '{guardrails_type}', "
            f"must be one of {_VALID_GUARDRAILS}."
        )

    expected_response = _get(_COL_EXPECTED_RESPONSE, "Expected Response Description")
    if not expected_response:
        raise ValueError(
            f"Row {sheet_row}: column 'Expected Response Description' is empty."
        )

    return ScenarioRow(
        sheet_row=sheet_row,
        scenario_id=scenario_id,
        module=module,
        scenario_name=scenario_name,
        turn_number=turn_number,
        description=description,
        user_input=user_input,
        expected_agent=expected_agent,
        expected_tools=expected_tools,
        guardrails_type=guardrails_type,
        expected_response_description=expected_response,
    )


def load_scenarios(start_row: int, end_row: int) -> list[ScenarioRow]:
    """
    Load and validate scenario rows from the Google Sheet.

    start_row / end_row are 1-indexed sheet rows (row 1 = header).
    Data rows start at 2.
    """
    if start_row < 2:
        raise ValueError("start_row must be ≥ 2 (row 1 is the header).")
    if end_row < start_row:
        raise ValueError(f"end_row ({end_row}) must be ≥ start_row ({start_row}).")

    ws = _get_worksheet()

    # Fetch header row to verify column structure
    try:
        header = ws.row_values(1)
    except Exception as e:
        raise RuntimeError(f"Failed to read header row from Google Sheets: {e}") from e

    expected_headers = [
        "ID", "Module", "Scenario Name", "Turn #", "Test Case Description",
        "EXACT User Input", "Expected Agent", "Expected Tools Called",
        "Guardrails Type", "Expected Response Description",
    ]
    for i, expected in enumerate(expected_headers):
        actual = header[i].strip() if i < len(header) else ""
        if actual != expected:
            raise ValueError(
                f"Spreadsheet column {i + 1} header mismatch: "
                f"expected '{expected}', got '{actual}'. "
                "Please verify the spreadsheet structure matches ai_evaluation_scenarios.md."
            )

    # Fetch requested rows in one batch call
    try:
        all_rows = ws.get_all_values()  # list of lists, row-0 = header
    except Exception as e:
        raise RuntimeError(f"Failed to read data from Google Sheets: {e}") from e

    scenarios: list[ScenarioRow] = []
    for sheet_row in range(start_row, end_row + 1):
        data_idx = sheet_row - 1  # 0-based index in all_rows
        if data_idx >= len(all_rows):
            logger.warning(f"Row {sheet_row} is beyond the sheet data, stopping early.")
            break
        row_data = all_rows[data_idx]
        # Skip completely empty rows
        if not any(cell.strip() for cell in row_data):
            logger.debug(f"Row {sheet_row} is empty, skipping.")
            continue
        scenario = _validate_row(row_data, sheet_row)
        scenarios.append(scenario)

    if not scenarios:
        raise ValueError(f"No valid scenarios found between rows {start_row} and {end_row}.")

    logger.info(f"Loaded {len(scenarios)} scenarios from rows {start_row}–{end_row}.")
    return scenarios


def write_results(results: list[ScenarioResult]) -> None:
    """Write evaluation results back to columns K–O for each result row."""
    if not results:
        return

    ws = _get_worksheet()

    # Build batch update: list of (row, col_letter, value)
    # gspread uses 1-indexed rows and columns
    # K=11, L=12, M=13, N=14, O=15
    updates: list[dict] = []
    for res in results:
        row = res.sheet_row
        updates.append({
            "range": f"K{row}:O{row}",
            "values": [[
                res.actual_agent,
                ", ".join(res.actual_tools) if res.actual_tools else "-",
                res.actual_response[:50000],  # Sheets cell limit
                res.score_text,
                res.overall_result,
            ]],
        })

    try:
        ws.batch_update(updates, value_input_option="RAW")
        logger.info(f"Wrote results for {len(results)} rows to Google Sheets.")
    except Exception as e:
        logger.error(f"Failed to write results to Google Sheets: {e}")
        raise
