# excerpt
RISK_LEVELS = {
    1: {"label": "Learn (shares only)", "max_risk_pct": 0.05, "max_collateral_pct": 0.0,
        "prefs": ["shares"],
        "blurb": "Ideas are plain stock purchases sized at 5% of your capital. Read the option explainers risk-free.",
        "plain": "Plain share purchases, each about 5% of your paper capital. Options wait in Learn until you're ready."},
    2: {"label": "Conservative", "max_risk_pct": 0.05, "max_collateral_pct": 0.5,
        "prefs": ["covered_call", "cash_secured_put", "shares"],
        "blurb": "Income strategies on companies you'd be glad to own: covered calls and cash-secured puts about 20% likely to be assigned, 30-50 days out.",
        "plain": "Steady-income trades on companies you'd be happy to own."},
    3: {"label": "Moderate", "max_risk_pct": 0.05, "max_collateral_pct": 0.5,
        "prefs": ["cash_secured_put", "bull_put_spread", "covered_call", "collar", "shares"],
        "blurb": "Adds defined-risk credit spreads and collars. Every trade has a known worst case.",
        "plain": "Adds spreads and collars. You know the worst case before you start."},
    4: {"label": "Growth", "max_risk_pct": 0.04, "max_collateral_pct": 0.5,
        "prefs": ["bull_call_spread", "leaps_call", "bull_put_spread", "cash_secured_put", "shares"],
        "blurb": "Adds debit spreads and LEAPS for more upside per dollar, with smaller position sizes.",
        "plain": "Adds trades that aim for more upside per dollar, with smaller position sizes."},
    5: {"label": "Speculative", "max_risk_pct": 0.02, "max_collateral_pct": 0.5,
        "prefs": ["long_call", "bull_call_spread", "leaps_call", "bull_put_spread", "shares"],
        "blurb": "Adds short-dated long calls, capped at 2% of capital per trade. Most of these lose; size accordingly.",
        "plain": "Adds short-term bets that a stock will rise. Most of these lose, so each is capped at 2% of your capital."},
}

DEFAULT_RISK_LEVEL = 2


def allowed(level: int) -> list[str]:
    return [k for k, v in STRATEGIES.items() if v["min_level"] <= level]


# ------------------------------------------------------------------ contract picking

# ...
    """Build one concrete trade. Raises Infeasible with a human-readable reason."""
    if strategy not in STRATEGIES:
        raise Infeasible(f"unknown strategy {strategy}")
    if STRATEGIES[strategy]["min_level"] > level:
        raise Infeasible(f"{STRATEGIES[strategy]['label']} needs risk level {STRATEGIES[strategy]['min_level']}+")
    p = params or {}
    cfg = RISK_LEVELS[level]
    risk_budget = capital * cfg["max_risk_pct"]
    held = (holdings or {}).get(symbol, 0)

    if strategy == "shares":
        budget = capital * (0.05 if level == 1 else 0.10)
        if spot <= 0:
            raise Infeasible("no current share price for this stock; try again later")
        if budget <= 0:
            raise Infeasible("no paper capital set (add it in your profile)")
        qty = int(budget // spot)
        if qty < 1:
            raise Infeasible(f"one share (${spot:,.0f}) is more than {budget / capital:.0%} of your capital; consider fractional shares or the sector ETF")
        cost = qty * spot
        return _finish("shares", symbol, spot, [_leg("buy", qty=qty, stock_symbol=symbol, price=spot)], 0, None,
                       None, cost, spot, None, cost, None, None,
                       ["Hold while the business thesis holds; re-check after each earnings report.",
                        "Write down now what would make you sell (thesis broken), not a price target."],
                       {"shares": qty})

# ...
# cash_secured_put and covered_call: size by collateral, up to max_collateral_pct of capital; max loss is the collateral if the stock falls to $0.
