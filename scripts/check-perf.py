#!/usr/bin/env python3
"""Fail the build if Flashlight results fall outside the limits in a thresholds file."""
import json, os, statistics as st, sys

results_path, limits_path = sys.argv[1], sys.argv[2]
d = json.load(open(results_path))
lim = json.load(open(limits_path))

iters = d["iterations"]
if lim.get("skip_first_iteration", True) and len(iters) > 1:
    iters = iters[1:]  # first run is a cold start
ms = [m for i in iters for m in i["measures"]]
if not ms:
    sys.exit("No measurements found in results file")

fps = [m["fps"] for m in ms]
js = [m["cpu"]["perName"].get("mqt_js", 0) for m in ms]
ram = [m["ram"] for m in ms]
low = sum(1 for f in fps if f < 45) / len(fps) * 100

checks = [
    ("Average FPS",            st.mean(fps), ">=", lim["min_avg_fps"]),
    ("Samples below 45 FPS %", low,          "<=", lim["max_pct_samples_below_45fps"]),
    ("JS thread CPU avg %",    st.mean(js),  "<=", lim["max_avg_js_cpu"]),
    ("Peak RAM MB",            max(ram),     "<=", lim["max_peak_ram_mb"]),
]

lines = [f"### Perf check: {d.get('name', '')}",
         f"Using {len(iters)} iteration(s), {len(ms)} samples. Limits from `{os.path.basename(limits_path)}`.", "",
         "| Metric | Result | Limit | |", "|---|---|---|---|"]
failed = False
for name, val, op, limit in checks:
    ok = val >= limit if op == ">=" else val <= limit
    failed |= not ok
    lines.append(f"| {name} | {val:.1f} | {op} {limit} | {'✅' if ok else '❌'} |")

out = "\n".join(lines)
print(out)
if os.environ.get("GITHUB_STEP_SUMMARY"):
    open(os.environ["GITHUB_STEP_SUMMARY"], "a").write(out + "\n")
sys.exit(1 if failed else 0)
