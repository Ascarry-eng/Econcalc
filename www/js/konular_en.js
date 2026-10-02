// konular_en.js — konu sayfalarının İngilizcesi. konular.js, İngilizce modda ad/ozet/md'yi buradan alır.
// DİKKAT: içerikte "$" hemen ardından "{" yazma — şablon dizgesinde yer tutucu sayılır.
(function () {
  "use strict";
  const R = String.raw;
  window.KONU_EN = {
    1: {
      ad: "Introduction to mathematics", ozet: "Functions, domain, exponent rules, slope",
      md: R`This course builds the language of economics: writing relationships between variables as functions, reading them from graphs, and measuring change.

## Functions
A function assigns exactly ONE output to each input. In $y = f(x)$, $x$ is the independent variable (input) and $y$ the dependent variable. In economics the letters carry meaning:

| letter | meaning |
|---|---|
| Q | quantity |
| P | price |
| TR, TC | total revenue, total cost |
| π | profit |
| Y, C, I | income, consumption, investment |
| K, L | capital, labour |

**Domain:** the values the function may take as input. In economics quantities and prices cannot be negative: $Q \ge 0$. Also $\sqrt{x}$ needs $x \ge 0$, $\ln x$ needs $x > 0$, and $1/x$ needs $x \ne 0$.

## Exponent and root rules
> $$a^m a^n = a^{m+n},\qquad \frac{a^m}{a^n} = a^{m-n},\qquad (a^m)^n = a^{mn}$$

> $$a^{-n} = \frac{1}{a^n},\qquad a^{1/n} = \sqrt[n]{a},\qquad a^0 = 1$$

Rewriting roots and fractions as POWERS makes derivatives and integrals much easier: $\dfrac{5}{\sqrt{x}} = 5x^{-1/2}$.

## Slope
The average rate of change between two points: $\dfrac{\Delta y}{\Delta x} = \dfrac{y_2 - y_1}{x_2 - x_1}$. This is the core of the rest of the course: the derivative is the limit of this ratio as $\Delta x \to 0$.

**Watch out:** in supply–demand diagrams price is on the VERTICAL axis and quantity on the HORIZONTAL axis (the Marshallian convention), while the function is often written $Q = f(P)$. The function that draws the graph directly is the inverse demand $P = f(Q)$.

## Worked example
**Question:** if $f(x) = 3x^2 - 2x + 1$, what are $f(2)$ and $f(a+1)$?

$f(2) = 3\cdot 4 - 4 + 1 = 9$.

$f(a+1) = 3(a+1)^2 - 2(a+1) + 1 = 3a^2 + 6a + 3 - 2a - 2 + 1 = 3a^2 + 4a + 2$.

## Common mistakes
- $(a+b)^2 \ne a^2 + b^2$; it is $a^2 + 2ab + b^2$.
- $\sqrt{a + b} \ne \sqrt a + \sqrt b$.
- $-x^2$ and $(-x)^2$ differ: for $x = 3$ they are $-9$ and $9$.`,
    },
    2: {
      ad: "Linear equations and economic applications", ozet: "Slope, supply–demand equilibrium, break-even, tax, simultaneous equations",
      md: R`A linear function $y = mx + b$: $m$ is the slope (the change in y when x rises by one), $b$ the vertical intercept. Because the slope is constant, every one-unit change has the same effect.

## Formulas
> $$m = \frac{y_2 - y_1}{x_2 - x_1},\qquad y - y_1 = m(x - x_1)$$

From the general form: $ax + by = c \;\Rightarrow\; y = -\dfrac{a}{b}x + \dfrac{c}{b}$.

## In economics
**Demand and supply:** $Q_d = a - bP$ ($b > 0$: demand falls as price rises), $Q_s = c + dP$ ($d > 0$).

> $$\text{Equilibrium: } Q_d = Q_s \;\Rightarrow\; P^* = \frac{a - c}{b + d}$$

**Cost and revenue:** $TC = FC + vQ$ (fixed + variable), $TR = pQ$.

> $$\text{Break-even: } TR = TC \;\Rightarrow\; Q_{BE} = \frac{FC}{p - v}$$

$p - v$ is the contribution margin: what each unit contributes towards fixed cost.

**Per-unit tax $t$:** a tax levied on sellers shifts the supply curve up by $t$. A gap $P_c - P_p = t$ opens between the price consumers pay, $P_c$, and the price producers receive, $P_p$. The larger share of the burden falls on the less elastic side.

**Two unknowns:** solve by substitution or elimination. If the lines are parallel (equal slopes, different intercepts) there is no solution; if they coincide there are infinitely many.

## Worked example
Demand $Q_d = 100 - 2P$, supply $Q_s = 20 + 2P$.
1. Set equal: $100 - 2P = 20 + 2P \Rightarrow 80 = 4P \Rightarrow P^* = 20$.
2. Substitute: $Q^* = 100 - 40 = 60$.

Now add a tax of $t = 4$ per unit on sellers: supply becomes $Q_s = 20 + 2(P - 4)$.
$100 - 2P = 12 + 2P \Rightarrow P_c = 22$, $P_p = 18$, $Q_t = 56$.
The slopes are equal, so the burden is split evenly: 2 for consumers, 2 for producers. Tax revenue $4 \times 56 = 224$.

## Common mistakes
- Mixing up the order of the points in the numerator and denominator of the slope.
- Taking $-b$ as the graphical slope of $Q = a - bP$: with P on the vertical axis the slope is $-1/b$.
- Adding the tax on the wrong side: levied on sellers it is $Q_s(P - t)$, on buyers $Q_d(P + t)$.`,
    },
    3: {
      ad: "Quadratic equations", ozet: "Discriminant, roots, vertex, revenue and profit parabolas",
      md: R`The graph of $f(x) = ax^2 + bx + c$ ($a \ne 0$) is a parabola. If $a > 0$ it opens upwards (∪, the vertex is the lowest point); if $a < 0$ it opens downwards (∩, the vertex is the highest point).

## Formulas
> $$\Delta = b^2 - 4ac,\qquad x_{1,2} = \frac{-b \pm \sqrt{\Delta}}{2a}$$

> $$\text{Vertex: } x_T = -\frac{b}{2a},\qquad y_T = f(x_T)$$

- $\Delta > 0$: two real roots. $\Delta = 0$: a double root (the parabola touches the axis). $\Delta < 0$: no real roots.
- If the roots are known, $ax^2 + bx + c = a(x - x_1)(x - x_2)$; also $x_1 + x_2 = -b/a$ and $x_1 x_2 = c/a$.

## In economics
**Total revenue:** with inverse demand $P = a - bQ$, $TR = PQ = aQ - bQ^2$, a downward-opening parabola. Revenue is highest at the vertex, $Q = \dfrac{a}{2b}$ — the midpoint of the demand line, where elasticity is $-1$.

**Profit:** $\pi = TR - TC$ is often quadratic. The break-even points are the roots of $\pi = 0$; maximum profit is at the vertex.

**Non-linear equilibrium:** with $P = 120 - Q^2$ and $P = 20 + 3Q$ we get $Q^2 + 3Q - 100 = 0$. Only the POSITIVE root makes economic sense.

## Worked example
$P = 100 - 2Q$, $TC = 10Q + 400$.

$TR = 100Q - 2Q^2$, so $\pi = -2Q^2 + 90Q - 400$.

**Break-even:** $2Q^2 - 90Q + 400 = 0 \Rightarrow Q^2 - 45Q + 200 = 0$, $\Delta = 2025 - 800 = 1225$, $\sqrt{\Delta} = 35$, so $Q = 5$ or $Q = 40$.

**Maximum profit:** $Q = -\dfrac{90}{2(-2)} = 22.5$, $\pi = 2025 - 1012.5 - 400 = 612.5$, price $P = 55$.

## Common mistakes
- Forgetting the $-b$ in the formula, or dividing only the square root by $2a$.
- Reporting a negative root as the economic answer (negative quantities do not exist).
- Taking $x_T$ instead of $f(x_T)$ as the height of the vertex.`,
    },
    4: {
      ad: "Exponential functions and logarithms", ozet: "The number e, rules of ln, solving exponential equations, growth",
      md: R`An exponential function $f(x) = a^x$ ($a > 0$, $a \ne 1$) has the variable IN THE EXPONENT. Anything that grows at a constant RATE is exponential: compound interest, population, prices under inflation. The logarithm is the inverse of the exponential: "to what power must I raise $b$ to get $x$?"

> $$\log_b x = y \iff b^y = x$$

$e \approx 2.71828$ is the natural base, $\ln x = \log_e x$. On a calculator **ln is natural** and **log is base 10**.

## Rules
> $$\ln(xy) = \ln x + \ln y,\qquad \ln\frac{x}{y} = \ln x - \ln y,\qquad \ln x^n = n\ln x$$

> $$\ln e = 1,\quad \ln 1 = 0,\quad e^{\ln x} = x,\quad \log_b x = \frac{\ln x}{\ln b}$$

$\ln$ is defined only for POSITIVE numbers, and $\ln(x + y) \ne \ln x + \ln y$.

## Solving exponential equations
If the unknown is in the exponent, take logarithms of both sides:

> $$a\,b^x = c \;\Rightarrow\; x = \frac{\ln(c/a)}{\ln b}$$

## In economics
- **Compound growth:** $y_t = y_0(1+g)^t$; continuous growth: $y_t = y_0 e^{kt}$.
- **Log difference ≈ percentage change:** for small changes $\ln y_2 - \ln y_1 \approx \dfrac{y_2 - y_1}{y_1}$. This is why economists like log scales.
- **Doubling time:** $t = \dfrac{\ln 2}{\ln(1+g)} \approx \dfrac{70}{\%g}$ (the rule of 70).

## Worked example
**Question:** at 8% annual compound interest, how many years until 1000 becomes 2000?

$1000(1.08)^t = 2000 \Rightarrow (1.08)^t = 2 \Rightarrow t = \dfrac{\ln 2}{\ln 1.08} = \dfrac{0.6931}{0.07696} \approx 9.01$ years. (Rule of 70: $70/8 = 8.75$.)

## Common mistakes
- Splitting $\ln(x+y)$.
- Mixing up the log and ln keys: the results differ by a factor of about 2.3.
- Writing $e^x + e^y$ for $e^{x+y}$; it is $e^x e^y$.`,
    },
    5: {
      ad: "Interest: simple, compound, continuous", ozet: "Future and present value, effective rate, real interest",
      md: R`The time value of money: 1 today is worth more than 1 in the future, because it can earn interest. If interest is paid only on the principal it is SIMPLE; if interest also earns interest it is COMPOUND.

## Formulas
> $$\text{Simple: } FV = P(1 + rt)$$

> $$\text{Compound (} m \text{ times a year): } FV = P\left(1 + \frac{r}{m}\right)^{mt}$$

> $$\text{Continuous: } FV = Pe^{rt}$$

> $$\text{Present value: } PV = \frac{FV}{(1+i)^n},\qquad PV = FV\,e^{-rt}$$

> $$\text{Effective annual rate: } r_{ef} = \left(1 + \frac{r}{m}\right)^m - 1,\qquad r_{ef} = e^r - 1$$

$r$ is the NOMINAL annual rate, $m$ the number of compounding periods per year, $t$ years, $i = r/m$ the rate per period, $n = mt$ the number of periods.

## In economics
- **Discounting:** the present value of a future payment. Bond prices and investment decisions are built on it.
- **Nominal vs real interest (Fisher):** with inflation $\pi$, $1 + r_{real} = \dfrac{1 + r_{nom}}{1 + \pi}$; for small values $r_{real} \approx r_{nom} - \pi$. Under high inflation the approximation is badly off — use the exact formula.
- **Monthly rates:** 3% a month is $(1.03)^{12} - 1 \approx 42.6\%$ a year effective, not 36%.

## Worked example
10 000 at a nominal 12% a year for 3 years:
- Simple: $10000(1 + 0.36) = 13\,600$
- Annual compounding: $10000(1.12)^3 = 14\,049.28$
- Monthly compounding: $10000(1.01)^{36} = 14\,307.69$
- Continuous: $10000\,e^{0.36} = 14\,333.29$

More frequent compounding gives more, but never more than the continuous limit.

## Common mistakes
- With monthly compounding, forgetting to divide the annual rate by 12 or to multiply the years by 12.
- Not converting the percentage to a decimal (12% → 0.12).
- Getting the sign of the exponent wrong in present value: with a positive rate, PV is always smaller than FV.`,
    },
    6: {
      ad: "Annuities and loans", ozet: "Equal payments, instalments, sinking funds, perpetuities",
      md: R`An annuity is a series of equal payments at equal intervals: rent, loan instalments, regular saving. Instead of discounting every payment separately we use closed formulas that come from the sum of a geometric series.

## Formulas (payments at the end of each period, rate $i$ per period, $n$ payments)
> $$FV = PMT\,\frac{(1+i)^n - 1}{i}$$

> $$PV = PMT\,\frac{1 - (1+i)^{-n}}{i}$$

> $$\text{Loan instalment: } PMT = PV\,\frac{i}{1 - (1+i)^{-n}}$$

> $$\text{Sinking fund: } PMT = FV\,\frac{i}{(1+i)^n - 1}$$

> $$\text{Perpetuity: } PV = \frac{PMT}{i}$$

If payments are made at the BEGINNING of each period (annuity due), multiply every formula by $(1+i)$.

**Where does it come from?** $PV = \dfrac{PMT}{1+i} + \dfrac{PMT}{(1+i)^2} + \dots + \dfrac{PMT}{(1+i)^n}$ is a geometric series; the sum formula $S = a\dfrac{1 - q^n}{1 - q}$ gives the result above.

## In economics
- **Loans:** each instalment first pays the interest on the remaining balance; the rest reduces the principal. That is why the interest share is large in early instalments.
- **Bond prices:** the annuity value of the coupons plus the present value of the principal at maturity.
- **Perpetuity:** an asset paying 1000 a year forever is worth 10 000 at 10%.

## Worked example
A loan of 100 000 at 3% a month, 12 instalments:

$$PMT = 100000\cdot\frac{0.03}{1 - 1.03^{-12}} = \frac{3000}{0.29862} \approx 10\,046.21$$

Total paid $120\,554.5$, total interest $20\,554.5$. In the first month interest is $3000$ and $7046.21$ goes to the principal.

## Common mistakes
- Taking $n$ in years and $i$ per month: both must refer to the same PERIOD.
- Forgetting the $(1+i)$ factor for payments at the beginning of the period.
- Computing total interest as "rate × principal × time": as the balance falls, so does the interest.`,
    },
    7: {
      ad: "Growth and investment appraisal", ozet: "Compound growth rate, net present value, internal rate of return",
      md: R`Two related questions: (1) How fast did something grow on average? (2) Is an investment that pays cash in the future worth making today?

## Growth rates
> $$\text{Compound average: } g = \left(\frac{y_n}{y_0}\right)^{1/n} - 1$$

> $$\text{Continuous: } k = \frac{\ln(y_n/y_0)}{n},\qquad \text{doubling: } t = \frac{\ln 2}{\ln(1+g)}$$

Dividing the total change by the number of years (an arithmetic average) overstates compound growth.

## Net present value and internal rate of return
> $$NPV = \sum_{t=0}^{n}\frac{CF_t}{(1+r)^t} = CF_0 + \frac{CF_1}{1+r} + \frac{CF_2}{(1+r)^2} + \dots$$

- $CF_0$ is usually negative (the investment). $r$ is the discount rate: what the money would earn elsewhere, i.e. its opportunity cost.
- **Decision:** invest if NPV > 0.
- **Internal rate of return:** the $r$ that makes NPV zero. Invest if IRR > r. If the cash flows change sign more than once there may be several IRRs; then rely on NPV.

## Worked example
Investment 1000; then 300, 400, 500 over three years; $r = 10\%$.

$NPV = -1000 + \dfrac{300}{1.1} + \dfrac{400}{1.21} + \dfrac{500}{1.331} = -1000 + 272.73 + 330.58 + 375.66 = -21.04$

NPV < 0, so reject. IRR ≈ 8.90% < 10%, the same decision.

**Growth:** if GDP rose from 1000 to 1500 in 5 years, $g = 1.5^{1/5} - 1 \approx 8.45\%$. The arithmetic average would say 10% — wrong.

## Common mistakes
- Discounting $CF_0$ (at $t = 0$ the factor is 1).
- Discounting monthly flows with an annual rate.
- Discounting real cash flows with a nominal rate: both must be of the same kind.`,
    },
    8: { ad: "Midterm exam" },
    9: {
      ad: "Derivatives and rules of differentiation", ozet: "Limits, tangents, power–product–quotient–chain rules",
      md: R`The derivative is the INSTANTANEOUS rate of change: how much f changes when x changes very slightly. Geometrically it is the slope of the tangent to the graph at that point.

> $$f'(x) = \lim_{h \to 0}\frac{f(x+h) - f(x)}{h}$$

Notation: $f'(x)$, $\dfrac{dy}{dx}$, $\dfrac{df}{dx}$. The second derivative $f''(x)$ is the rate of change of the slope (curvature).

## Rules
> $$(c)' = 0,\qquad (x^n)' = nx^{n-1},\qquad (cf)' = cf',\qquad (f \pm g)' = f' \pm g'$$

> $$\text{Product: } (fg)' = f'g + fg'$$

> $$\text{Quotient: } \left(\frac{f}{g}\right)' = \frac{f'g - fg'}{g^2}$$

> $$\text{Chain: } \frac{d}{dx}f(g(x)) = f'(g(x))\,g'(x)$$

> $$(e^x)' = e^x,\quad (e^u)' = e^u u',\quad (\ln x)' = \frac{1}{x},\quad (\ln u)' = \frac{u'}{u},\quad (a^x)' = a^x \ln a$$

## Tangent line
The tangent at $x_0$ is $y = f(x_0) + f'(x_0)(x - x_0)$. Near that point it is a linear approximation of the function: $f(x_0 + \Delta x) \approx f(x_0) + f'(x_0)\,\Delta x$.

## Partial derivatives (preview)
With several variables, hold the others constant and differentiate with respect to one: $Q = 10K^{0.3}L^{0.7} \Rightarrow \dfrac{\partial Q}{\partial L} = 7K^{0.3}L^{-0.3}$.

## Worked example
**Chain:** $f(x) = (3x^2 + 1)^4$; outer function $u^4$, inner $u = 3x^2 + 1$.
$f'(x) = 4(3x^2 + 1)^3 \cdot 6x = 24x(3x^2 + 1)^3$.

**Product:** $g(x) = x^2 e^{-x}$; $g'(x) = 2xe^{-x} - x^2e^{-x} = xe^{-x}(2 - x)$.

**Quotient:** $h(x) = \dfrac{\ln x}{x}$; $h'(x) = \dfrac{(1/x)\,x - \ln x}{x^2} = \dfrac{1 - \ln x}{x^2}$.

## Common mistakes
- Forgetting the inner derivative in the chain rule: $(e^{2x})' = 2e^{2x}$.
- Thinking the derivative of a product is the product of the derivatives.
- Writing $(\ln 5)' = 1/5$: $\ln 5$ is a constant, its derivative is 0.
- Reversing the order in the numerator of the quotient rule.`,
    },
    10: {
      ad: "Marginal analysis and elasticity", ozet: "MC, MR, MPC; average vs marginal; point and arc elasticity",
      md: R`In economics "marginal" means derivative: the extra effect on the total of producing, selling or consuming one more unit.

## Marginal concepts
| total | marginal | meaning |
|---|---|---|
| TC(Q) | MC = TC′(Q) | extra cost of producing one more unit |
| TR(Q) | MR = TR′(Q) | extra revenue from selling one more unit |
| Q(L) | MPL = Q′(L) | extra output from one more worker |
| C(Y) | MPC = C′(Y) | share of an extra 1 of income that is consumed |
| U(x) | MU = U′(x) | extra utility from consuming one more unit |

The derivative approximates the actual one-unit difference: $MC(Q) \approx TC(Q+1) - TC(Q)$.

**Average vs marginal:** $AC = TC/Q$. When marginal is below average it pulls the average down; when above, it pulls it up. That is why the MC curve cuts AC exactly at its lowest point: $MC = AC$.

## Elasticity
> $$\varepsilon = \frac{\%\Delta Q}{\%\Delta P} = \frac{dQ}{dP}\cdot\frac{P}{Q}$$

> $$\text{Arc (midpoint): } \varepsilon = \frac{\Delta Q / \bar Q}{\Delta P / \bar P}$$

- $|\varepsilon| > 1$ elastic, $|\varepsilon| < 1$ inelastic, $|\varepsilon| = 1$ unit elastic.
- **Link to revenue:** $MR = P\left(1 + \dfrac{1}{\varepsilon}\right)$. If demand is elastic ($\varepsilon < -1$) then $MR > 0$: cutting the price raises revenue. With linear demand, revenue is highest at the midpoint where elasticity is $-1$.
- The same formula works for income elasticity ($\frac{dQ}{dY}\frac{Y}{Q}$) and cross elasticity.
- **Log shortcut:** $\varepsilon = \dfrac{d\ln Q}{d\ln P}$. If $Q = AP^{-b}$, elasticity is $-b$ everywhere (constant-elasticity demand).

## Worked example
$Q = 120 - 3P$ at $P = 30$: $Q = 30$, $dQ/dP = -3$, $\varepsilon = -3\cdot\frac{30}{30} = -3$. Elastic: a 1% price rise cuts demand by 3% and total spending falls. Unit elasticity: $\dfrac{-3P}{120 - 3P} = -1 \Rightarrow P = 20$.

$TC = 0.1Q^3 - 2Q^2 + 15Q + 100$: $MC = 0.3Q^2 - 4Q + 15$, so $MC = 5$ at $Q = 10$. The actual difference $TC(11) - TC(10) = 156.1 - 150 = 6.1$; the derivative gives an approximation.

## Common mistakes
- Confusing elasticity with slope: on a linear demand curve the slope is constant but the elasticity differs at every point.
- Using $dP/dQ$ from inverse demand as if it were $dQ/dP$: $\dfrac{dQ}{dP} = 1 \Big/ \dfrac{dP}{dQ}$.
- Dropping the sign: price elasticity of demand is negative; "is it elastic?" is answered with the absolute value.`,
    },
    11: {
      ad: "Optimization: maxima and minima", ozet: "First- and second-order conditions, concavity, profit maximization",
      md: R`Finding the largest or smallest value of a function is the central question of economics: maximize profit, minimize cost.

## Steps
1. **First-order condition (FOC):** $f'(x) = 0$ — the critical points. Points where the derivative is undefined and the ends of the interval are also candidates.
2. **Second-order condition (SOC):** $f''(x^*) < 0$ means a local maximum, $f''(x^*) > 0$ a local minimum. If $f''(x^*) = 0$ the test is inconclusive; look at how the sign of $f'$ changes.
3. **On a closed interval $[a, b]$:** compare the values at the critical points AND at the ENDPOINTS; the largest is the absolute maximum.

**Concavity:** $f'' < 0$ concave (∩), $f'' > 0$ convex (∪). A point where $f''$ changes sign is an inflection point.

## In economics
> $$\text{Profit: } \pi'(Q) = 0 \iff MR = MC,\qquad \pi''(Q) < 0$$

> $$\text{Lowest average cost: } MC = AC$$

> $$\text{Highest revenue: } MR = 0 \;\;(|\varepsilon| = 1)$$

- Under perfect competition the price is fixed, $MR = P$: the firm produces until $P = MC$.
- For a monopoly $MR < P$: it produces less and charges a higher price.
- **Tax revenue:** set the derivative of $T(t) = t\cdot Q(t)$ to zero to find the revenue-maximizing tax.

## Worked example
$P = 100 - 2Q$, $TC = 50 + 10Q + 0.5Q^2$.

$TR = 100Q - 2Q^2 \Rightarrow MR = 100 - 4Q$; $MC = 10 + Q$.

$MR = MC$: $100 - 4Q = 10 + Q \Rightarrow Q^* = 18$, $P^* = 64$.

SOC: $\pi'' = -4 - 1 = -5 < 0$, a maximum. $\pi^* = 64\cdot 18 - (50 + 180 + 162) = 1152 - 392 = 760$.

## Common mistakes
- Writing only the FOC and not checking the SOC: the point you found may be a minimum.
- Forgetting the endpoints on a closed interval.
- Maximizing revenue instead of profit: $MR = 0$ and $MR = MC$ give different answers.`,
    },
    12: {
      ad: "Integration", ozet: "Antiderivatives, integration rules, substitution, definite integrals",
      md: R`Integration is the reverse of differentiation (the antiderivative) and also the area under a curve. It takes you from the marginal back to the total.

## Rules for indefinite integrals
> $$\int x^n\,dx = \frac{x^{n+1}}{n+1} + C \qquad (n \ne -1)$$

> $$\int \frac{1}{x}\,dx = \ln|x| + C,\qquad \int e^{kx}\,dx = \frac{e^{kx}}{k} + C,\qquad \int a^x\,dx = \frac{a^x}{\ln a} + C$$

> $$\int [f \pm g]\,dx = \int f\,dx \pm \int g\,dx,\qquad \int cf\,dx = c\int f\,dx$$

$C$ is the constant of integration: since the derivative of a constant is 0, an antiderivative is only determined up to a constant.

## Techniques
- **Substitution:** for $\int f(g(x))\,g'(x)\,dx$ set $u = g(x)$. Example: $\int 2x(x^2 + 1)^5\,dx$ with $u = x^2 + 1$ gives $\dfrac{(x^2 + 1)^6}{6} + C$.
- **Integration by parts:** $\int u\,dv = uv - \int v\,du$. Example: $\int xe^x\,dx = xe^x - e^x + C$.

## Definite integrals
> $$\int_a^b f(x)\,dx = F(b) - F(a)$$

Where the curve is below the x-axis the integral is negative; for the total AREA integrate $|f|$.

## Worked example
$\displaystyle\int_0^2 (3x^2 - 4x + 5)\,dx = \Big[x^3 - 2x^2 + 5x\Big]_0^2 = (8 - 8 + 10) - 0 = 10$

$\displaystyle\int_0^{\infty} 100e^{-0.05t}\,dt = \Big[-2000e^{-0.05t}\Big]_0^{\infty} = 0 - (-2000) = 2000$ (an improper integral).

## Common mistakes
- Forgetting $C$ in an indefinite integral.
- Applying the power rule to $\int x^{-1}dx$: $\frac{x^0}{0}$ is undefined; the answer is $\ln|x|$.
- Writing $\int e^{3x}dx = e^{3x}$; it is $\dfrac{e^{3x}}{3}$.
- Thinking the integral of a product is the product of the integrals.`,
    },
    13: {
      ad: "Area, consumer and producer surplus", ozet: "Area between curves, surpluses, Lorenz curve and Gini",
      md: R`A definite integral measures the area between two curves. In economics these areas measure welfare.

## Formulas
> $$\text{Area between curves: } \int_a^b [f(x) - g(x)]\,dx \qquad (f \ge g)$$

> $$CS = \int_0^{Q^*} D(Q)\,dQ - P^*Q^*$$

> $$PS = P^*Q^* - \int_0^{Q^*} S(Q)\,dQ$$

$D(Q)$ is inverse demand (the highest price buyers are willing to pay), $S(Q)$ inverse supply (the lowest price sellers accept).

**Intuition:** for each unit the consumer says "I would have paid up to $D(Q)$ but paid only $P^*$"; the sum of these gaps is consumer surplus. An intervention such as a tax shrinks total surplus; the part that disappears is the deadweight loss.

## Lorenz curve and Gini
The Lorenz curve $L(x)$: the share of total income received by the poorest fraction $x$ of the population; $L(0) = 0$, $L(1) = 1$, $L(x) \le x$.

> $$G = 2\int_0^1 [x - L(x)]\,dx$$

$G = 0$ is perfect equality, $G \to 1$ perfect inequality. Example: $L(x) = x^2$ gives $G = 2\left(\frac12 - \frac13\right) = \frac13$.

## Worked example
$D(Q) = 120 - Q^2$, $S(Q) = 20 + 3Q$. Equilibrium: $Q^2 + 3Q - 100 = 0 \Rightarrow Q^* \approx 8.612$, $P^* \approx 45.84$.

$CS = \displaystyle\int_0^{Q^*}(120 - Q^2)\,dQ - P^*Q^* = \frac{2}{3}Q^{*3} \approx 425.8$

$PS = P^*Q^* - \displaystyle\int_0^{Q^*}(20 + 3Q)\,dQ = 1.5\,Q^{*2} \approx 111.2$

## Common mistakes
- Not starting the surplus integral at 0.
- Forgetting to subtract the $P^*Q^*$ rectangle.
- Integrating demand written as $Q = f(P)$ with respect to $Q$ without inverting it first.`,
    },
    14: {
      ad: "Total functions and flows", ozet: "From marginal to total, stocks and flows, present value of income streams",
      md: R`If the marginal function is known, the total is recovered by integration. The accumulation and present value of flows over time (income, investment) are also integrals.

## From marginal to total
> $$TC(Q) = \int MC(Q)\,dQ + C,\qquad C = TC(0) = FC$$

> $$TC(Q_2) - TC(Q_1) = \int_{Q_1}^{Q_2} MC(Q)\,dQ$$

In the same way $TR = \int MR\,dQ$ (the constant is 0 because $TR(0) = 0$) and the consumption function $C(Y) = \int MPC\,dY + C_0$.

## Stocks and flows
The capital stock is the accumulation of the net investment flow: $K(t) = K(0) + \displaystyle\int_0^t I(s)\,ds$.

## Value of an income stream
For income $R(t)$ arriving continuously and a continuous interest rate $r$:

> $$PV = \int_0^T R(t)\,e^{-rt}\,dt,\qquad FV = e^{rT}\cdot PV$$

> $$\text{Constant stream: } PV = R\,\frac{1 - e^{-rT}}{r} \;\xrightarrow{\;T \to \infty\;}\; \frac{R}{r}$$

## Average value
The average of $f$ on $[a, b]$: $\bar f = \dfrac{1}{b - a}\displaystyle\int_a^b f(x)\,dx$.

## Worked example
$MC = 3Q^2 - 12Q + 20$, $FC = 50$: $TC(Q) = Q^3 - 6Q^2 + 20Q + 50$.

The extra cost of raising output from 2 to 5: $\displaystyle\int_2^5 MC\,dQ = TC(5) - TC(2) = 125 - 74 = 51$.

A perpetual stream of 1000 a year at 8%: $PV = 1000/0.08 = 12\,500$.

## Common mistakes
- Not using the initial condition and leaving $C$ undetermined.
- Forgetting that the fixed cost is not needed to find a change: in $\int_{Q_1}^{Q_2}$ the constant cancels.
- Writing $e^{rt}$ instead of $e^{-rt}$ when discounting a stream.`,
    },
    15: { ad: "Final exam" },
    20: {
      ad: "Matrices", ozet: "Operations, determinants, inverses, Cramer's rule, Leontief",
      md: R`A matrix is a rectangular table of numbers. It lets you write a system of many linear equations in one line ($Ax = b$). Its best-known use in economics is the Leontief input–output model.

## Operations
- **Addition:** same size, element by element.
- **Multiplication:** $(m\times n)(n\times p) = (m\times p)$, $(AB)_{ij} = \sum_k a_{ik}b_{kj}$. In general $AB \ne BA$.
- **Transpose:** $(A^T)_{ij} = a_{ji}$.

## Determinant
> $$\det\begin{bmatrix}a & b\\ c & d\end{bmatrix} = ad - bc$$

For a 3×3, expand along the first row (signs + − +):

> $$\det A = a_{11}M_{11} - a_{12}M_{12} + a_{13}M_{13}$$

$M_{ij}$: the determinant of the 2×2 left after deleting row $i$ and column $j$. If $\det A = 0$ the matrix is singular: it has no inverse and the system has no unique solution.

## Inverse and Cramer's rule
> $$A^{-1} = \frac{1}{ad - bc}\begin{bmatrix}d & -b\\ -c & a\end{bmatrix},\qquad x = A^{-1}b$$

> $$\text{Cramer: } x_i = \frac{\det A_i}{\det A}$$

$A_i$: $A$ with its $i$-th column replaced by $b$.

## The Leontief model
$a_{ij}$: the input from sector $i$ needed for one unit of output of sector $j$. Total output = intermediate use + final demand:

> $$x = Ax + d \;\Rightarrow\; x = (I - A)^{-1}d$$

## Worked example
$2x + 3y = 8$, $x - y = -1$. $\det A = 2(-1) - 3(1) = -5$.

$x = \dfrac{8(-1) - 3(-1)}{-5} = \dfrac{-5}{-5} = 1$, $\quad y = \dfrac{2(-1) - 8(1)}{-5} = \dfrac{-10}{-5} = 2$.

## Common mistakes
- Multiplying matrices whose sizes do not match.
- Forgetting the minus sign on the middle term of a 3×3 expansion.
- Thinking $(AB)^{-1} = A^{-1}B^{-1}$; it is $B^{-1}A^{-1}$.`,
    },
  };
})();
