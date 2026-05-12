import uuid
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

# AgentDeps is the shared dependency injected into all specialized agents.
# Kept here so all agent files can import from one place without circular deps.


@dataclass
class AgentDeps:
    db: AsyncSession
    user_id: uuid.UUID


# Re-export agent getters for backward compatibility and convenient imports.
from src.ai.agents.intent_agent import get_intent_agent, IntentResult  # noqa: E402
from src.ai.agents.guide_agent import get_guide_agent  # noqa: E402
from src.ai.agents.data_agent import get_data_agent  # noqa: E402
from src.ai.agents.analysis_agent import get_analysis_agent  # noqa: E402
from src.ai.agents.advisor_agent import get_advisor_agent  # noqa: E402

__all__ = [
    "AgentDeps",
    "get_intent_agent",
    "IntentResult",
    "get_guide_agent",
    "get_data_agent",
    "get_analysis_agent",
    "get_advisor_agent",
]
