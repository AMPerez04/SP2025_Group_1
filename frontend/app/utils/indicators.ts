// /dashboard/utils/indicators.ts

export interface FinancialPoint {
    time: number;
    open: number;
    high: number;
    low: number;
    value: number; // This represents the close value
  }
  
  /**
   * Calculates a Simple Moving Average (SMA) over a given period.
   */
  export function calculateSMA(
    data: FinancialPoint[],
    period: number
  ): { time: number; value: number }[] {
    if (!data || data.length < period) {
      return [];
    }
    const sma: { time: number; value: number }[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data
        .slice(i - period + 1, i + 1)
        .reduce((acc, point) => acc + point.value, 0);
      sma.push({
        time: data[i].time,
        value: sum / period,
      });
    }
    return sma;
  }
  
  /**
   * Calculates an Exponential Moving Average (EMA) over a given period.
   */
  export function calculateEMA(
    data: FinancialPoint[],
    period: number
  ): { time: number; value: number }[] {
    if (!data || data.length < period) {
      return [];
    }
    const ema: { time: number; value: number }[] = [];
    const k = 2 / (period + 1);
    // Start with the SMA of the first 'period' values as the initial EMA
    const initialSMA =
      data.slice(0, period).reduce((acc, point) => acc + point.value, 0) /
      period;
    ema.push({ time: data[period - 1].time, value: initialSMA });
    let prevEma = initialSMA;
    // Calculate EMA for the rest of the data
    for (let i = period; i < data.length; i++) {
      const currentEma = data[i].value * k + prevEma * (1 - k);
      ema.push({ time: data[i].time, value: currentEma });
      prevEma = currentEma;
    }
    return ema;
  }
  
  /**
   * Calculates the Relative Strength Index (RSI) over a given period.
   * Default period is 14.
   */
  export function calculateRSI(
    data: FinancialPoint[],
    period: number = 14
  ): { time: number; value: number }[] {
    if (!data || data.length < period + 1) {
      return [];
    }
    const rsi: { time: number; value: number }[] = [];
    let gain = 0;
    let loss = 0;
  
    // Calculate initial average gain and loss
    for (let i = 1; i <= period; i++) {
      const diff = data[i].value - data[i - 1].value;
      if (diff > 0) {
        gain += diff;
      } else {
        loss += Math.abs(diff);
      }
    }
    let avgGain = gain / period;
    let avgLoss = loss / period;
    let rs = avgGain / (avgLoss || 1); // Avoid division by zero
    rsi.push({ time: data[period].time, value: 100 - 100 / (1 + rs) });
  
    // Continue calculating RSI for the rest of the data using smoothing
    for (let i = period + 1; i < data.length; i++) {
      const diff = data[i].value - data[i - 1].value;
      const currentGain = diff > 0 ? diff : 0;
      const currentLoss = diff < 0 ? Math.abs(diff) : 0;
      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
      rs = avgGain / (avgLoss || 1);
      rsi.push({ time: data[i].time, value: 100 - 100 / (1 + rs) });
    }
    return rsi;
  }
  
  /**
   * Calculates Bollinger Bands over a given period with a specified multiplier.
   * Returns an array of objects with the time, upper, middle (SMA), and lower band values.
   */
  export function calculateBollingerBands(
    data: FinancialPoint[],
    period: number,
    multiplier: number
  ): { time: number; upper: number; middle: number; lower: number }[] {
    if (!data || data.length < period) {
      return [];
    }
    const bands: { time: number; upper: number; middle: number; lower: number }[] =
      [];
    for (let i = period - 1; i < data.length; i++) {
      const periodSlice = data.slice(i - period + 1, i + 1);
      const sum = periodSlice.reduce((acc, point) => acc + point.value, 0);
      const mean = sum / period;
      const variance =
        periodSlice.reduce((acc, point) => acc + Math.pow(point.value - mean, 2), 0) /
        period;
      const stdDev = Math.sqrt(variance);
      bands.push({
        time: data[i].time,
        middle: mean,
        upper: mean + multiplier * stdDev,
        lower: mean - multiplier * stdDev,
      });
    }
    return bands;
  }
  