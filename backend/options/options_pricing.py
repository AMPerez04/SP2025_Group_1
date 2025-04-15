import numpy as np
from typing import (
    Literal,
    # List,
    Dict,
    Any,
    Union,
)

import logging as logging


def get_risk_free_rate(days_to_expiry: int) -> float:
    """
    Get approximate risk-free rate based on US Treasury rates.
    This is a simplified approach - in production, you might want to fetch actual Treasury yields.
    """
    # Simplified risk-free rate approximation (would ideally come from Treasury data)
    # Using rough approximations: 4.33% for 30 days, 4.6% for 90 days, 4.7% for 180+ days
    if days_to_expiry <= 30:
        return 0.0433
    elif days_to_expiry <= 90:
        return 0.046
    else:
        return 0.047


def CRRparams(T, r, v, N):
    """
    Compute parameters for the Cox-Ross-Rubinstein (CRR) binomial tree.

    :param T: Time to expiry
    :param r: Risk-free rate (array for time-varying rates)
    :param v: Volatility
    :param N: Height of the binomial tree
    :return: pu (up probability), up (up factor), R (risk-free growth factor)
    """
    dt = T / N  # Time step
    up = np.exp(v * np.sqrt(dt))  # Up factor
    down = 1 / up  # Down factor

    # Convert to scalar if needed for the original CRR model
    if np.isscalar(r):
        R = np.exp(r * dt)  # Risk-free return per step
        pu = (R - down) / (up - down)  # Risk-neutral up probability
    else:
        # If r is an array, we need to decide what to do:
        # Option 1: Use first element (matching original MATLAB behavior)
        r_scalar = r[0] if len(r) > 0 else 0.05  # Default if empty
        R = np.exp(r * dt)  # Keep array for time-varying rates
        R_scalar = np.exp(r_scalar * dt)
        if abs(up - down) < 1e-10:  # Check for near-zero denominator
            pu = 0.5  # Default to 0.5 probability if parameters are degenerate
        else:
            pu = (R_scalar - down) / (up - down)  # Use scalar for probability

    return pu, up, R


def CRRmD(T, S0, Di, ri, v, N):
    """
    Compute binomial asset price tree with dividend adjustment.
    """
    pu, up, R = CRRparams(T, ri, v, N)
    Sx = np.zeros((N + 1, N + 1))
    S = np.zeros((N + 1, N + 1))
    Ipv = np.zeros(N + 1)

    # Compute present value of dividends
    # For terminal node N
    div_value = 0.0
    if N + 1 < len(Di):
        try:
            if isinstance(Di[N + 1], np.ndarray):
                if Di[N + 1].size == 1:
                    div_value = float(Di[N + 1].item())
                else:
                    div_value = float(Di[N + 1][0])
            else:
                div_value = float(Di[N + 1])
        except (IndexError, ValueError, TypeError):
            div_value = 0.0

    r_value = 1.0  # Default no-growth
    try:
        if isinstance(R, np.ndarray):
            if R.size == 1:
                r_value = float(R.item())
            elif N < len(R):
                r_value = float(R[N])
            else:
                r_value = float(R[-1])  # Use last value if index out of range
        else:
            r_value = float(R)
    except (ValueError, TypeError):
        r_value = 1.0

    # Now both are scalars, so division is safe
    if r_value != 0:  # Avoid division by zero
        Ipv[N] = div_value / r_value
    else:
        Ipv[N] = 0.0

    for n in range(N - 1, -1, -1):
        # Similar careful handling for the loop values
        if n + 1 < len(Di):
            div_value = Di[n + 1]
            if isinstance(div_value, np.ndarray):
                div_value = float(
                    div_value.item() if div_value.size == 1 else div_value[0]
                )
        else:
            div_value = 0.0

        if isinstance(R, np.ndarray) and len(R) > n:
            r_value = float(R[n])
        else:
            r_value = float(R)

        if r_value != 0:
            Ipv[n] = (Ipv[n + 1] + div_value) / r_value
        else:
            Ipv[n] = Ipv[n + 1]  # If r is zero, assume no discounting

    Sx[0, 0] = S0 - Ipv[0]
    S[0, 0] = S0

    for n in range(1, N + 1):
        for j in range(n + 1):
            Sx[n, j] = Sx[0, 0] * up ** (2 * j - n)
            S[n, j] = Sx[n, j] + Ipv[n]

    return S, Sx, Ipv


def CRRmDaeC(T, S0, K, Di, ri, v, N):
    """
    Compute American and European call option prices using the modified CRR model.
    """
    pu, up, R = CRRparams(T, ri, v, N)
    S, _, _ = CRRmD(T, S0, Di, ri, v, N)

    if v == 0:
        # If volatility is zero, prices are just intrinsic values
        Ca = np.maximum(S - K, 0)
        Ce = np.maximum(S - K, 0)
        EE = np.zeros((N, N), dtype=bool)
        return Ca, Ce, EE

    Ca = np.zeros((N + 1, N + 1))
    Ce = np.zeros((N + 1, N + 1))
    EE = np.zeros((N, N), dtype=bool)

    # Set terminal payoffs
    for j in range(N + 1):
        xC = max(S[N, j] - K, 0)
        Ca[N, j] = Ce[N, j] = xC

    # Backward induction
    for n in range(N - 1, -1, -1):
        for j in range(n + 1):
            # Get the discount factor as a scalar
            if isinstance(R, np.ndarray) and len(R) > n:
                Rn = float(R[n])
            else:
                Rn = float(R)

            # Calculate expectation values - make sure all components are scalars
            bCe = (
                float(pu) * float(Ce[n + 1, j + 1])
                + (1 - float(pu)) * float(Ce[n + 1, j])
            ) / Rn
            bCa = (
                float(pu) * float(Ca[n + 1, j + 1])
                + (1 - float(pu)) * float(Ca[n + 1, j])
            ) / Rn
            xC = max(float(S[n, j]) - float(K), 0)

            Ce[n, j] = bCe
            Ca[n, j] = max(bCa, xC)
            EE[n, j] = xC > bCa

    return Ca, Ce, EE


def CRRmDaeP(T, S0, K, Di, ri, v, N):
    """
    Compute American and European put option prices using the modified CRR model.

    This is a direct Python translation of the MATLAB/Octave function for puts.

    Args:
        T: Expiration time (in years)
        S0: Initial stock price
        K: Strike price
        Di: Dividend sequence [D_0, D_1, ..., D_N+1]
        ri: Risk-free APRs [r_0, r_1, ..., r_N]
        v: Volatility
        N: Number of time steps

    Returns:
        Pa: American put price matrix
        Pe: European put price matrix
        EE: Early exercise optimal boolean matrix
    """
    pu, up, R = CRRparams(T, ri, v, N)  # Modified CRR params
    S, _, _ = CRRmD(T, S0, Di, ri, v, N)  # Decompose stock price

    if v == 0:
        # If volatility is zero, prices are just intrinsic values
        Pa = np.maximum(K - S, 0)
        Pe = np.maximum(K - S, 0)
        EE = np.zeros((N, N), dtype=bool)
        return Pa, Pe, EE  # Return intrinsic values for zero volatility

    # Initialize output matrices
    Pa = np.zeros((N + 1, N + 1))
    Pe = np.zeros((N + 1, N + 1))
    EE = np.zeros((N, N), dtype=bool)

    # Set terminal values at (N,j)
    for j in range(N + 1):
        xP = K - S[N, j]  # Put payoff at expiry
        Pa[N, j] = Pe[N, j] = max(0, xP)  # plus part

    # Backward induction
    for n in range(N - 1, -1, -1):
        for j in range(n + 1):
            # Get scalar risk-neutral probability
            if isinstance(pu, np.ndarray):
                pu_val = float(pu[n] if len(pu) > n else pu[0])
            else:
                pu_val = float(pu)

            # Get scalar interest rate factor
            if isinstance(R, np.ndarray):
                Rn = float(R[n] if len(R) > n else R[0])
            else:
                Rn = float(R)

            # Backward pricing for European and American options
            # Make sure all values in this calculation are scalars
            Pe_up = float(Pe[n + 1, j + 1])
            Pe_down = float(Pe[n + 1, j])
            Pa_up = float(Pa[n + 1, j + 1])
            Pa_down = float(Pa[n + 1, j])

            # Calculate expected values as scalars
            bPe = (pu_val * Pe_up + (1 - pu_val) * Pe_down) / Rn
            bPa = (pu_val * Pa_up + (1 - pu_val) * Pa_down) / Rn

            # Put exercise value
            xP = float(K - S[n, j])

            # Set prices at node (n,j)
            Pe[n, j] = bPe  # always binomial price
            Pa[n, j] = max(bPa, xP)  # highest price

            # Is early exercise optimal?
            EE[n, j] = xP > bPa  # True if xP > bPa

    return Pa, Pe, EE


def get_dividend_info(stock_ticker) -> Dict:
    """
    Extract dividend information from Yahoo Finance data.

    Parameters:
    stock_ticker: yf.Ticker object

    Returns:
    Dict with dividend information
    """
    try:
        info = stock_ticker.info
        dividends = {}

        # Dividend yield
        dividends["yield"] = float(info.get("dividendYield", 0) or 0)

        # Dividend rate (annual)
        dividends["rate"] = float(info.get("dividendRate", 0) or 0)

        # Last dividend date and value
        if hasattr(stock_ticker, "dividends") and len(stock_ticker.dividends) > 0:
            div_history = stock_ticker.dividends
            dividends["last_date"] = div_history.index[-1].strftime("%Y-%m-%d")
            dividends["last_amount"] = float(div_history.iloc[-1])

            # Calculate average dividend frequency in days
            if len(div_history) > 1:
                dates = div_history.index.tolist()
                intervals = [
                    (dates[i] - dates[i - 1]).days for i in range(1, len(dates))
                ]
                dividends["avg_frequency_days"] = sum(intervals) / len(intervals)
            else:
                # Default to quarterly (90 days) if only one dividend record
                dividends["avg_frequency_days"] = 90
        else:
            # No dividend history
            dividends["last_date"] = None
            dividends["last_amount"] = 0
            dividends["avg_frequency_days"] = 0

        return dividends
    except Exception as e:
        # Return default values if unable to extract dividend info
        return {
            "yield": 0,
            "rate": 0,
            "last_date": None,
            "last_amount": 0,
            "avg_frequency_days": 0,
            "message": str(e),
        }


def calculate_option_price_crr_with_dividends(
    S0: float,  # Current stock price
    K: float,  # Strike price
    T: float,  # Time to expiration (in years)
    r: Union[
        float, np.ndarray
    ],  # Risk-free interest rate (can be array for term structure)
    sigma: float,  # Volatility
    dividend_info: Dict,  # Dividend information
    steps: int = 50,  # Number of time steps in binomial tree
    option_type: Literal["call", "put"] = "call",
) -> Dict[str, float]:
    """
    Calculate option prices using the CRR model with dividend adjustments

    Parameters:
    S0: Current stock price
    K: Strike price
    T: Time to expiration (in years)
    r: Risk-free interest rate (annualized)
    sigma: Volatility
    dividend_info: Dictionary with dividend information
    steps: Number of time steps
    option_type: 'call' or 'put'

    Returns:
    Dictionary with European and American prices
    """

    # Process dividend information
    div_yield = dividend_info.get("yield", 0)
    # div_rate = dividend_info.get("rate", 0)

    # Create dividend array - for simplicity using continuous dividend yield
    # This could be enhanced with discrete dividends based on dividend_info
    Di = np.zeros(steps + 2)

    if div_yield > 0:
        # Continuous dividend approximation
        dt = T / steps
        for i in range(1, steps + 2):
            Di[i] = S0 * div_yield * dt  # Simple approximation of dividend per step

    # Make sure r is in the right format
    if np.isscalar(r):
        ri = np.ones(steps) * r
    else:
        ri = r

    # Calculate option prices
    if option_type.lower() == "call":
        Ca, Ce, EE = CRRmDaeC(T, S0, K, Di, ri, sigma, steps)
        return {
            "american": float(Ca[0, 0]),
            "european": float(Ce[0, 0]),
            "early_exercise": bool(np.any(EE)),
        }
    else:  # put
        Pa, Pe, EE = CRRmDaeP(T, S0, K, Di, ri, sigma, steps)
        return {
            "american": float(Pa[0, 0]),
            "european": float(Pe[0, 0]),
            "early_exercise": bool(np.any(EE)),
        }


def calculate_option_price_binomial(
    S: float,  # Current stock price
    K: float,  # Strike price
    T: float,  # Time to expiration (in years)
    r: float,  # Risk-free interest rate
    sigma: float,  # Volatility
    q: float = 0.0,  # Dividend yield
    steps: int = 100,  # Number of time steps
    option_type: Literal["call", "put"] = "call",
    american: bool = False,  # Whether the option is American (can be exercised early)
) -> float:
    """
    Simple binomial tree model (wrapper for backward compatibility)
    """
    # Create simple dividend info structure
    dividend_info = {"yield": q, "rate": S * q}

    # Use the more sophisticated model
    result = calculate_option_price_crr_with_dividends(
        S, K, T, r, sigma, dividend_info, steps, option_type
    )

    # Return the requested price type
    return result["american"] if american else result["european"]


def generate_binomial_tree_visualization(
    S: float,  # Current stock price
    K: float,  # Strike price
    T: float,  # Time to expiration (in years)
    r: float,  # Risk-free interest rate
    sigma: float,  # Volatility
    div_yield: float,  # Dividend yield
    steps: int = 5,  # Limited steps for visualization
    option_type: Literal["call", "put"] = "call",
) -> Dict[str, Any]:
    """
    Generate binomial tree data for visualization

    Parameters:
    S: float,  # Current stock price
    K: float,  # Strike price
    T: float,  # Time to expiration (in years)
    r: float,  # Risk-free interest rate
    sigma: float,  # Volatility
    div_yield: float,  # Dividend yield
    steps: int = 5,  # Limited steps for visualization
    option_type: Literal["call", "put"] = "call",

    Returns:
    Dictionary with tree structure for visualization
    """
    # Create dividend array
    Di = np.zeros(steps + 2)
    dt = T / steps
    for i in range(1, steps + 2):
        Di[i] = S * div_yield * dt

    # Get parameters and tree
    pu, up, R = CRRparams(T, r, sigma, steps)
    S_tree, Sx_tree, _ = CRRmD(T, S, Di, r, sigma, steps)

    # Calculate option values
    if option_type.lower() == "call":
        option_tree_a, option_tree_e, EE = CRRmDaeC(T, S, K, Di, r, sigma, steps)
    else:  # put
        option_tree_a, option_tree_e, EE = CRRmDaeP(T, S, K, Di, r, sigma, steps)

    # Convert to visualization format
    nodes = []
    links = []

    # Add nodes for each point in the tree
    for n in range(steps + 1):
        for j in range(n + 1):
            node_id = f"n_{n}_{j}"
            nodes.append(
                {
                    "id": node_id,
                    "level": n,
                    "position": j,
                    "stock_price": float(S_tree[n, j]),
                    "option_price_american": float(option_tree_a[n, j]),
                    "option_price_european": float(option_tree_e[n, j]),
                    "early_exercise": bool(EE[n, j]) if n < steps and j < n else False,
                }
            )

            # Add links to previous nodes
            if n > 0:
                # Up link
                if j > 0:
                    links.append(
                        {
                            "source": f"n_{n - 1}_{j - 1}",
                            "target": node_id,
                            "probability": float(pu),
                            "direction": "up",
                        }
                    )
                # Down link
                if j < n:
                    links.append(
                        {
                            "source": f"n_{n - 1}_{j}",
                            "target": node_id,
                            "probability": float(1 - pu),
                            "direction": "down",
                        }
                    )

    return {
        "nodes": nodes,
        "links": links,
        "parameters": {
            "up_factor": float(up),
            "risk_neutral_probability": float(pu),
            "risk_free_growth": float(R) if np.isscalar(R) else float(np.mean(R)),
            "time_step": float(T / steps),
            "steps": steps,
            "option_type": option_type,
            "strike": float(K),
            "initial_price": float(S),
            "interest_rate": float(r),
            "volatility": float(sigma),
            "dividend_yield": float(div_yield),
        },
    }
