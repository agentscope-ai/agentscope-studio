# -*- coding: utf-8 -*-
"""JSON-based plan storage implementation using JSONSession."""
from collections import OrderedDict

from agentscope.plan import Plan, PlanStorageBase


class JSONPlanStorage(PlanStorageBase):
    """Plan storage that persists via PlanNotebook's JSONSession.
    
    This class does not manage its own session or serialization.
    All persistence is handled by PlanNotebook, which serializes
    this storage object as part of its own state.
    """

    def __init__(self) -> None:
        """Initialize the JSON plan storage.
        
        The storage only maintains an in-memory OrderedDict of plans.
        Persistence is delegated to the parent PlanNotebook.
        """
        super().__init__()
        self.plans = OrderedDict()
        
        # Register state serialization for the plans dict
        # This will be triggered when PlanNotebook serializes
        self.register_state(
            "plans",
            lambda plans: {k: v.model_dump() for k, v in plans.items()},
            lambda json_data: OrderedDict(
                (k, Plan.model_validate(v)) for k, v in json_data.items()
            ),
        )

    async def add_plan(self, plan: Plan, override: bool = True) -> None:
        """Add a plan to the storage.
        
        Persistence is handled by PlanNotebook's save mechanism.
        
        Args:
            plan: The plan to be added
            override: Whether to override the existing plan with the same ID
        """
        if plan.id in self.plans and not override:
            raise ValueError(
                f"Plan with id {plan.id} already exists.",
            )
        self.plans[plan.id] = plan

    async def delete_plan(self, plan_id: str) -> None:
        """Delete a plan from the storage.
        
        Persistence is handled by PlanNotebook's save mechanism.
        
        Args:
            plan_id: The ID of the plan to be deleted
        """
        self.plans.pop(plan_id, None)

    async def get_plans(self) -> list[Plan]:
        """Get all plans from the storage.
        
        Returns:
            A list of all plans in the storage
        """
        return list(self.plans.values())

    async def get_plan(self, plan_id: str) -> Plan | None:
        """Get a plan by its ID.
        
        Args:
            plan_id: The ID of the plan to be retrieved
            
        Returns:
            The plan with the specified ID, or None if not found
        """
        return self.plans.get(plan_id, None)
