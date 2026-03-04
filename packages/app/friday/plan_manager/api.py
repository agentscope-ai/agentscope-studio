# -*- coding: utf-8 -*-
"""Plan management API for frontend to manipulate plans."""
import sys
import json
from pathlib import Path
from agentscope.plan import PlanNotebook, Plan, SubTask
from plan_manager import JSONPlanStorage
from utils.common import get_local_file_path, get_studio_url
from utils.constants import FRIDAY_SESSION_ID
from hook import push_plan_hook


def _extract_message_from_tool_response(result) -> str:
    """Extract message text from ToolResponse object.
    
    Args:
        result: ToolResponse object with content list
        
    Returns:
        str: Extracted message text or "Success" as default
    """
    if not result.content:
        return "Success"
    
    first_content = result.content[0]
    if isinstance(first_content, dict):
        return first_content.get("text", "Success")
    elif hasattr(first_content, "text"):
        return first_content.text
    return "Success"


def get_plans_from_storage() -> dict:
    """Get current and historical plans using PlanNotebook and JSONSession.
    
    This function initializes a PlanNotebook and its JSONPlanStorage,
    restores state from JSONSession, and then returns both the current
    plan and all historical plans.
    
    Returns:
        A dict containing:
        - currentPlan: The current plan (None if no plan is active)
        - historicalPlans: List of all historical plans (done/abandoned)
    """
    import asyncio
    from agentscope.session import JSONSession

    # Resolve data directory using AgentScope helper
    path_dialog_history = get_local_file_path("")

    # Initialize storage and notebook
    plan_storage = JSONPlanStorage()
    plan_notebook = PlanNotebook(storage=plan_storage)

    # Restore notebook state from session if exists
    try:
        session = JSONSession(save_dir=path_dialog_history)
    except TypeError:
        session = JSONSession(
            session_id=FRIDAY_SESSION_ID,
            save_dir=path_dialog_history,
        )

    try:
        asyncio.run(
            session.load_session_state(
                session_id=FRIDAY_SESSION_ID,
                plan_notebook=plan_notebook,
            )
        )
    except Exception:
        # If no session yet, just continue with empty notebook
        pass

    # Load all plans from storage (these are historical plans only)
    try:
        plans = asyncio.run(plan_storage.get_plans())
    except Exception:
        plans = []

    # Get current plan from notebook (from session state)
    # Note: current_plan should only come from session, not from storage
    current_plan = plan_notebook.current_plan

    # Historical plans: all plans in storage except the current one (if any)
    if current_plan is None:
        historical_plans = plans
    else:
        historical_plans = [
            p for p in plans if p.id != current_plan.id
        ]

    return {
        "currentPlan": current_plan.model_dump() if current_plan else None,
        "historicalPlans": [p.model_dump() for p in historical_plans],
    }


def revise_plan(
    action: str,  # 'add', 'revise', 'delete'
    subtask_idx: int,
    subtask_data: dict = None,
) -> dict:
    """Revise the current plan.
    
    Args:
        action: The action to perform ('add', 'revise', 'delete')
        subtask_idx: The index of the subtask
        subtask_data: The subtask data (for add/revise actions)
        
    Returns:
        dict with 'success' and 'message' keys
    """
    try:
        import asyncio
        from agentscope.session import JSONSession
        
        # Load the plan storage
        path_dialog_history = get_local_file_path("")
        plan_storage = JSONPlanStorage()
        
        # Create a new PlanNotebook instance
        plan_notebook = PlanNotebook(storage=plan_storage)
        
        # Register plan change hook to push updates to frontend
        # Get studio_url from config file saved by main.py
        studio_url = get_studio_url()
        if studio_url:
            push_plan_hook.url = studio_url
            plan_notebook.register_plan_change_hook("push_plan", push_plan_hook)
        
        # Load the notebook state from session
        try:
            session = JSONSession(save_dir=path_dialog_history)
        except TypeError:
            session = JSONSession(
                session_id=FRIDAY_SESSION_ID,
                save_dir=path_dialog_history,
            )
        asyncio.run(
            session.load_session_state(
                session_id=FRIDAY_SESSION_ID,
                plan_notebook=plan_notebook
            )
        )
        
        # If no current plan loaded from session, try to get from storage
        if plan_notebook.current_plan is None:
            plans = asyncio.run(plan_storage.get_plans())
            if plans:
                # Find a plan in progress or pending as current plan
                for plan in reversed(plans):
                    if plan.state in ['in_progress', 'todo']:
                        plan_notebook.current_plan = plan
                        break
        
        if plan_notebook.current_plan is None:
            return {"success": False, "message": "No current plan found"}
        
        # Create SubTask object if needed
        subtask = None
        if subtask_data and action in ['add', 'revise']:
            subtask = SubTask(**subtask_data)
        
        # Call the revise method (hook will be triggered automatically)
        result = asyncio.run(
            plan_notebook.revise_current_plan(
                subtask_idx=subtask_idx,
                action=action,
                subtask=subtask,
            )
        )
        
        # Save the updated plan back to storage
        if plan_notebook.current_plan:
            asyncio.run(plan_storage.add_plan(plan_notebook.current_plan, override=True))
        
        # Save the notebook state back to session
        asyncio.run(
            session.save_session_state(
                session_id=FRIDAY_SESSION_ID,
                plan_notebook=plan_notebook
            )
        )
        
        return {
            "success": True,
            "message": _extract_message_from_tool_response(result),
            "plan": plan_notebook.current_plan.model_dump() if plan_notebook.current_plan else None
        }
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {
            "success": False,
            "message": str(e),
        }


def update_subtask_state(
    subtask_idx: int,
    state: str,
) -> dict:
    """Update the state of a subtask.
    
    Args:
        subtask_idx: The index of the subtask
        state: The new state
        
    Returns:
        dict with 'success' and 'message' keys
    """
    try:
        import asyncio
        from agentscope.session import JSONSession
        
        # Load the plan storage
        path_dialog_history = get_local_file_path("")
        plan_storage = JSONPlanStorage()
        
        # Create a new PlanNotebook instance
        plan_notebook = PlanNotebook(storage=plan_storage)
        
        # Register plan change hook to push updates to frontend
        # Get studio_url from config file saved by main.py
        studio_url = get_studio_url()
        if studio_url:
            push_plan_hook.url = studio_url
            plan_notebook.register_plan_change_hook("push_plan", push_plan_hook)
        
        # Load the notebook state from session
        try:
            session = JSONSession(save_dir=path_dialog_history)
        except TypeError:
            session = JSONSession(
                session_id=FRIDAY_SESSION_ID,
                save_dir=path_dialog_history,
            )
        asyncio.run(
            session.load_session_state(
                session_id=FRIDAY_SESSION_ID,
                plan_notebook=plan_notebook
            )
        )
        
        # If no current plan loaded from session, try to get from storage
        if plan_notebook.current_plan is None:
            plans = asyncio.run(plan_storage.get_plans())
            if plans:
                # Find a plan in progress or pending as current plan
                for plan in reversed(plans):
                    if plan.state in ['in_progress', 'todo']:
                        plan_notebook.current_plan = plan
                        break
        
        if plan_notebook.current_plan is None:
            return {"success": False, "message": "No current plan found"}
        
        # Call the update method (hook will be triggered automatically)
        result = asyncio.run(
            plan_notebook.update_subtask_state(
                subtask_idx=subtask_idx,
                state=state,
            )
        )
        
        # Save the updated plan back to storage
        if plan_notebook.current_plan:
            asyncio.run(plan_storage.add_plan(plan_notebook.current_plan, override=True))
        
        # Save the notebook state back to session
        asyncio.run(
            session.save_session_state(
                session_id=FRIDAY_SESSION_ID,
                plan_notebook=plan_notebook
            )
        )
        
        return {
            "success": True,
            "message": _extract_message_from_tool_response(result),
            "plan": plan_notebook.current_plan.model_dump() if plan_notebook.current_plan else None
        }
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {
            "success": False,
            "message": str(e),
        }


def finish_subtask(
    subtask_idx: int,
    outcome: str,
) -> dict:
    """Finish a subtask with the given outcome.
    
    Args:
        subtask_idx: The index of the subtask
        outcome: The specific outcome of the subtask
        
    Returns:
        dict with 'success' and 'message' keys
    """
    try:
        import asyncio
        from agentscope.session import JSONSession
        
        # Load the plan storage
        path_dialog_history = get_local_file_path("")
        plan_storage = JSONPlanStorage()
        
        # Create a new PlanNotebook instance
        plan_notebook = PlanNotebook(storage=plan_storage)
        
        # Register plan change hook to push updates to frontend
        # Get studio_url from config file saved by main.py
        studio_url = get_studio_url()
        if studio_url:
            push_plan_hook.url = studio_url
            plan_notebook.register_plan_change_hook("push_plan", push_plan_hook)
        
        # Load the notebook state from session
        try:
            session = JSONSession(save_dir=path_dialog_history)
        except TypeError:
            session = JSONSession(
                session_id=FRIDAY_SESSION_ID,
                save_dir=path_dialog_history,
            )
        asyncio.run(
            session.load_session_state(
                session_id=FRIDAY_SESSION_ID,
                plan_notebook=plan_notebook
            )
        )
        
        # If no current plan loaded from session, try to get from storage
        if plan_notebook.current_plan is None:
            plans = asyncio.run(plan_storage.get_plans())
            if plans:
                # Find a plan in progress or pending as current plan
                for plan in reversed(plans):
                    if plan.state in ['in_progress', 'todo']:
                        plan_notebook.current_plan = plan
                        break
        
        if plan_notebook.current_plan is None:
            return {"success": False, "message": "No current plan found"}
        
        # Call the finish method (hook will be triggered automatically)
        result = asyncio.run(
            plan_notebook.finish_subtask(
                subtask_idx=subtask_idx,
                subtask_outcome=outcome,
            )
        )
        
        # Save the updated plan back to storage
        if plan_notebook.current_plan:
            asyncio.run(plan_storage.add_plan(plan_notebook.current_plan, override=True))
        
        # Save the notebook state back to session
        asyncio.run(
            session.save_session_state(
                session_id=FRIDAY_SESSION_ID,
                plan_notebook=plan_notebook
            )
        )
        
        return {
            "success": True,
            "message": _extract_message_from_tool_response(result),
            "plan": plan_notebook.current_plan.model_dump() if plan_notebook.current_plan else None
        }
        
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {
            "success": False,
            "message": str(e),
        }


def reorder_subtasks(
    from_index: int,
    to_index: int,
) -> dict:
    """Reorder subtasks by atomically moving one from from_index to to_index.

    Args:
        from_index: The current index of the subtask to move
        to_index: The target index to insert the subtask at

    Returns:
        dict with 'success', 'message', and 'plan' keys
    """
    try:
        import asyncio
        from agentscope.session import JSONSession

        path_dialog_history = get_local_file_path("")
        plan_storage = JSONPlanStorage()
        plan_notebook = PlanNotebook(storage=plan_storage)

        studio_url = get_studio_url()
        if studio_url:
            push_plan_hook.url = studio_url
            plan_notebook.register_plan_change_hook("push_plan", push_plan_hook)

        try:
            session = JSONSession(save_dir=path_dialog_history)
        except TypeError:
            session = JSONSession(
                session_id=FRIDAY_SESSION_ID,
                save_dir=path_dialog_history,
            )
        asyncio.run(
            session.load_session_state(
                session_id=FRIDAY_SESSION_ID,
                plan_notebook=plan_notebook,
            )
        )

        if plan_notebook.current_plan is None:
            plans = asyncio.run(plan_storage.get_plans())
            if plans:
                # Find a plan in progress or pending as current plan
                for plan in reversed(plans):
                    if plan.state in ['in_progress', 'todo']:
                        plan_notebook.current_plan = plan
                        break

        if plan_notebook.current_plan is None:
            return {"success": False, "message": "No current plan found"}

        subtasks = plan_notebook.current_plan.subtasks
        n = len(subtasks)
        if from_index < 0 or from_index >= n:
            return {"success": False, "message": f"Invalid from_index: {from_index}"}
        if to_index < 0 or to_index >= n:
            return {"success": False, "message": f"Invalid to_index: {to_index}"}
        if from_index == to_index:
            return {
                "success": True,
                "message": "No change needed",
                "plan": plan_notebook.current_plan.model_dump(),
            }

        # Atomically move: remove then insert at target position
        subtask_to_move = subtasks.pop(from_index)
        subtasks.insert(to_index, subtask_to_move)

        # Trigger push hook manually (direct list mutation bypasses notebook hooks)
        asyncio.run(push_plan_hook(plan_notebook, plan_notebook.current_plan))

        asyncio.run(plan_storage.add_plan(plan_notebook.current_plan, override=True))
        asyncio.run(
            session.save_session_state(
                session_id=FRIDAY_SESSION_ID,
                plan_notebook=plan_notebook,
            )
        )

        return {
            "success": True,
            "message": "Subtasks reordered successfully",
            "plan": plan_notebook.current_plan.model_dump(),
        }

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return {
            "success": False,
            "message": str(e),
        }


if __name__ == "__main__":
    # Read arguments from command line
    # Format: python api.py <function_name> <args...>
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "message": "Not enough arguments"}))
        sys.exit(1)
    
    function_name = sys.argv[1]
    
    try:
        if function_name == "revise_plan":
            if len(sys.argv) < 4:
                print(json.dumps({"success": False, "message": "Not enough arguments for revise_plan"}))
                sys.exit(1)
            
            action = sys.argv[2]
            subtask_idx = int(sys.argv[3])
            subtask_data = json.loads(sys.argv[4]) if len(sys.argv) > 4 else None
            
            result = revise_plan(action, subtask_idx, subtask_data)
        
        elif function_name == "update_subtask_state":
            if len(sys.argv) < 4:
                print(json.dumps({"success": False, "message": "Not enough arguments for update_subtask_state"}))
                sys.exit(1)
            
            subtask_idx = int(sys.argv[2])
            state = sys.argv[3]
            
            result = update_subtask_state(subtask_idx, state)
        
        elif function_name == "finish_subtask":
            if len(sys.argv) < 4:
                print(json.dumps({"success": False, "message": "Not enough arguments for finish_subtask"}))
                sys.exit(1)
            
            subtask_idx = int(sys.argv[2])
            outcome = sys.argv[3]
            
            result = finish_subtask(subtask_idx, outcome)
        
        else:
            print(json.dumps({"success": False, "message": f"Unknown function: {function_name}"}))
            sys.exit(1)
        
        print(json.dumps(result))
    
    except Exception as e:
        import traceback
        print(json.dumps({
            "success": False,
            "message": str(e),
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)
