"""Deterministic tools. No live platform, tax or market data."""
import math


def number(value, name, minimum=0):
    try:
        result = float(value)
    except (ValueError, TypeError):
        raise ValueError(f"{name} must be a number")
    if not math.isfinite(result) or result < minimum:
        raise ValueError(f"{name} must be finite and at least {minimum}")
    return result


def calculate(kind, data):
    if kind == "pricing":
        income = number(data.get("income"), "Target income")
        costs = number(data.get("costs"), "Monthly costs")
        hours = number(data.get("hours"), "Billable hours", 0.01)
        fee = number(data.get("fee"), "Platform fee")
        if fee >= 100:
            raise ValueError("Platform fee must be below 100%")
        rate = (income + costs) / hours / (1 - fee / 100)
        return {"Hourly rate": round(rate, 2),
                "Explanation": "(Target income + monthly costs) / billable hours / (1 - fee%). Tax and non-billable time are not included."}
    if kind == "percentage":
        earned = number(data.get("earned"), "Earned marks")
        total = number(data.get("total"), "Total marks", 0.01)
        if earned > total:
            raise ValueError("Earned marks cannot exceed total marks")
        return {"Percentage": round(earned / total * 100, 2),
                "Explanation": "Earned marks / total marks × 100."}
    if kind == "gpa":
        scale = number(data.get("scale"), "GPA scale", 0.01)
        rows = data.get("courses")
        if not isinstance(rows, list) or not rows:
            raise ValueError("Add at least one course")
        points = credits = 0
        for row in rows:
            grade = number(row.get("grade"), "Grade point")
            credit = number(row.get("credits"), "Course credits", 0.01)
            if grade > scale:
                raise ValueError("Grade point exceeds the selected scale")
            points += grade * credit
            credits += credit
        return {"GPA": round(points / credits, 3),
                "Explanation": "Sum of grade points × credits / total credits. Use your institution's grade-point mapping."}
    raise ValueError("Unknown calculator")


def audit(data):
    platform = data.get("platform")
    if platform not in ("LinkedIn", "Upwork", "Fiverr"):
        raise ValueError("Choose LinkedIn, Upwork or Fiverr")
    fields = {"headline": 20, "summary": 25, "services": 20,
              "evidence": 25, "cta": 10}
    if not any(str(data.get(k, "")).strip() for k in fields):
        raise ValueError("Enter profile information")
    present = [k for k in fields if str(data.get(k, "")).strip()]
    missing = [k for k in fields if k not in present]
    return {"Platform": platform,
            "Data source": "User-provided",
            "Completeness score": sum(fields[k] for k in present),
            "Criteria": fields,
            "Explanation": "Presence-only rubric; this does not measure quality, ranking, platform performance or ATS compatibility.",
            "Strengths": [f"{k.title()} supplied" for k in present],
            "Recommended next steps": [f"Add {k}: include specific, truthful details relevant to your target clients." for k in missing]}
