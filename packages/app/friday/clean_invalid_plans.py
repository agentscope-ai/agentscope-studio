#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Clean invalid plans from storage.

This script removes plans with non-completed states (for example, 'in_progress') from
storage, as these should only exist in session, not in storage.
Storage should only contain completed ('done' or 'abandoned') plans.
"""
import asyncio
import sys
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Add parent directory to path to enable direct execution
# Recommended: Run as module from project root: python -m packages.app.friday.clean_invalid_plans
sys.path.insert(0, os.path.dirname(__file__))

from plan_manager import JSONPlanStorage


async def clean_invalid_plans():
    """Remove invalid plans from storage."""
    plan_storage = JSONPlanStorage()
    
    # Get all plans
    plans = await plan_storage.get_plans()
    
    logger.info(f"Found {len(plans)} plans in storage")
    
    # Find invalid plans (not done or abandoned)
    invalid_plans = [p for p in plans if p.state not in ['done', 'abandoned']]
    
    if not invalid_plans:
        logger.info("No invalid plans found. Storage is clean!")
        return
    
    logger.info(f"\nFound {len(invalid_plans)} invalid plans:")
    for plan in invalid_plans:
        logger.info(f"  - {plan.name} (state: {plan.state}, id: {plan.id})")
    
    # Remove invalid plans
    for plan in invalid_plans:
        try:
            await plan_storage.delete_plan(plan.id)
            logger.info(f"✓ Deleted: {plan.name}")
        except Exception as e:
            logger.error(f"✗ Failed to delete {plan.name}: {e}")
    
    logger.info(f"\nCleaning complete. Removed {len(invalid_plans)} invalid plans.")


if __name__ == "__main__":
    asyncio.run(clean_invalid_plans())

