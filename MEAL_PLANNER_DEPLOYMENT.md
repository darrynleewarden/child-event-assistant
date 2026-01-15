# Meal Planner Feature - Deployment Guide

## Overview

The meal planner feature has been successfully integrated into your Bedrock agent infrastructure. This allows users to:
- Create and manage meals with ingredients, categories, and allergy information
- Create weekly meal plans
- Assign meals to specific days and times in the plan
- Query meals and meal plans with various filters

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)
Already includes the necessary tables:
- ✅ `Meal` - Individual meals with ingredients, categories, etc.
- ✅ `MealPlan` - Weekly meal plan containers
- ✅ `MealPlanEntry` - Links meals to specific days/times in a plan
- ✅ `ChildMealPlan` - Associates meal plans with children

### 2. OpenAPI Schema (`infrastructure/_module/schemas/database_actions.json`)
Added 7 new meal-related endpoints:
- `POST /get-meals` - Retrieve meals with filtering
- `POST /create-meal` - Create a new meal
- `POST /update-meal` - Update meal information
- `POST /delete-meal` - Delete a meal
- `POST /get-meal-plans` - Retrieve meal plans with optional entries
- `POST /create-meal-plan` - Create a new weekly meal plan
- `POST /add-meal-to-plan` - Add a meal to a specific day/time slot

### 3. Lambda Handler (`infrastructure/_module/lambda/database_handler.js`)
Added handler functions:
- `getMeals()` - Query meals with filters
- `createMeal()` - Create meals with confirmation
- `updateMeal()` - Update meals with confirmation
- `deleteMeal()` - Delete meals with confirmation and usage check
- `getMealPlans()` - Query meal plans with optional entries
- `createMealPlan()` - Create meal plans with date validation
- `addMealToPlan()` - Add meals to plans with conflict detection

All functions follow the existing confirmation pattern for write operations.

### 4. Agent Instructions (`infrastructure/dev/main.tf`)
Updated the agent's system instructions to include:
- Meal planning operation descriptions
- Category options (breakfast, lunch, dinner, snack)
- Day of week mapping (0=Monday through 6=Sunday)
- Guidance on creating balanced weekly meal plans

## Deployment Steps

### Step 1: Navigate to Infrastructure Directory
```bash
cd /Users/darryn.lee-warden/Documents/DEV/child-event-assistant/infrastructure/dev
```

### Step 2: Initialize Terraform (if not already done)
```bash
terraform init
```

### Step 3: Review Changes
```bash
terraform plan
```

This should show:
- The database_handler Lambda function will be updated (new code)
- The action group will be updated (new schema)
- The agent alias will be recreated (new instructions)

### Step 4: Apply Changes
```bash
terraform apply
```

Type `yes` when prompted to confirm the changes.

### Step 5: Wait for Deployment
The deployment typically takes 2-5 minutes. Terraform will:
1. Rebuild the Lambda function with new meal handlers
2. Update the Bedrock agent action group with new schema
3. Create a new agent version with updated instructions
4. Update the agent alias to point to the new version

## Testing the Meal Planner

### Test 1: Create a Meal
Chat with your agent:
```
Can you create a meal called "Chicken Nuggets with Veggies"?
It's a dinner meal with ingredients: chicken nuggets, broccoli, carrots, rice.
Prep time is about 25 minutes.
```

Expected flow:
1. Agent calls `/create-meal` without `confirmed=true`
2. Agent shows you a preview and asks for confirmation
3. You confirm
4. Agent calls `/create-meal` with `confirmed=true`
5. Meal is created

### Test 2: View Meals
```
Show me all the meals I have in my library
```

Agent should call `/get-meals` and display your meals.

### Test 3: Create a Meal Plan
```
Create a meal plan for next week starting Monday January 20th
```

Expected flow:
1. Agent calculates the week's dates (Jan 20-26)
2. Agent calls `/create-meal-plan` without confirmation
3. Agent shows preview and asks for confirmation
4. You confirm
5. Meal plan is created

### Test 4: Add Meals to the Plan
```
Add "Chicken Nuggets with Veggies" as dinner on Monday
```

Expected flow:
1. Agent finds the meal ID and meal plan ID
2. Agent calls `/add-meal-to-plan` with dayOfWeek=0, mealTime="dinner"
3. Agent shows preview
4. You confirm
5. Meal is added to the plan

### Test 5: View the Complete Meal Plan
```
Show me my meal plan with all the meals
```

Agent should call `/get-meal-plans` with `includeEntries=true` to show the full plan.

### Test 6: Create Multiple Meals at Once
```
Help me plan a full week of dinners for my kids. They like:
- Chicken dishes
- Pasta
- Pizza
- Fish
- Tacos

Can you create 7 dinner meals and add them to this week's plan?
```

The agent should:
1. Create 7 different meals (with confirmation for each or batch)
2. Add each to different days of the week
3. Show you the complete meal plan

## Data Model Reference

### Meal Categories
- `breakfast`
- `lunch`
- `dinner`
- `snack`

### Day of Week Mapping
- 0 = Monday
- 1 = Tuesday
- 2 = Wednesday
- 3 = Thursday
- 4 = Friday
- 5 = Saturday
- 6 = Sunday

### Meal Times
- `breakfast`
- `lunch`
- `dinner`
- `snack`

## Advanced Features

### Filtering Meals by Category
```
Show me all breakfast meals
```

### Finding Template Meals
```
Show me template meals I can reuse
```

### Getting Active Meal Plans
```
What's my current active meal plan?
```

### Managing Allergy Information
```
Create a meal called "Peanut Butter Toast" with allergy info: contains peanuts, dairy
```

### Checking Meal Usage Before Deletion
When you try to delete a meal, the system automatically checks if it's used in any meal plans and warns you.

## Troubleshooting

### Issue: Agent doesn't recognize meal commands
**Solution:** Make sure you've applied the Terraform changes and the agent alias has been updated. Check the AWS Bedrock console to verify the new version is active.

### Issue: "Meal not found" errors
**Solution:** First query meals using "show me my meals" to get the correct meal IDs, then use those in subsequent operations.

### Issue: "User not found" errors
**Solution:** Make sure you're signed in to the app. The agent needs the userId and userEmail from your session context.

### Issue: Date validation errors for meal plans
**Solution:** Ensure startDate is before endDate and both are in YYYY-MM-DD format.

### Issue: Lambda timeout
**Solution:** If creating many meals at once, the Lambda might timeout. Try creating meals in smaller batches.

## Architecture Notes

### Confirmation Pattern
All write operations (create, update, delete) follow a two-step confirmation pattern:
1. **Preview call**: Agent calls the operation without `confirmed=true`
2. **Execution call**: After user confirms, agent calls with `confirmed=true`

This prevents accidental data modifications and gives users control.

### Database Relationships
- Each `Meal` belongs to a `User`
- Each `MealPlan` belongs to a `User`
- `MealPlanEntry` creates many-to-many relationship between `Meal` and `MealPlan`
- The unique constraint on `(mealPlanId, dayOfWeek, mealTime)` prevents duplicate entries

### UPSERT Behavior
The `add-meal-to-plan` operation uses `ON CONFLICT DO UPDATE`, which means:
- If a meal already exists for Monday dinner, adding a new one replaces it
- The agent warns you before replacing
- This allows easy meal plan adjustments

## Next Steps

### Optional Enhancements
1. **Batch meal creation**: Modify the agent to confirm multiple meals at once
2. **Meal templates**: Create a library of common kid-friendly meals
3. **Nutritional information**: Add calories, macros, etc. to meals
4. **Shopping list generation**: Generate ingredient lists from meal plans
5. **Recipe integration**: Add full recipes with steps to meals
6. **Child preferences**: Use the `ChildMealPlan` table to track which kids like which meals

### Integration with Frontend
Update your Next.js app to:
1. Display meal libraries in `/meals/library`
2. Show weekly meal grid in `/meals`
3. Allow drag-and-drop meal planning
4. Sync with the AI agent's meal plan data

## Support

If you encounter any issues:
1. Check CloudWatch logs for the Lambda function: `child-event-manager-dev-random-db-handler`
2. Check Bedrock agent logs in CloudWatch
3. Verify your database connection is working
4. Ensure the Prisma schema is migrated (tables exist in RDS)

## Summary

✅ 7 new meal-related API endpoints added
✅ Handler functions implemented with confirmation patterns
✅ Agent instructions updated with meal planning guidance
✅ All changes ready for deployment with `terraform apply`

Your agent can now help users plan weekly meals, create meal libraries, and manage family nutrition! 🍽️
