# Throwaway: write a posed copy of a candidate by rotating one joint before placement.
# usage: pose.py <src.js> <out.js> <joint> <axis> <degrees>
import sys, math
src, out, joint, axis, deg = sys.argv[1:6]
s = open(src).read()
mark = '  // ---- placement'
assert mark in s, 'no placement marker'
line = f"  {joint}.rotation.{axis} = {math.radians(float(deg)):.6f};   // posed copy: {deg} degrees\n"
s = s.replace(mark, line + mark, 1)
open(out, 'w').write(s)
print(out)
