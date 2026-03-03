# -*- coding: utf-8 -*-
"""The hooks for the agent"""
from typing import Any

import requests
from agentscope.agent import AgentBase
from agentscope.plan import Plan, PlanNotebook


def studio_pre_print_hook(self: AgentBase, kwargs: dict[str, Any]) -> None:
    """Forward the message to the studio application interface."""
    msg = kwargs["msg"]
    message_data = msg.to_dict()

    message_data["content"] = msg.get_content_blocks()

    n_retry = 0
    while True:
        try:
            res = requests.post(
                f"{studio_pre_print_hook.url}/trpc/pushMessageToFridayApp",
                json={
                    "replyId": self._reply_id,
                    "msg": message_data,
                },
            )
            res.raise_for_status()
            break
        except Exception as e:
            if n_retry < 3:
                n_retry += 1
                continue

            raise e from None


def studio_post_reply_hook(self: AgentBase, *args, **kwargs) -> None:
    """Send the finished signal to the studio application interface."""
    n_retry = 0
    while True:
        try:
            res = requests.post(
                f"{studio_pre_print_hook.url}/trpc/pushFinishedSignalToFridayApp",
                json={"replyId": self._reply_id}
            )
            res.raise_for_status()
            break
        except Exception as e:
            if n_retry < 3:
                n_retry += 1
                continue

            raise e from None


async def push_plan_hook(
    notebook: PlanNotebook,
    plan: Plan | None,
) -> None:
    """Push plan updates to the studio frontend via HTTP request.
    
    This hook is triggered whenever the plan changes (create, update, delete).
    It sends the current plan, and if plan is None (finished), also sends historical plans.
    
    Args:
        notebook: The PlanNotebook instance
        plan: The current plan (None if plan is finished/cleared)
    """
    if not hasattr(push_plan_hook, 'url'):
        return
    
    # Get current plan data
    current_plan_data = plan.model_dump() if plan else None
    
    # If plan is None (finished), also load historical plans in the same request
    historical_plans_data = []
    if plan is None:
        try:
            historical_plans = await notebook.storage.get_plans()
            historical_plans_data = [p.model_dump() for p in historical_plans]
        except Exception:
            pass
    
    n_retry = 0
    while True:
        try:
            res = requests.post(
                f"{push_plan_hook.url}/trpc/pushCurrentPlanToFridayApp",
                json={
                    "currentPlan": current_plan_data,
                    "historicalPlans": historical_plans_data,
                },
            )
            res.raise_for_status()
            break
        except Exception:
            if n_retry < 3:
                n_retry += 1
                continue
            break
